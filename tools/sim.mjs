// Balance simulation: plays the campaign with auto-battling bots and the real battle code.
//  1. every hero's solo prologue dungeon (encounters + boss)
//  2. a full run: a party of five clears every dungeon in level order, resting at inns, grinding a little when a
//     boss wins; reports the battle rank at each boss, growth, glimmers, and whether the evil god falls
import { DB } from '../js/data/index.js';
import { newGame, rng, makeChar, rest, derived } from '../js/engine/state.js';
import { startBattle, resolveTurn, autoCommand, finishBattle, encounter } from '../js/engine/battle.js';

const quiet = process.argv.includes('-q');
function fight(S, spec, r) {
  const B = startBattle(S, spec.enemies || [], { boss: spec.boss });
  for (let t = 0; t < 60 && !B.over; t++) { const cmds = {}; for (const u of B.party) cmds[u.i] = autoCommand(B, u, r, S); resolveTurn(B, S, cmds, r); }
  if (!B.over) B.over = 'lose';
  const out = finishBattle(B, S, r);
  for (const id of out.left) { const i = S.party.findIndex((c) => c.id === id); S.away[id] = S.party.splice(i, 1)[0]; }
  return { res: B.over, turns: B.turn, out };
}
let fail = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fail++; };

// ---- 1. prologues
const PRO = { jeff: 'd_mine', erin: 'd_mistwood', josh: 'd_wolfcave', jasper: 'd_wolfcave', gareth: 'd_sewer', morrow: 'd_sewer', lyra: 'd_bandit', chizuru: 'd_bandit' };
const HIRE = { jeff: 'bram', erin: 'tova', gareth: 'kaz', morrow: 'lin', lyra: 'elio', chizuru: 'kage' };
for (const [hero, dun] of Object.entries(PRO)) {
  let wins = 0, bossWins = 0; const N = 30;
  for (let k = 0; k < N; k++) {
    const r = rng(1000 + k), S = newGame(hero, k);
    if (hero === 'josh') S.party.push(makeChar('jasper')); if (hero === 'jasper') S.party.push(makeChar('josh'));
    if (HIRE[hero]) S.party.push(makeChar(HIRE[hero]));     // one companion hired with the starting gold
    const d = DB.dungeons[dun]; let lost = false;
    for (let i = 0; i < d.floors * 4 && !lost; i++) { const f = fight(S, { enemies: encounter(S, d, r) }, r); if (f.res === 'lose') lost = true; else wins++; if (i % 6 === 5) rest(S); }
    rest(S);
    if (!lost && fight(S, { boss: d.boss }, r).res === 'win') bossWins++;
  }
  check(bossWins >= N * 0.5, `${hero.padEnd(8)} prologue ${dun.padEnd(12)} boss beaten in ${bossWins}/${N} runs (with one hired companion)`);
}

// ---- 2. a whole campaign
const order = Object.values(DB.dungeons).sort((a, b) => a.lv - b.lv || a.floors - b.floors);
const r = rng(42), S = newGame('josh', 42);
for (const id of ['jasper', 'kaz', 'agnes', 'quill']) S.party.push(makeChar(id));
let battles = 0, retries = 0, lost = 0;
const rows = [];
// members who ran out of LP went home; the player fetches them again when resting
const regroup = () => { for (const [id, c] of Object.entries(S.away)) { if (S.party.length >= 5) break; c.lp = c.mlp; S.party.push(c); delete S.away[id]; } };
const shop = () => { regroup(); const n = Math.min(8, Math.floor(S.gold / 400)); if (n > 0) { S.inv.hipotion = (S.inv.hipotion || 0) + n; S.gold -= n * 140; } if (S.gold > 1200 && (S.inv.feather || 0) < 3) { S.inv.feather = (S.inv.feather || 0) + 1; S.gold -= 600; } };
// gear: like a player buying from shops and opening chests, the party wears gear of about the dungeon's level
const gearUp = (lv) => { const t = Math.min(8, lv + 1); for (const c of S.party) {
  const w = DB.weapons[c.equip.wpn1]; if (w && w.tier < t) c.equip.wpn1 = `${w.type}${t}`;
  const caster = (c.int || 0) > (c.str || 0); c.equip.body = caster ? `robe${Math.min(5, Math.ceil(t / 2))}` : `body${Math.min(9, t)}`; c.equip.head = `head${Math.min(6, Math.ceil(t * 0.75))}`;
  if (!caster && !['greatsword', 'bow', 'staff'].includes(w && w.type)) c.equip.shield = `shield${Math.min(6, Math.ceil(t * 0.75))}`; } };
for (const d of order) {
  gearUp(d.lv); rest(S); shop();
  const enc = d.floors * 5;
  for (let i = 0; i < enc; i++) { const f = fight(S, { enemies: encounter(S, d, r) }, r); battles++; if (f.res === 'lose') { lost++; rest(S); } if (i % 7 === 6) rest(S); }
  rest(S);
  let tries = 0, res;
  do { res = fight(S, { boss: d.boss }, r).res; battles++; tries++; if (res !== 'win') { for (let g = 0; g < 12; g++) { fight(S, { enemies: encounter(S, d, r) }, r); battles++; } rest(S); } } while (res !== 'win' && tries < 6);
  retries += tries - 1;
  if (d.stone) S.stones.push(d.stone);
  if (DB.bosses[d.boss].apostle) S.flags['ap_' + d.boss.slice(2)] = 1;
  const c = S.party[0];
  rows.push(`${d.id.padEnd(14)} lv${d.lv} br ${String(S.br).padStart(4)} party ${S.party.length} lp ${S.party.map((x) => x.lp).join('/')}  ${res === 'win' ? 'won' : 'LOST'} after ${tries} tr${tries > 1 ? 'ies' : 'y '}  ${c.id} hp ${derived(c, S).mhp} sword ${c.wl.sword || 0} techs ${c.techs.length}`);
  if (res !== 'win' && d.id !== 'd_startower') check(false, `${d.id}: boss ${d.boss} still not beaten after 6 tries`);
  if (d.id === 'd_voidtemple') S.flags.ended = res === 'win' ? 'normal' : undefined;
  if (d.id === 'd_startower') console.log(`optional superboss Astra: ${res === 'win' ? 'beaten' : 'not beaten'} (${tries} tries)`);
}
if (!quiet) console.log(rows.join('\n'));
const known = S.party.map((c) => `${c.id}: ${c.techs.length} techs, ${c.spells.length} spells, hp ${c.mhp}`).join(' | ');
console.log(`campaign: ${battles} battles (battle rank ${S.br}), ${retries} boss retries, ${lost} lost fights, ${S.glimmers} glimmers\n  ${known}`);
check(S.flags.ended === 'normal', 'the evil god falls: the campaign can be finished');
check(battles > 450, `enough battles for a long game (${battles}); at ~2.5 min per battle with walking, towns and story ≈ ${Math.round(battles * 2.5 / 60)} hours`);
console.log(fail ? `${fail} FAILED` : 'sim: all passed');
process.exit(fail ? 1 : 0);
