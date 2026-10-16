// Game state: the party, inventory, flags, known places, battle rank — and everything derived from them
// (a hero's stats with gear and Fate Stones, conditions used by events). Pure: no DOM, so tools/ can test it.
import { DB } from '../data/index.js';

export const PARTY_MAX = 5, STAT_CAP = 60, LEVEL_CAP = 50, HP_CAP = 999, WP_CAP = 99;
export const SLOTS = ['wpn1', 'wpn2', 'body', 'head', 'shield', 'acc'];
export const STATS = ['str', 'dex', 'agi', 'int', 'wil', 'con'];

// a small seeded random generator (mulberry32) so battles and dungeons can be replayed in tests
export function rng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const pick = (r, a) => a[Math.floor(r() * a.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------- characters
export function makeChar(id) {
  const d = DB.chars[id], s = d.stats;
  return { id, hp: s.hp, mhp: s.hp, lp: s.lp, mlp: s.lp, wp: s.wp, mwp: s.wp, jp: s.jp, mjp: s.jp,
    str: s.str, dex: s.dex, agi: s.agi, int: s.int, wil: s.wil, con: s.con,
    wl: { ...d.wl }, ml: { ...d.ml }, techs: [], spells: [...d.spells], equip: { wpn1: null, wpn2: null, body: null, head: null, shield: null, acc: null, ...d.equip } };
}
export const itemDef = (id) => DB.weapons[id] || DB.armor[id] || DB.items[id];
export const nameOf = (c) => DB.chars[c.id];

// stats with equipment and Fate Stones
export function derived(c, S) {
  const o = { def: 0, mdef: 0, ev: 0, res: {}, immune: new Set(), glim: 1, glimMag: 1, regen: 0, bonusHp: 0 };
  for (const k of STATS) o[k] = c[k];
  for (const slot of SLOTS) {
    const it = c.equip[slot] && itemDef(c.equip[slot]); if (!it) continue;
    o.def += it.def || 0; o.mdef += it.mdef || 0; o.ev += it.ev || 0;
    for (const [k, v] of Object.entries(it.bonus || {})) o[k] += v;
    for (const [k, v] of Object.entries(it.res || {})) o.res[k] = Math.min(o.res[k] ?? 1, v);
    for (const s of it.immune || []) o.immune.add(s);
    if (it.glim) o.glim *= it.glim;
    const sp = it.special || {}; if (sp.glim) o.glim *= sp.glim; if (sp.glimMag) o.glimMag *= sp.glimMag; if (sp.regen) o.regen += sp.regen; if (sp.hp) o.bonusHp += sp.hp;
  }
  if (S) for (const st of S.stones || []) for (const [k, v] of Object.entries(DB.stones[st].bonus)) o[k] += v;
  o.def += Math.floor(o.con / 2); o.mdef += Math.floor(o.wil / 2);
  o.mhp = Math.min(HP_CAP, c.mhp + o.bonusHp);
  return o;
}
// the weapons a hero can fight with: equipped weapons, or bare hands
export function weaponsOf(c) {
  const out = [];
  for (const slot of ['wpn1', 'wpn2']) { const w = c.equip[slot] && DB.weapons[c.equip[slot]]; if (w) out.push({ slot, w, type: w.type }); }
  if (!out.length || !out.some((x) => x.type === 'fist')) out.push({ slot: 'fist', w: { id: 'bare', type: 'fist', atk: 4, zh: '徒手', en: 'Bare hands' }, type: 'fist' });
  return out;
}
export const techsFor = (c, type) => c.techs.filter((t) => DB.techs[t].type === type).sort((a, b) => DB.techs[a].order - DB.techs[b].order);
export const canLearnSchool = (c, school) => !Object.keys(c.ml).includes(DB.schools[school].opp) || (c.ml[DB.schools[school].opp] ?? -1) < 0;
// magic schools are opposed: having any level in one school locks out its opposite
export function schoolLocked(c, school) { const opp = DB.schools[school].opp; return c.ml[opp] != null; }

// ---------------------------------------------------------------- a new game
export function newGame(heroId, seed = Date.now()) {
  const S = { v: 1, seed, hero: heroId, party: [makeChar(heroId)], away: {}, inv: {}, gold: 400, flags: {}, known: {}, br: 0, battles: 0, playTime: 0,
    loc: DB.chars[heroId].home, dungeon: null, stones: [], rumor: {}, kills: 0, glimmers: 0, done: {}, cleared: {} };
  S.known[S.loc] = 1;
  give(S, 'potion', 4); give(S, 'antidote', 2);
  return S;
}
// ---------------------------------------------------------------- inventory
export const count = (S, id) => S.inv[id] || 0;
export function give(S, id, n = 1) { S.inv[id] = (S.inv[id] || 0) + n; }
export function take(S, id, n = 1) { if ((S.inv[id] || 0) < n) return false; S.inv[id] -= n; if (!S.inv[id]) delete S.inv[id]; return true; }
export function equip(S, c, slot, id) {
  const it = id && itemDef(id);
  if (id) {
    if (!count(S, id)) return 'none';
    if (slot === 'wpn1' || slot === 'wpn2') { if (!DB.weapons[id]) return 'slot'; }
    else if (!DB.armor[id] || DB.armor[id].slot !== slot) return 'slot';
  }
  const old = c.equip[slot];
  if (id) take(S, id);
  if (old) give(S, old);
  c.equip[slot] = id || null;
  if (it || old) c.hp = Math.min(c.hp, derived(c, S).mhp);
  return null;
}
// ---------------------------------------------------------------- party
export function inParty(S, id) { return S.party.some((c) => c.id === id); }
export function join(S, id) {
  if (inParty(S, id) || S.party.length >= PARTY_MAX) return false;
  // someone who left keeps their gear, techniques and growth, and comes back as they were
  const c = S.away[id] || makeChar(id); delete S.away[id];
  S.party.push(c); return true;
}
export function dismiss(S, id) {
  if (id === S.hero) return false;
  const i = S.party.findIndex((c) => c.id === id); if (i < 0) return false;
  const [c] = S.party.splice(i, 1);
  S.away[id] = c; return true;
}
// ---------------------------------------------------------------- flags and conditions
export const apostles = (S) => ['ap_morvane', 'ap_ishtra', 'ap_gorrak', 'ap_nyx'].filter((f) => S.flags[f]).length;
export function flag(S, name) {
  // counted flags used by rumours: stonesN, apostlesN
  let m = /^stones(\d+)$/.exec(name); if (m) return S.stones.length >= +m[1];
  m = /^apostles(\d+)$/.exec(name); if (m) return apostles(S) >= +m[1];
  return !!S.flags[name];
}
export function cond(S, c) {
  if (!c) return true;
  if (c.flag && !flag(S, c.flag)) return false;
  if (c.noflag && flag(S, c.noflag)) return false;
  if (c.item && !count(S, c.item)) return false;
  if (c.noitem && count(S, c.noitem)) return false;
  if (c.hero && S.hero !== c.hero) return false;
  if (c.nohero && S.hero === c.nohero) return false;
  if (c.party && !inParty(S, c.party)) return false;
  if (c.noparty && inParty(S, c.noparty)) return false;
  if (c.stones != null && S.stones.length < c.stones) return false;
  if (c.apostles != null && apostles(S) < c.apostles) return false;
  if (c.gold != null && S.gold < c.gold) return false;
  if (c.clear && !S.cleared[c.clear]) return false;
  if (c.br != null && S.br < c.br) return false;
  return true;
}
export function reveal(S, id) { if (!DB.locations[id]) return false; const was = !!S.known[id]; S.known[id] = 1; return !was; }
// can the party travel there right now?
export function canTravel(S, id) { const l = DB.locations[id]; if (!S.known[id]) return 'unknown'; if (l.sea && !count(S, 'k_ticket')) return 'ship'; if (l.dungeon && DB.dungeons[l.dungeon].need && !count(S, DB.dungeons[l.dungeon].need)) return 'key'; return null; }

// ---------------------------------------------------------------- resting at an inn: HP, LP, WP, JP back
export function rest(S) { for (const c of S.party) { const d = derived(c, S); c.hp = d.mhp; c.lp = c.mlp; c.wp = c.mwp; c.jp = c.mjp; } }
export function healHp(S) { for (const c of S.party) if (c.lp > 0) c.hp = derived(c, S).mhp; }

// ---------------------------------------------------------------- saving
export function toSave(S) { return JSON.parse(JSON.stringify(S)); }
export function fromSave(d) {
  const S = { ...newGame(d.hero, d.seed), ...JSON.parse(JSON.stringify(d)) };
  for (const c of S.party) { for (const slot of SLOTS) if (!(slot in c.equip)) c.equip[slot] = null; c.techs ||= []; c.spells ||= []; }
  return S;
}
