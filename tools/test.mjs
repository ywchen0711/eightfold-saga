// Logic tests with the real engine: stories run end to end with a bot, dungeons are walkable, battles behave.
import { DB } from '../js/data/index.js';
import { newGame, rng, makeChar, derived, join, cond, canTravel, toSave, fromSave, schoolLocked, equip, give, rest } from '../js/engine/state.js';
import { runEvent, arrivalEvents, heroesHere } from '../js/engine/events.js';
import { startBattle, resolveTurn, autoCommand, finishBattle, techChance } from '../js/engine/battle.js';
import { makeFloor, bfs, open } from '../js/engine/dungeon.js';

let fail = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
// a bot that clicks the first choice and wins every fight (the story is under test here, not the battles)
const bot = (log = []) => ({ say: async () => {}, choice: async () => 0, note: (n) => log.push(n), battle: async () => 'win', ending: async () => {} });
async function arriveAt(S, loc, ui) { S.loc = loc; S.known[loc] = 1; for (const ev of arrivalEvents(S, loc)) await runEvent(S, ev, ui); }

// ---- 1. every prologue, then the capital starts the main story
for (const h of Object.values(DB.chars).filter((c) => c.hero)) {
  const S = newGame(h.id, 1), ui = bot();
  await runEvent(S, h.prologue, ui);
  if (!['gareth'].includes(h.id)) { await arriveAt(S, 'aldoria', ui); }
  else { S.flags.prologue_done = 1; await arriveAt(S, 'aldoria', ui); }
  ok(S.flags.prologue && S.flags.act2 && S.known.d_crypt && S.gold >= 1400, `${h.id}: prologue, then the king's audience starts the quest (gold ${S.gold})`);
  if (h.id === 'josh') ok(S.party.some((c) => c.id === 'jasper'), 'josh: Jasper joins in the prologue');
  if (h.id !== 'gareth') ok(S.party.some((c) => c.id === 'gareth'), `${h.id}: Gareth offers to join at the audience`);
}
// ---- 2. meeting the other heroes in their home towns
{
  const S = newGame('erin', 2), ui = bot(); S.flags.prologue_done = 1; S.flags.act2 = 1;
  ok(heroesHere(S, 'ironhaven').includes('jeff') && !heroesHere(S, 'greenleaf').includes('erin'), 'other heroes wait in their home towns (not the protagonist)');
  await runEvent(S, 'meet_jeff', ui); await runEvent(S, 'meet_morrow', ui);
  ok(S.party.length === 3 && !heroesHere(S, 'ironhaven').includes('jeff'), 'meeting heroes lets them join');
  for (const id of ['lyra', 'chizuru']) await runEvent(S, 'meet_' + id, ui);
  await runEvent(S, 'meet_josh', ui);
  ok(S.party.length === 5 && S.flags.met_josh && heroesHere(S, 'sagehollow').includes('josh'), 'with a full party a hero waits to be fetched later');
}
// ---- 3. the main story to the end
{
  const S = newGame('morrow', 3), ui = bot(); S.flags.prologue_done = 1; await arriveAt(S, 'aldoria', ui);
  for (const d of ['d_crypt', 'd_warcamp']) { S.cleared[d] = 1; await runEvent(S, d + '_win', ui); }
  ok(S.flags.act3 && S.known.sanctum && S.known.d_skyruins, 'two apostles down: the Star Sanctum appears (act 3)');
  for (const d of ['d_mirrorlake', 'd_eclipse']) { S.cleared[d] = 1; await runEvent(S, d + '_win', ui); }
  ok(canTravel(S, 'd_voidtemple') !== null, 'the Temple of the Void stays shut without the key');
  await runEvent(S, 'oracle', ui);
  ok(S.inv.k_key && S.known.d_voidtemple && canTravel(S, 'd_voidtemple') === null, 'the oracle gives the Key of the Void after the four apostles');
  await runEvent(S, 'd_voidtemple_win', ui);
  ok(S.flags.ended === 'normal', 'beating the evil god plays the ending');
}
// ---- 4. side quests pay once
{
  const S = newGame('jeff', 4), ui = bot(); S.flags.act2 = 1;
  await runEvent(S, 'q_bandits', ui); ok(S.known.d_bandit, 'a quest giver reveals the dungeon');
  S.cleared.d_bandit = 1; const g0 = S.gold; await runEvent(S, 'q_bandits', ui); await runEvent(S, 'q_bandits', ui);
  ok(S.gold === g0 + 500 && S.inv.shield2 === 1, 'and pays only once after it is cleared');
  give(S, 'k_crown'); S.party.push(makeChar('lyra')); await runEvent(S, 'q_pyramid', ui);
  ok(S.flags.lyra_queen && !S.inv.k_crown, 'Lyra\'s quest: the crown returns and she becomes queen');
}
// ---- 5. every dungeon floor: the way in reaches the stairs/altar and every chest; floors never change
let floors = 0, badFloors = [];
for (const d of Object.values(DB.dungeons)) for (let f = 1; f <= d.floors; f++) {
  const fl = makeFloor(d.id, f), dist = bfs(fl.tiles, fl.w, fl.h, fl.start.x, fl.start.y); floors++;
  const reach = (p) => dist[p.y * fl.w + p.x] >= 0;
  if (!reach(fl.end) || !fl.chests.every(reach) || !open(fl, fl.start.x, fl.start.y)) badFloors.push(`${d.id}:${f}`);
  const fixed = (d.treasure || []).filter(([tf]) => tf === f).map(([, it]) => it);
  if (!fixed.every((it) => fl.chests.some((c) => c.item === it))) badFloors.push(`${d.id}:${f} treasure`);
  if (JSON.stringify(makeFloor(d.id, f).chests) !== JSON.stringify(fl.chests)) badFloors.push(`${d.id}:${f} not stable`);
}
ok(!badFloors.length, `all ${floors} dungeon floors are walkable with their stairs, altar, chests and treasure ${badFloors.join(' ')}`);

// ---- 6. battles
{
  ok(techChance(3, 7, 7) > 0.05 && techChance(40, 7, 7) === 0 && techChance(40, 60, 40) > 0.08, 'glimmer odds: easy techniques early, hard ones only against strong enemies');
  const S = newGame('josh', 5), r = rng(9); S.party.push(makeChar('jasper'));
  let glims = 0; for (let i = 0; i < 40; i++) { const B = startBattle(S, ['beast2', 'ooze2']); while (!B.over) { const c = {}; for (const u of B.party) c[u.i] = { kind: 'atk', slot: 'wpn1', target: 0 }; resolveTurn(B, S, c, r); } finishBattle(B, S, r); rest(S); }
  glims = S.party[0].techs.length + S.party[1].techs.length;
  ok(glims >= 2, `fighting glimmers techniques (${S.party.map((c) => c.id + ': ' + c.techs.join(',')).join(' | ')})`);
  ok(S.party[0].wl.sword > 7 && S.party[0].mhp > 125, `growth after battles: sword ${S.party[0].wl.sword}, max HP ${S.party[0].mhp}, battle rank ${S.br}`);
  const c = makeChar('erin'); ok(schoolLocked(c, 'fire') && !schoolLocked(c, 'light'), 'opposed magic: Erin knows water, so fire is locked');
  // knock-outs cost LP; a boss changes at half life
  const S2 = newGame('jeff', 6), B = startBattle(S2, [], { boss: 'b_pharaoh' }), u = B.party[0], lp0 = u.c.lp;
  B.enemies[0].hp = Math.floor(B.enemies[0].mhp * 0.51); u.hp = 1;
  for (let i = 0; i < 6 && !B.over; i++) resolveTurn(B, S2, { 0: { kind: 'atk', slot: 'wpn1', target: 0 } }, rng(i));
  ok(u.c.lp < lp0, `being knocked out costs LP (${lp0} -> ${u.c.lp})`);
  ok(B.enemies[0].phases[0].done || B.enemies[0].hp / B.enemies[0].mhp > 0.5, 'boss phases trigger below their HP line');
  // statuses: an immune accessory blocks poison
  const S3 = newGame('erin', 7), B3 = startBattle(S3, ['insect2']), e = B3.enemies[0];
  ok(derived(S3.party[0], S3).immune.has('poison'), 'the antivenom charm makes Erin immune to poison');
  // the evil god is weaker for every Fate Stone
  const S4 = newGame('josh', 8), hp0 = startBattle(S4, [], { boss: 'b_sorrax' }).enemies[0].mhp; S4.stones = Object.keys(DB.stones);
  const hp10 = startBattle(S4, [], { boss: 'b_sorrax' }).enemies[0].mhp;
  ok(hp10 < hp0 * 0.4, `each Fate Stone weakens Sorrax (HP ${hp0} -> ${hp10} with all ten)`);
  // equipment changes stats
  const S5 = newGame('josh', 9); give(S5, 'sword5'); const d0 = derived(S5.party[0], S5).def; give(S5, 'body5'); equip(S5, S5.party[0], 'body', 'body5');
  ok(derived(S5.party[0], S5).def > d0 && S5.inv.body2 === 1, 'equipping armour raises defence and returns the old piece');
}
// ---- 7. saving and loading
{
  const S = newGame('lyra', 10), ui = bot(); await runEvent(S, 'pro_lyra', ui); S.party[0].techs.push('wp_lash'); S.stones.push('st_fire');
  const S2 = fromSave(JSON.parse(JSON.stringify(toSave(S))));
  ok(S2.hero === 'lyra' && S2.flags.prologue && S2.party[0].techs.includes('wp_lash') && S2.stones[0] === 'st_fire' && S2.known.aldoria, 'a save keeps the hero, flags, techniques, stones and map');
}
console.log(fail ? `${fail} FAILED` : 'test: all passed');
process.exit(fail ? 1 : 0);
