// Towns (inn, shops, magic shop, pub, guild, people to talk to) and the world map.
import { DB } from '../data/index.js';
import { give, take, count, rest, derived, cond, flag, reveal, join, dismiss, inParty, schoolLocked, canTravel, PARTY_MAX, itemDef } from '../engine/state.js';
import { heroesHere } from '../engine/events.js';
import { App, $, el, btn, esc, toast, itemName, event, arrive, choice } from './app.js';
import { L, t } from './i18n.js';
import { worldMap } from './art.js';
import { townScene, particles, themeParticles } from './hd.js';
import { portraitChibi as portrait } from './chibi.js';

const town = () => DB.locations[App.S.loc];
function frame(title, body, onBack) {
  const p = $('#panel'); p.innerHTML = '';
  const box = el('div', 'win'); const head = el('div', 'whead', `<h2>${title}</h2>`); if (onBack) head.appendChild(btn('✕', onBack, 'x')); box.appendChild(head);
  const b = el('div', 'wbody'); box.appendChild(b); p.appendChild(box); if (body) body(b); return b;
}
const gold = () => `<span class="goldtag">💰 ${App.S.gold} G</span>`;

// ---------------------------------------------------------------- the town square
function square() {
  const S = App.S, l = town(), p = $('#panel'); p.innerHTML = '';
  const box = el('div', 'town');
  box.appendChild(el('div', 'tname', `<h1>${esc(L(l))}</h1>${gold()}`));
  const grid = el('div', 'tgrid');
  const add = (label, fn, cls) => grid.appendChild(btn(label, fn, cls));
  add(`🛏 ${t('inn')}<small>${l.inn} G</small>`, innScreen);
  add(`⚔ ${t('shop')}`, () => shopScreen('buy'));
  if (l.magic.length) add(`✧ ${t('magicShop')}`, magicScreen);
  add(`🍺 ${t('pub')}`, pubScreen);
  if (l.guild.length || S.party.length > 1) add(`🛡 ${t('guild')}`, guildScreen);
  for (const [name, ev] of l.npcs) add(`💬 ${esc(L({ zh: name.split('|')[0], en: name.split('|')[1] }))}`, async () => { await event(ev); square(); });
  for (const h of heroesHere(S, l.id)) add(`⭐ ${esc(L(DB.chars[h]))}`, async () => { await event('meet_' + h); square(); }, 'hero');
  add(`🗺 ${t('depart')}`, () => App.go('world'), 'go');
  add(`☰ ${t('menu')}`, () => App.go('menu', { from: 'town' }));
  box.appendChild(grid);
  p.appendChild(box);
}
// ---------------------------------------------------------------- inn
function innScreen() {
  const S = App.S, l = town();
  frame(`🛏 ${t('inn')}`, (b) => {
    b.appendChild(el('p', '', L({ zh: `住一晚 ${l.inn} G。HP、LP、WP、JP 全部恢復，並且存檔。`, en: `A night costs ${l.inn} G. Restores HP, LP, WP and JP, and saves the game.` }) + ' ' + gold()));
    b.appendChild(el('p', 'sm', t('lpWarn')));
    b.appendChild(btn(t('rest'), () => { if (S.gold < l.inn) { toast(t('noGold')); return; } S.gold -= l.inn; rest(S); App.save(); toast(t('restDone'), 'big'); square(); }, 'go'));
  }, square);
}
// ---------------------------------------------------------------- shop
function shopScreen(mode) {
  const S = App.S, l = town();
  frame(`⚔ ${t('shop')} ${gold()}`, (b) => {
    const tabs = el('div', 'tabs'); tabs.appendChild(btn(t('buy'), () => shopScreen('buy'), mode === 'buy' ? 'on' : '')); tabs.appendChild(btn(t('sell'), () => shopScreen('sell'), mode === 'sell' ? 'on' : '')); b.appendChild(tabs);
    const list = el('div', 'list');
    const row = (id, price, fn, extra = '') => { const it = itemDef(id), r = el('div', 'row');
      r.appendChild(el('div', 'nm', `${esc(L(it))}<small>${desc(id)}${extra}</small>`)); r.appendChild(el('div', 'pr', price + ' G'));
      const bb = btn(mode === 'buy' ? t('buy') : t('sell'), fn); bb.disabled = mode === 'buy' && S.gold < price; r.appendChild(bb); list.appendChild(r); };
    if (mode === 'buy') {
      const [a, z] = l.shop.tiers;
      for (const type of l.shop.types) for (let ti = a; ti <= Math.min(z, 7); ti++) { const id = `${type}${ti}`, w = DB.weapons[id]; if (w && w.price) row(id, w.price, () => buy(id, w.price), ` · ${t('have')} ${count(S, id)}`); }
      const [aa, az] = l.shop.armor;
      for (const a2 of Object.values(DB.armor)) if (a2.price && a2.slot !== 'acc' && a2.tier >= aa && a2.tier <= az) row(a2.id, a2.price, () => buy(a2.id, a2.price), ` · ${t('have')} ${count(S, a2.id)}`);
      for (const a2 of Object.values(DB.armor)) if (a2.slot === 'acc' && a2.price && a2.price <= 600 * (az + 1)) row(a2.id, a2.price, () => buy(a2.id, a2.price), ` · ${t('have')} ${count(S, a2.id)}`);
      for (const id of l.shop.items) row(id, DB.items[id].price, () => buy(id, DB.items[id].price), ` · ${t('have')} ${count(S, id)}`);
    } else {
      for (const [id, n] of Object.entries(S.inv)) { const it = itemDef(id); if (!it || it.kind === 'key' || !it.price) continue; const pr = Math.floor(it.price / 2); row(id, pr, () => { take(S, id); S.gold += pr; shopScreen('sell'); }, ` · ×${n}`); }
    }
    b.appendChild(list);
  }, square);
  function buy(id, price) { if (S.gold < price) { toast(t('noGold')); return; } S.gold -= price; give(S, id); toast(`${t('got')} ${esc(itemName(id))}`); shopScreen('buy'); }
}
// what an item does, in one line
export function desc(id) {
  const w = DB.weapons[id], a = DB.armor[id], it = DB.items[id];
  if (w) return `${DB.weaponTypes[w.type].icon} ${L(DB.weaponTypes[w.type])} · ATK ${w.atk}${w.elem ? ' · ' + L(DB.schools[w.elem]) : ''}${w.bonus ? ' · ' + bon(w.bonus) : ''}`;
  if (a) return `${t('slot_' + (a.slot === 'acc' ? 'acc' : a.slot))} · ${t('def')} ${a.def} · ${t('mdef')} ${a.mdef}${a.ev ? ' · EV ' + a.ev + '%' : ''}${a.bonus ? ' · ' + bon(a.bonus) : ''}${a.immune ? ' · ' + a.immune.map((s) => L(DB.statuses[s])).join('/') + '×' : ''}${a.res ? ' · ' + Object.keys(a.res).map((k) => L(DB.schools[k] || { zh: k, en: k })).join('/') + '½' : ''}`;
  if (it) return [it.heal && `HP +${it.heal > 5000 ? 'MAX' : it.heal}`, it.wp && `WP +${it.wp}`, it.jp && `JP +${it.jp}`, it.lp && `LP +${it.lp}`, it.revive && L({ zh: '復活', en: 'Revive' }), it.cure && L({ zh: '治療異常', en: 'Cure' }), it.dmg && `${L({ zh: '傷害', en: 'Damage' })} ${it.dmg}`, it.flee && t('flee'), it.camp && 'WP/JP'].filter(Boolean).join(' · ');
  return '';
}
const bon = (b) => Object.entries(b).map(([k, v]) => `${t(k)}${v > 0 ? '+' : ''}${v}`).join(' ');
// ---------------------------------------------------------------- magic shop
function magicScreen() {
  const S = App.S, l = town();
  frame(`✧ ${t('magicShop')} ${gold()}`, (b) => {
    b.appendChild(el('p', 'sm', t('oppNote')));
    const list = el('div', 'list');
    for (const school of l.magic) {
      const sc = DB.schools[school]; list.appendChild(el('div', 'sect', `${sc.icon} ${esc(L(sc))}`));
      for (const sp of Object.values(DB.spells).filter((s) => s.school === school && s.tier <= 2)) {
        const r = el('div', 'row'); r.appendChild(el('div', 'nm', `${esc(L(sp))}<small>JP ${sp.jp} · ${kindName(sp)}</small>`)); r.appendChild(el('div', 'pr', sp.price + ' G'));
        r.appendChild(btn(t('learn'), () => learn(sp))); list.appendChild(r);
      }
    }
    b.appendChild(list);
  }, square);
  async function learn(sp) {
    const opts = S.party.map((c) => { const locked = schoolLocked(c, sp.school), has = c.spells.includes(sp.id); return { c, locked, has, label: `${L(DB.chars[c.id])}${has ? ' ✓' : locked ? ' ✕' : ''}` }; });
    const i = await choice(t('whoLearns'), [...opts.map((o) => o.label), t('cancel')]);
    const o = opts[i]; if (!o) return;
    if (o.has) { toast(t('learned')); return; } if (o.locked) { toast(t('locked')); return; } if (S.gold < sp.price) { toast(t('noGold')); return; }
    S.gold -= sp.price; o.c.spells.push(sp.id); o.c.ml[sp.school] = Math.max(o.c.ml[sp.school] || 0, 1);
    toast(`${esc(L(DB.chars[o.c.id]))} ${t('learnedSpell')} <b>${esc(L(sp))}</b>`); magicScreen();
  }
}
export const kindName = (sp) => L({ dmg: { zh: '攻擊', en: 'Attack' }, heal: { zh: '回復', en: 'Heal' }, revive: { zh: '復活', en: 'Revive' }, cure: { zh: '淨化', en: 'Cure' }, buff: { zh: '強化', en: 'Buff' },
  debuff: { zh: '弱化', en: 'Weaken' }, status: { zh: '異常', en: 'Status' }, drain: { zh: '吸收', en: 'Drain' }, special: { zh: '特殊', en: 'Special' } }[sp.kind]) + (sp.target === 'all' || sp.target === 'allies' ? L({ zh: '・全體', en: ' · all' }) : '');
// ---------------------------------------------------------------- pub: rumours and the heroes in town
function pubScreen() {
  const S = App.S, l = town();
  frame(`🍺 ${t('pub')}`, (b) => {
    const heard = S.rumor[l.id] || {};
    const next = l.rumors.find((r) => !heard[r] && (!DB.rumors[r].need || flag(S, DB.rumors[r].need)));
    b.appendChild(btn(L({ zh: '向酒保打聽消息', en: 'Ask the barkeep for news' }), () => {
      const out = el('div', 'rumor');
      if (!next) { const old = l.rumors.filter((r) => heard[r]); out.textContent = old.length ? L(DB.rumors[old[Math.floor(Math.random() * old.length)]]) : t('rumorNone'); }
      else { const r = DB.rumors[next]; heard[next] = 1; S.rumor[l.id] = heard; out.textContent = L(r); for (const p of r.reveal) if (reveal(S, p)) toast(`🗺 ${t('reveal')}：<b>${esc(L(DB.locations[p]))}</b>`); }
      b.querySelector('.rumor')?.remove(); b.appendChild(out);
    }, 'go'));
    for (const h of heroesHere(S, l.id)) b.appendChild(btn(`⭐ ${t('talkHero')}：${esc(L(DB.chars[h]))}`, async () => { await event('meet_' + h); pubScreen(); }, 'hero'));
  }, square);
}
// ---------------------------------------------------------------- guild: hire and dismiss companions
function guildScreen() {
  const S = App.S, l = town();
  frame(`🛡 ${t('guild')} ${gold()}`, (b) => {
    const list = el('div', 'list');
    for (const id of l.guild) {
      const c = DB.chars[id]; if (inParty(S, id)) continue;
      const r = el('div', 'row'); const cv = el('canvas', 'mini'); cv.width = cv.height = 64; portrait(cv.getContext('2d'), id, 0, 0, 1); r.appendChild(cv);
      r.appendChild(el('div', 'nm', `${esc(L(c))} <small>${esc(L(c.title))} · ${Object.keys(c.wl).map((w) => DB.weaponTypes[w].icon).join('')} ${Object.keys(c.ml).map((s) => DB.schools[s].icon).join('')}</small>`));
      r.appendChild(el('div', 'pr', c.cost + ' G'));
      const bb = btn(t('hire'), () => { if (S.party.length >= PARTY_MAX) { toast(t('partyFull')); return; } if (S.gold < c.cost) { toast(t('noGold')); return; } S.gold -= c.cost; join(S, id); toast(`<b>${esc(L(c))}</b> ${t('joined')}`, 'big'); guildScreen(); });
      bb.disabled = S.gold < c.cost; r.appendChild(bb); list.appendChild(r);
    }
    if (S.party.length > 1) { list.appendChild(el('div', 'sect', t('dismiss')));
      for (const c of S.party.slice(1)) { const r = el('div', 'row'); r.appendChild(el('div', 'nm', esc(L(DB.chars[c.id])))); r.appendChild(btn(t('dismiss'), async () => { if ((await choice(`${L(DB.chars[c.id])} ── ${t('dismiss')}？`, [t('ok'), t('cancel')])) === 0) { dismiss(S, c.id); guildScreen(); } })); list.appendChild(r); } }
    b.appendChild(list);
  }, square);
}
App.screens.town = {
  enter() { if (App.screen !== 'town') return; square(); },
  draw() { const st = town().style; App.cx.drawImage(townScene(st, Math.round(App.w), Math.round(App.h)), 0, 0); particles(App.cx, themeParticles(st), App.w, App.h * 0.8, App.time, 36); },
};

// ---------------------------------------------------------------- the world map
let hover = null, sel = null;
// the map fits beside the place list (desktop) or above it (phones)
function mapRect() {
  const wide = App.w > 640, aw = wide ? App.w - Math.min(300, App.w * 0.44) - 24 : App.w, ah = wide ? App.h : App.h * 0.56 - 8;
  const s = Math.min(aw / 960, ah / 540); return { s, x: (aw - 960 * s) / 2, y: (ah - 540 * s) / 2 };
}
function worldPanel() {
  const S = App.S, p = $('#panel'); p.innerHTML = '';
  const box = el('div', 'wmap');
  box.appendChild(el('div', 'whead2', `<b>🗺 ${t('worldMap')}</b> ${gold()} <span class="sm">${t('br')} ${S.br} · 💎 ${S.stones.length}/10</span>`));
  const list = el('div', 'places');
  const known = Object.values(DB.locations).filter((l) => S.known[l.id]).sort((a, b) => (a.kind === b.kind ? a.x - b.x : a.kind === 'town' ? -1 : 1));
  for (const l of known) {
    const why = canTravel(S, l.id), here = S.loc === l.id;
    const b = btn(`${l.kind === 'town' ? '🏠' : S.cleared[l.id] ? '★' : '⚔'} ${esc(L(l))}${l.sea ? ' ⛵' : ''}${l.dungeon ? `<small>Lv${DB.dungeons[l.dungeon].lv}</small>` : ''}`, () => go(l.id), (here ? 'here ' : '') + (sel === l.id ? 'sel' : ''));
    if (why) { b.disabled = true; b.title = t(why === 'ship' ? 'needShip' : 'needKey'); }
    b.onmouseenter = () => { hover = l.id; }; list.appendChild(b);
  }
  box.appendChild(list);
  box.appendChild(btn(`☰ ${t('menu')}`, () => App.go('menu', { from: 'world' }), 'mbtn'));
  p.appendChild(box);
}
async function go(id) {
  const why = canTravel(App.S, id); if (why) { toast(t(why === 'ship' ? 'needShip' : 'needKey')); return; }
  await arrive(id);
}
App.screens.world = {
  enter() { sel = null; worldPanel(); },
  draw() { const c = App.cx, m = mapRect(); c.fillStyle = '#0c1e34'; c.fillRect(0, 0, App.w, App.h); c.save(); c.translate(m.x, m.y); worldMap(c, 960 * m.s, 540 * m.s, App.S, App.time, hover); c.restore();
    // names of the hovered place
    const l = hover && DB.locations[hover]; if (l) { c.font = 'bold 15px sans-serif'; c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 4; const x = m.x + l.x * m.s, y = m.y + l.y * m.s - 18; c.textAlign = 'center'; c.strokeText(L(l), x, y); c.fillText(L(l), x, y); c.textAlign = 'left'; } },
  click(x, y) {
    const m = mapRect(); let best = null, bd = 22;
    for (const l of Object.values(DB.locations)) { if (!App.S.known[l.id]) continue; const d = Math.hypot(m.x + l.x * m.s - x, m.y + l.y * m.s - y); if (d < bd) { bd = d; best = l.id; } }
    if (!best) return;
    if (sel === best) go(best); else { sel = hover = best; worldPanel(); toast(`${esc(L(DB.locations[best]))} ── ${L({ zh: '再點一次前往', en: 'tap again to travel' })}`); }
  },
  move(x, y) { const m = mapRect(); hover = null; for (const l of Object.values(DB.locations)) if (App.S.known[l.id] && Math.hypot(m.x + l.x * m.s - x, m.y + l.y * m.s - y) < 16) hover = l.id; },
};
export { derived, cond };
