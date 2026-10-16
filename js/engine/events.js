// Runs event scripts (js/data/events.js). Each step type is a function in OPS, so adding a new kind of step is adding
// one entry here. The runner talks to the player through `ui` — the game passes the real screens, tests pass a bot:
//   ui.say(who, text) · ui.choice(prompt, options) -> index · ui.battle(spec) -> 'win' | 'lose' | 'flee'
//   ui.note(text) (a short notice) · ui.ending(kind)
import { DB, N, MEET } from '../data/index.js';
import { cond, give, take, join, inParty, reveal, rest, PARTY_MAX, count } from './state.js';

const T = (s) => (typeof s === 'string' && s.includes('|') ? N(s) : s);
const itemName = (id) => DB.weapons[id] || DB.armor[id] || DB.items[id];

export const OPS = {
  async say(S, [who, text], ui) { await ui.say(who, T(text)); },
  async choice(S, [prompt, options], ui, ctx) { const i = await ui.choice(T(prompt), options.map((o) => T(o[0]))); await runSteps(S, options[i].slice(1), ui, ctx); },
  async if(S, [c, then, els], ui, ctx) { await runSteps(S, cond(S, c) ? then : els || [], ui, ctx); },
  async flag(S, [name, v = 1]) { S.flags[name] = v; },
  async give(S, [id, n = 1], ui) { give(S, id, n); ui.note({ k: 'got', item: id, n }); },
  async giveonce(S, [id], ui) { const key = 'give:' + id; if (S.done[key]) return; S.done[key] = 1; give(S, id); ui.note({ k: 'got', item: id, n: 1 }); },
  async take(S, [id]) { take(S, id); },
  async gold(S, [n], ui) { S.gold += n; ui.note({ k: 'gold', n }); },
  async join(S, [id], ui) { if (join(S, id)) ui.note({ k: 'join', id }); else if (!inParty(S, id)) { S.flags['met_' + id] = 1; ui.note({ k: 'full', id }); } },
  async recruit(S, [id], ui) { // ask first; with a full party, they wait at their home town
    if (inParty(S, id)) return;
    const yes = (await ui.choice({ zh: `讓${DB.chars[id].zh}加入隊伍嗎？`, en: `Let ${DB.chars[id].en} join the party?` }, [{ zh: '好', en: 'Yes' }, { zh: '之後再說', en: 'Not now' }])) === 0;
    S.flags['met_' + id] = 1;
    if (!yes) return;
    if (S.party.length >= PARTY_MAX) { ui.note({ k: 'full', id }); return; }
    join(S, id); ui.note({ k: 'join', id });
  },
  async meet(S, [id], ui) { // a hero who is not the protagonist, met in their home town
    const m = MEET[id];
    if (m.need && !cond(S, m.need)) { await ui.say(id, { zh: '……現在還不是時候。', en: 'Not yet...' }); return; }
    if (!S.flags['met_' + id]) await ui.say(id, T(m.line));
    await OPS.recruit(S, [id], ui);
  },
  async reveal(S, ids, ui) { for (const id of ids) if (reveal(S, id)) ui.note({ k: 'reveal', id }); },
  async battle(S, [boss], ui, ctx) { const res = await ui.battle({ boss }); ctx.result = res; if (res === 'lose') ctx.stop = true; },
  async fight(S, [enemies], ui, ctx) { const res = await ui.battle({ enemies }); ctx.result = res; if (res === 'lose') ctx.stop = true; },
  async heal(S) { rest(S); },
  async goto(S, [id]) { S.loc = id; reveal(S, id); },
  async learn(S, [who, spell], ui) { const c = who === 'hero' ? S.party[0] : S.party.find((x) => x.id === who); if (c && !c.spells.includes(spell)) { c.spells.push(spell); ui.note({ k: 'learn', id: c.id, spell }); } },
  async run(S, [id], ui, ctx) { await runSteps(S, DB.events[id].steps, ui, ctx); },
  async ending(S, [kind], ui) { S.flags.ended = kind; await ui.ending(kind); },
};
export async function runSteps(S, steps, ui, ctx) {
  for (const st of steps) { if (ctx.stop) return; await OPS[st[0]](S, st.slice(1), ui, ctx); }
}
export async function runEvent(S, id, ui) {
  const e = DB.events[id]; if (!e) return null;
  const ctx = {};
  if (e.once) S.done['ev:' + id] = 1;
  await runSteps(S, e.steps, ui, ctx);
  if (e.then && !ctx.stop) await runEvent(S, e.then, ui);
  return ctx;
}
// the events that start when you arrive somewhere
export function arrivalEvents(S, loc) {
  return Object.values(DB.events).filter((e) => e.at === loc && !(e.once && S.done['ev:' + e.id]) && cond(S, e.cond)).map((e) => e.id);
}
// heroes you can talk to in a town (the other heroes, at home, not in the party)
export function heroesHere(S, loc) {
  return Object.values(DB.chars).filter((c) => c.hero && c.home === loc && c.id !== S.hero && !inParty(S, c.id) && S.flags.prologue_done).map((c) => c.id);
}
export const _itemName = itemName, _count = count;
