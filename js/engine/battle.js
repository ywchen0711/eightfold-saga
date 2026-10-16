// Battles, the SaGa way. Pure logic: resolveTurn() takes everyone's commands and returns a log of what happened, which
// the UI plays back. Techniques and spells are glimmered (閃現) mid-battle. HP comes back after every battle; LP
// (lost when knocked out), WP (techniques) and JP (spells) only come back at an inn. Growth happens after each win.
import { DB, BOSS_TIER } from '../data/index.js';
import { derived, weaponsOf, pick, clamp, HP_CAP, WP_CAP, STAT_CAP, LEVEL_CAP, give } from './state.js';

const stage = (n) => (n >= 0 ? 1 + 0.25 * n : 1 / (1 - 0.25 * n));
const alive = (u) => u && !u.ko && u.hp > 0;
const STATUS_TURNS = () => Object.fromEntries(Object.values(DB.statuses).map((s) => [s.id, s.turns]));

// ---------------------------------------------------------------- building a fight
export function enemyRank(S, d) { return clamp(1 + Math.floor(S.br / 55), d.lv, Math.min(8, d.lv + 3)); }
// a random group of monsters for a dungeon
export function encounter(S, d, r) {
  const rank = enemyRank(S, d);
  let n = 1 + Math.floor(r() * 2) + (S.br > 15 ? 1 : 0) + (S.br > 70 && r() < 0.5 ? 1 : 0);
  n = clamp(n, 1, Math.min(5, 1 + S.party.length));
  const out = [];
  for (let i = 0; i < n; i++) { const fam = pick(r, d.fams), rk = clamp(rank - (r() < 0.35 ? 1 : 0), 1, 8); out.push(`${fam}${rk}`); }
  return out;
}
function enemyUnit(id, S, i) {
  // battle rank mostly brings stronger ranks of monsters; their own stats only creep up a little
  const e = DB.enemies[id], f = DB.families[e.family], k = Math.min(1.5, 1 + S.br / 900), ka = Math.min(1.35, 1 + S.br / 1400);
  return { side: 'e', i, id, zh: e.zh, en: e.en, art: f.art, hue: e.hue, size: e.size, rank: e.rank, hp: Math.round(e.hp * k), mhp: Math.round(e.hp * k),
    atk: Math.round(e.atk * ka), def: e.def, agi: e.agi, int: Math.round(e.int * ka), skills: [...e.skills], res: e.res, immune: e.immune, undead: e.undead, fly: e.fly,
    gold: e.gold, st: {}, buff: { atk: 0, def: 0, mag: 0, agi: 0 } };
}
function bossUnit(id, S, i) {
  const b = DB.bosses[id], T = b.tier - 1, k = b.k || {}, sc = Math.min(1.5, 1 + S.br / 800), weak = b.final ? 1 - 0.07 * S.stones.length : 1;
  const hp = Math.round(BOSS_TIER.hp[T] * (k.hp || 1) * sc * weak);
  return { side: 'e', i, id, boss: 1, zh: b.zh, en: b.en, art: b.art, hue: b.hue, size: b.size || 1.7, rank: b.tier, tier: b.tier, hp, mhp: hp,
    atk: Math.round(BOSS_TIER.atk[T] * (k.atk || 1) * Math.min(1.4, 1 + S.br / 1100) * (b.final ? 1 - 0.04 * S.stones.length : 1)), def: Math.round(BOSS_TIER.def[T] * (k.def || 1)),
    agi: Math.round(BOSS_TIER.agi[T] * (k.agi || 1)), int: Math.round(BOSS_TIER.atk[T] * (k.int || k.atk || 1) * Math.min(1.4, 1 + S.br / 1100)), skills: [...b.skills], res: b.res || {},
    immune: b.immune || [], undead: !!b.undead, gold: BOSS_TIER.gold[T], drop: b.drop || [], phases: (b.phases || []).map((p) => ({ ...p })), final: b.final, st: {}, buff: { atk: 0, def: 0, mag: 0, agi: 0 } };
}
export function startBattle(S, enemies, opts = {}) {
  const B = { turn: 0, log: [], over: null, boss: opts.boss || null, noFlee: !!opts.boss || opts.noFlee, party: [], enemies: [], drops: [], gold: 0, stolen: 0 };
  S.party.forEach((c, i) => { if (c.lp > 0) B.party.push({ side: 'p', i, c, hp: c.hp, ko: c.hp <= 0, st: {}, buff: { atk: 0, def: 0, mag: 0, agi: 0 }, d: derived(c, S), used: { w: {}, s: {}, tech: 0, spell: 0, hit: 0, acts: 0 } }); });
  if (opts.boss) B.enemies.push(bossUnit(opts.boss, S, 0));
  for (const id of [...(opts.boss ? DB.bosses[opts.boss].minions || [] : []), ...enemies]) B.enemies.push(enemyUnit(id, S, B.enemies.length));
  // the battle's level: how much there is to learn from these enemies (glimmer odds and growth)
  B.L = Math.max(...B.enemies.map((e) => (e.boss ? e.tier * 9 : e.rank * 7))) + Math.min(10, Math.floor(S.br / 25));
  return B;
}

// ---------------------------------------------------------------- glimmering
export function techChance(diff, L, lv) { if (L + 6 < diff) return 0; let p = clamp(0.06 + (L - diff) * 0.004, 0.025, 0.16); if (lv < diff * 0.5) p *= 0.5; return p; }
function tryGlimmer(B, S, u, base, type, r, weapon) {
  const c = u.c, lv = c.wl[type] || 0, g = u.d.glim * (weapon && weapon.glim ? weapon.glim : 1);
  const cand = Object.values(DB.techs).filter((t) => t.type === type && !c.techs.includes(t.id) && t.from.includes(base));
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
  for (const t of cand) if (r() < techChance(t.diff, B.L, lv) * g) { c.techs.push(t.id); S.glimmers = (S.glimmers || 0) + 1; return t; }
  return null;
}
function tryGlimmerSpell(B, S, u, base, r) {
  const c = u.c, sp = DB.spells[base], lv = c.ml[sp.school] || 0, g = u.d.glimMag;
  const cand = Object.values(DB.spells).filter((s) => s.school === sp.school && !c.spells.includes(s.id) && s.from.includes(base));
  for (const s of cand) if (r() < techChance(s.diff, B.L, lv) * 0.9 * g) { c.spells.push(s.id); S.glimmers = (S.glimmers || 0) + 1; return s; }
  return null;
}

// ---------------------------------------------------------------- damage
const res = (t, el) => (t.side === 'p' ? t.d.res[el] ?? 1 : t.res[el] ?? 1);
function hitChance(u, t, acc) {
  const dex = u.side === 'p' ? u.d.dex : u.agi + u.rank * 2, ev = t.side === 'p' ? t.d.ev + Math.max(0, t.d.agi - (u.agi || 10)) * 0.3 : Math.max(0, t.agi - dex) * 0.6;
  return clamp(92 + acc - ev - (u.st.blind ? 40 : 0) - (t.evadeBuff || 0), 20, 99) / 100;
}
function weaponDamage(u, w, type, pow, t, tech, r) {
  const T = DB.weaponTypes[type], d = u.d;
  const a = tech && tech.useInt ? d.int : d[T.a], b = tech && (tech.useInt || tech.useWil) ? d.wil : d[T.b];
  const raw = (w.atk + a * 0.9 + b * 0.45) * (1 + (u.c.wl[type] || 0) / 30) * pow * stage(u.buff.atk);
  const def = tech && tech.ign ? 0 : t.def * stage(t.buff.def);
  const el = (tech && tech.elem) || w.elem || T.dmg;
  let dmg = Math.max(1, raw - def * 0.9) * (0.9 + r() * 0.2) * res(t, el);
  if (el === 'light' && t.undead) dmg *= 1.5;
  return { dmg, el };
}
function spellPower(u, sp) { const d = u.d; return (d.int * 1.6 + d.wil * 0.5 + (u.c.ml[sp.school] || 0) * 2.4 + 10) * stage(u.buff.mag); }
function healPower(u, sp) { const d = u.d; return (d.wil * 1.4 + d.int * 0.6 + (u.c.ml[sp.school] || 0) * 2.5 + 15) * sp.pow; }

// apply damage to anyone; handles knock-outs, LP, sleep waking, boss phases
function damage(B, t, n, log, o = {}) {
  n = Math.max(o.min0 ? 0 : 1, Math.round(n * (t.defending ? 0.5 : 1)));
  t.hp = Math.max(0, t.hp - n); if (t.st.sleep) delete t.st.sleep;
  log.push({ t: 'dmg', tg: ref(t), n, el: o.el, crit: o.crit });
  if (t.side === 'p') t.used.hit++;
  if (t.hp <= 0 && !t.ko) {
    t.ko = true; t.st = {};
    if (t.side === 'p') { t.c.lp = Math.max(0, t.c.lp - 1); log.push({ t: 'ko', tg: ref(t), lp: t.c.lp }); }
    else log.push({ t: 'ko', tg: ref(t) });
  } else if (t.side === 'p' && t.ko && n > 0) { t.c.lp = Math.max(0, t.c.lp - 1); log.push({ t: 'lp', tg: ref(t), lp: t.c.lp }); }
  if (t.boss && t.phases) for (const ph of t.phases) if (!ph.done && t.hp > 0 && t.hp / t.mhp <= ph.at) {
    ph.done = 1; t.skills.push(...(ph.add || [])); if (ph.hue != null) t.hue = ph.hue; if (ph.buff) for (const [k, v] of Object.entries(ph.buff)) t.buff[k] = clamp(t.buff[k] + v, -3, 3);
    log.push({ t: 'phase', tg: ref(t), say: ph.say });
  }
}
const ref = (u) => ({ s: u.side, i: u.i });
export const unitOf = (B, rf) => (rf.s === 'p' ? B.party[rf.i] : B.enemies[rf.i]);
function inflict(B, t, st, p, r, log) {
  if (!st || !alive(t)) return;
  const immune = t.side === 'p' ? t.d.immune.has(st) : t.immune.includes(st);
  if (immune || r() > p * (t.boss ? 0.5 : 1)) return;
  t.st[st] = STATUS_TURNS()[st]; log.push({ t: 'status', tg: ref(t), st });
}
function heal(t, n, log) { if (!t || t.ko) return; const m = t.side === 'p' ? t.d.mhp : t.mhp; const h = Math.min(m - t.hp, Math.round(n)); t.hp += h; log.push({ t: 'heal', tg: ref(t), n: h }); }
const living = (list) => list.filter(alive);
function retarget(list, i, r) { const t = list[i]; if (alive(t)) return t; const l = living(list); return l.length ? pick(r, l) : null; }

// ---------------------------------------------------------------- a party member acts
function useWeapon(B, S, u, slot, tech, target, r, log, free) {
  const ws = weaponsOf(u.c), W = ws.find((x) => x.slot === slot) || ws.find((x) => tech && x.type === tech.type) || ws[0], type = tech ? tech.type : W.type;
  u.used.w[type] = (u.used.w[type] || 0) + 1;
  const hits = tech ? tech.hits : 1, pow = (tech ? tech.pow : 1) / hits;
  let targets = tech && tech.target === 'all' ? living(B.enemies) : [retarget(B.enemies, target, r)];
  if (tech && tech.counter) { u.counter = tech; log.push({ t: 'stance', tg: ref(u) }); return; }
  for (let h = 0; h < hits; h++) {
    if (tech && tech.target === 'rand') { const l = living(B.enemies); if (!l.length) break; targets = [pick(r, l)]; }
    for (const t of targets) {
      if (!alive(t)) continue;
      if (r() > hitChance(u, t, tech && tech.acc ? tech.acc : 0)) { log.push({ t: 'miss', tg: ref(t) }); continue; }
      const crit = r() < 0.04 + u.d.dex / 400;
      const { dmg, el } = weaponDamage(u, W.w, type, pow, t, tech, r);
      damage(B, t, dmg * (crit ? 1.5 : 1), log, { el, crit });
      if (tech) {
        if (tech.drain) heal(u, dmg * tech.drain, log);
        if (tech.defDown && alive(t)) { t.buff.def = clamp(t.buff.def - 1, -3, 3); log.push({ t: 'buff', tg: ref(t), k: 'def', d: -1 }); }
        if (tech.atkDown && alive(t)) { t.buff.atk = clamp(t.buff.atk - 1, -3, 3); log.push({ t: 'buff', tg: ref(t), k: 'atk', d: -1 }); }
        if (tech.st && h === hits - 1) inflict(B, t, tech.st, tech.p, r, log);
        if (tech.steal && h === 0 && r() < 0.5) { const g = 10 * (t.rank || 1) + Math.floor(r() * 20); B.gold += g; log.push({ t: 'steal', tg: ref(t), n: g }); }
        if (tech.jpDrain) { u.c.jp = Math.min(u.c.mjp, u.c.jp + tech.jpDrain); }
      }
    }
  }
  if (tech && tech.selfDmg) damage(B, u, u.d.mhp * tech.selfDmg, log);
}
function castSpell(B, S, u, sp, target, r, log) {
  u.used.s[sp.school] = (u.used.s[sp.school] || 0) + 1; u.used.spell++;
  const allies = sp.target === 'allies' ? B.party.filter((x) => !x.ko || sp.kind === 'revive') : [B.party[target] || u];
  const foes = sp.target === 'all' ? living(B.enemies) : [retarget(B.enemies, target, r)].filter(Boolean);
  const harm = (t, pow) => {
    let n;
    if (sp.pct) n = t.hp * sp.pow * (t.boss ? 0.3 : 1);
    else { const mdef = sp.ign ? 0 : t.def * 0.5 + t.int * 0.15; n = Math.max(1, spellPower(u, sp) * pow - mdef) * (0.9 + r() * 0.2) * res(t, sp.school); if (sp.undead && t.undead) n *= sp.undead; }
    damage(B, t, n, log, { el: sp.school });
    return n;
  };
  switch (sp.kind) {
    case 'dmg': for (const t of foes) { const n = harm(t, sp.pow); if (sp.drain) heal(u, n * sp.drain, log); if (sp.st) inflict(B, t, sp.st, sp.p, r, log); } break;
    case 'drain': for (const t of foes) heal(u, harm(t, sp.pow) * 0.5, log); break;
    case 'heal': for (const t of allies) { if (t.ko) continue; heal(t, healPower(u, sp), log); if (sp.cure) { t.st = {}; } if (sp.regen) t.regen = { n: Math.round(healPower(u, sp) * 0.15), turns: sp.regen }; } break;
    case 'cure': for (const t of allies) if (!t.ko && Object.keys(t.st).length) { t.st = {}; log.push({ t: 'cure', tg: ref(t) }); } break;
    case 'revive': for (const t of allies) if (t.ko && t.c.lp > 0) { t.ko = false; t.hp = 0; heal(t, t.d.mhp * sp.pow, log); log.push({ t: 'revive', tg: ref(t) }); if (sp.lp) t.c.lp = Math.min(t.c.mlp, t.c.lp + sp.lp); }
      else if (!t.ko && sp.lp && sp.target === 'ally') { t.c.lp = Math.min(t.c.mlp, t.c.lp + sp.lp); log.push({ t: 'lpup', tg: ref(t) }); } break;
    case 'buff': case 'special':
      for (const t of allies) { if (t.ko) continue;
        for (const [k, v] of Object.entries(sp.buff || {})) { t.buff[k] = clamp(t.buff[k] + v, -3, 3); log.push({ t: 'buff', tg: ref(t), k, d: v }); }
        if (sp.evade) t.evadeBuff = 20; if (sp.counterFire) t.fireWall = 1;
        if (sp.wp) { t.c.wp = Math.min(t.c.mwp, t.c.wp + sp.wp); log.push({ t: 'wp', tg: ref(t), n: sp.wp }); } if (sp.jp && t !== u) t.c.jp = Math.min(t.c.mjp, t.c.jp + sp.jp); } break;
    case 'debuff': for (const t of foes) for (const [k, v] of Object.entries(sp.debuff)) { t.buff[k] = clamp(t.buff[k] - v, -3, 3); log.push({ t: 'buff', tg: ref(t), k, d: -v }); } break;
    case 'status': for (const t of foes) { if (sp.dmg) harm(t, sp.dmg); inflict(B, t, sp.st, sp.p, r, log); } break;
  }
}
function useItem(B, S, u, id, target, r, log) {
  const it = DB.items[id]; if (!it || !S.inv[id]) { log.push({ t: 'fail', tg: ref(u) }); return; }
  S.inv[id]--; if (!S.inv[id]) delete S.inv[id];
  const tgs = it.target === 'allies' ? B.party : it.target === 'all' ? living(B.enemies) : it.target === 'one' ? [retarget(B.enemies, target, r)] : [B.party[target] || u];
  for (const t of tgs) {
    if (!t) continue;
    if (it.revive && t.side === 'p' && t.ko && t.c.lp > 0) { t.ko = false; t.hp = 0; heal(t, t.d.mhp * it.revive, log); log.push({ t: 'revive', tg: ref(t) }); continue; }
    if (it.heal && !t.ko) heal(t, it.heal, log);
    if (it.wp && t.side === 'p') { t.c.wp = Math.min(t.c.mwp, t.c.wp + it.wp); log.push({ t: 'wp', tg: ref(t), n: it.wp }); }
    if (it.jp && t.side === 'p') t.c.jp = Math.min(t.c.mjp, t.c.jp + it.jp);
    if (it.lp && t.side === 'p') t.c.lp = Math.min(t.c.mlp, t.c.lp + it.lp);
    if (it.cure) { for (const s of it.cure) delete t.st[s]; log.push({ t: 'cure', tg: ref(t) }); }
    if (it.dmg) damage(B, t, it.dmg * (1 + S.br / 300) * res(t, it.elem) * (it.undead && t.undead ? it.undead : 1), log, { el: it.elem });
  }
  if (it.flee) { if (B.noFlee) log.push({ t: 'noflee' }); else { B.over = 'flee'; log.push({ t: 'flee', ok: true }); } }
}
// what a status does at the start of a turn: returns true if the unit loses its turn
function statusTurn(u, log) {
  if (u.st.sleep) { log.push({ t: 'asleep', tg: ref(u) }); if (--u.st.sleep <= 0) delete u.st.sleep; return true; }
  if (u.st.stun) { delete u.st.stun; log.push({ t: 'stunned', tg: ref(u) }); return true; }
  if (u.st.paralyze) { log.push({ t: 'paralyzed', tg: ref(u) }); if (--u.st.paralyze <= 0) delete u.st.paralyze; return true; }
  return false;
}
function partyAct(B, S, u, cmd, r, log) {
  if (statusTurn(u, log)) return;
  u.used.acts++;
  if (u.st.confuse) { if (--u.st.confuse <= 0) delete u.st.confuse; const all = [...living(B.enemies), ...living(B.party)]; const t = pick(r, all); log.push({ t: 'act', tg: ref(u), confused: 1 });
    if (t.side === 'e') useWeapon(B, S, u, 'wpn1', null, t.i, r, log); else { const { dmg } = weaponDamage(u, weaponsOf(u.c)[0].w, weaponsOf(u.c)[0].type, 0.6, t, null, r); damage(B, t, dmg, log); } return; }
  if (u.st.blind && --u.st.blind <= 0) delete u.st.blind;
  switch (cmd.kind) {
    case 'atk': case 'tech': {
      let tech = cmd.kind === 'tech' ? DB.techs[cmd.id] : null;
      const ws = weaponsOf(u.c), W = ws.find((x) => x.slot === cmd.slot) || ws[0];
      if (tech && u.c.wp < tech.wp) { log.push({ t: 'nowp', tg: ref(u) }); tech = null; }
      const type = tech ? tech.type : W.type;
      // glimmer: a new technique may flash into mind, used at once for free
      const g = tryGlimmer(B, S, u, tech ? tech.id : 'atk', type, r, W.w);
      if (g) { log.push({ t: 'glimmer', tg: ref(u), id: g.id, kind: 'tech' }); log.push({ t: 'act', tg: ref(u), tech: g.id }); useWeapon(B, S, u, W.slot, g, cmd.target, r, log, true); u.used.tech++; return; }
      if (tech) { u.c.wp -= tech.wp; u.used.tech++; }
      log.push({ t: 'act', tg: ref(u), tech: tech ? tech.id : null, w: W.w.id });
      useWeapon(B, S, u, W.slot, tech, cmd.target, r, log);
      return;
    }
    case 'spell': {
      const sp = DB.spells[cmd.id]; if (!sp || u.c.jp < sp.jp) { log.push({ t: 'nojp', tg: ref(u) }); return; }
      u.c.jp -= sp.jp;
      const g = tryGlimmerSpell(B, S, u, sp.id, r);
      const cast = g || sp;
      if (g) log.push({ t: 'glimmer', tg: ref(u), id: g.id, kind: 'spell' });
      log.push({ t: 'act', tg: ref(u), spell: cast.id });
      castSpell(B, S, u, cast, cmd.target, r, log); return;
    }
    case 'item': log.push({ t: 'act', tg: ref(u), item: cmd.id }); useItem(B, S, u, cmd.id, cmd.target, r, log); return;
    case 'def': u.defending = true; log.push({ t: 'defend', tg: ref(u) }); return;
    case 'flee': {
      if (B.noFlee) { log.push({ t: 'noflee' }); return; }
      const pa = living(B.party).reduce((a, x) => a + x.d.agi, 0) / Math.max(1, living(B.party).length), ea = living(B.enemies).reduce((a, x) => a + x.agi, 0) / Math.max(1, living(B.enemies).length);
      const ok = r() < clamp(0.5 + (pa - ea) * 0.02, 0.2, 0.9); log.push({ t: 'flee', ok }); if (ok) B.over = 'flee'; return;
    }
  }
}
// ---------------------------------------------------------------- an enemy acts
function enemyAct(B, S, e, r, log) {
  if (statusTurn(e, log)) return;
  const party = living(B.party); if (!party.length) return;
  if (e.st.confuse) { if (--e.st.confuse <= 0) delete e.st.confuse; const all = [...living(B.enemies)]; const t = pick(r, all); log.push({ t: 'act', tg: ref(e), confused: 1 }); damage(B, t, e.atk * 0.8, log); return; }
  if (e.st.blind && --e.st.blind <= 0) delete e.st.blind;
  // choose: a normal attack or one of its skills (healing only when someone is hurt, buffs only once)
  const opts = [{ id: null, w: 2 }];
  for (const id of e.skills) {
    const s = DB.eskills[id];
    if (s.kind === 'heal' && !B.enemies.some((x) => alive(x) && x.hp < x.mhp * 0.5)) continue;
    if (s.kind === 'buff' && Object.values(e.buff).some((v) => v > 0)) continue;
    if (s.kind === 'special' && (living(B.enemies).length >= 6 || e.boss)) continue;
    opts.push({ id, w: e.boss ? 1.6 : 1 });
  }
  let x = r() * opts.reduce((a, o) => a + o.w, 0), ch = opts[0]; for (const o of opts) { x -= o.w; if (x <= 0) { ch = o; break; } }
  const s = ch.id ? DB.eskills[ch.id] : { kind: 'phys', pow: 1, target: 'one' };
  log.push({ t: 'act', tg: ref(e), skill: ch.id });
  const targets = s.target === 'all' ? party : s.target === 'self' ? [e] : s.target === 'ally' ? [living(B.enemies).sort((a, b) => a.hp / a.mhp - b.hp / b.mhp)[0]] : [pick(r, party)];
  for (const t of targets) {
    switch (s.kind) {
      case 'phys': case 'drain': case 'mag': {
        const mag = s.kind !== 'phys';
        if (!mag && t.counter && s.target === 'one') { log.push({ t: 'counter', tg: ref(t) }); useWeapon(B, S, t, 'wpn1', { ...t.counter, counter: 0, pow: t.counter.pow * 1.2 }, e.i, r, log); continue; }
        if (!mag && r() > hitChance(e, t, 0)) { log.push({ t: 'miss', tg: ref(t), block: t.d.ev > 0 }); continue; }
        // attacks that hit the whole party are spread thinner
        const raw = (mag ? e.int : e.atk) * 2 * s.pow * stage(mag ? e.buff.mag : e.buff.atk) * (s.target === 'all' ? 0.7 : 1);
        const def = mag ? t.d.mdef * stage(t.buff.def) : t.d.def * stage(t.buff.def);
        const n = Math.max(1, raw - def * 0.9) * (0.9 + r() * 0.2) * res(t, s.elem || 'phys');
        damage(B, t, n, log, { el: s.elem });
        if (s.kind === 'drain') heal(e, n * 0.5, log);
        if (s.st) inflict(B, t, s.st, s.p, r, log);
        if (s.defDown && alive(t)) { t.buff.def = clamp(t.buff.def - 1, -3, 3); log.push({ t: 'buff', tg: ref(t), k: 'def', d: -1 }); }
        if (s.steal && S.gold > 0) { const g = Math.min(S.gold, 10 * e.rank + Math.floor(r() * 30)); S.gold -= g; B.stolen += g; log.push({ t: 'stolen', tg: ref(e), n: g }); }
        if (t.fireWall && !mag && alive(e)) damage(B, e, n * 0.25, log, { el: 'fire' });
        break;
      }
      case 'heal': heal(t, e.int * 3 * s.pow, log); break;
      case 'buff': for (const [k, v] of Object.entries(s.buff)) { t.buff[k] = clamp(t.buff[k] + v, -3, 3); log.push({ t: 'buff', tg: ref(t), k, d: v }); } break;
      case 'debuff': for (const [k, v] of Object.entries(s.debuff)) { t.buff[k] = clamp(t.buff[k] - v, -3, 3); log.push({ t: 'buff', tg: ref(t), k, d: -v }); } break;
      case 'status': inflict(B, t, s.st, s.p, r, log); break;
      case 'special': { // an ooze splits in two
        const half = Math.ceil(e.hp / 2); e.hp = half; const c = { ...e, i: B.enemies.length, st: {}, buff: { ...e.buff }, hp: half, mhp: e.mhp }; B.enemies.push(c); log.push({ t: 'split', tg: ref(e), to: ref(c) }); break;
      }
    }
  }
}

// ---------------------------------------------------------------- one round
export function resolveTurn(B, S, cmds, r) {
  const log = []; B.turn++;
  for (const u of B.party) { u.defending = false; u.counter = null; }
  const actors = [...B.party.filter(alive).map((u) => ({ u, cmd: cmds[u.i] || { kind: 'atk', target: 0 } })), ...B.enemies.filter(alive).map((u) => ({ u }))];
  for (const a of actors) {
    const agi = a.u.side === 'p' ? a.u.d.agi : a.u.agi, t = a.cmd && a.cmd.kind === 'tech' ? DB.techs[a.cmd.id] : null;
    a.spd = agi * stage(a.u.buff.agi) * (0.75 + r() * 0.5) + (t && t.first ? 1000 : 0) - (t && t.last ? 1000 : 0) + (a.cmd && (a.cmd.kind === 'def' || a.cmd.kind === 'flee') ? 500 : 0);
  }
  actors.sort((a, b) => b.spd - a.spd);
  for (const a of actors) {
    if (B.over || !alive(a.u)) continue;
    if (a.u.side === 'p') partyAct(B, S, a.u, a.cmd, r, log); else enemyAct(B, S, a.u, r, log);
    if (!living(B.enemies).length) B.over = 'win';
    else if (!living(B.party).length) B.over = 'lose';
  }
  // end of round: poison, regeneration
  if (!B.over) for (const u of [...B.party, ...B.enemies]) {
    if (!alive(u)) continue;
    const m = u.side === 'p' ? u.d.mhp : u.mhp;
    if (u.st.poison) { damage(B, u, Math.max(1, m * (u.boss ? 0.02 : 0.06)), log, { el: 'poison' }); if (--u.st.poison <= 0) delete u.st.poison; }
    if (u.regen && u.regen.turns-- > 0) heal(u, u.regen.n, log);
    if (u.side === 'p' && u.d.regen && alive(u)) heal(u, u.d.regen * 10, log);
  }
  if (!B.over && !living(B.enemies).length) B.over = 'win';
  if (!B.over && !living(B.party).length) B.over = 'lose';
  B.log = log;
  return log;
}
// what a party member does if the player lets the game choose (auto battle, and the test bots)
export function autoCommand(B, u, r, S) {
  const t = living(B.enemies).sort((a, b) => a.hp - b.hp)[0]; if (!t) return { kind: 'def' };
  const hurt = B.party.filter((x) => !x.ko && x.hp < x.d.mhp * 0.45).sort((a, b) => a.hp - b.hp)[0];
  const heal = u.c.spells.map((id) => DB.spells[id]).find((s) => s.kind === 'heal' && u.c.jp >= s.jp);
  if (hurt && heal) return { kind: 'spell', id: heal.id, target: heal.target === 'allies' ? 0 : hurt.i };
  const down = B.party.find((x) => x.ko && x.c.lp > 0);
  if (S && down && S.inv.feather) return { kind: 'item', id: 'feather', target: down.i };
  if (S && hurt && hurt.hp < hurt.d.mhp * 0.3) { const pot = ['hipotion', 'potion'].find((id) => S.inv[id]); if (pot) return { kind: 'item', id: pot, target: hurt.i }; }
  const ws = weaponsOf(u.c);
  const best = [];
  for (const w of ws) for (const id of u.c.techs) { const tc = DB.techs[id]; if (tc.type === w.type && tc.wp <= u.c.wp) best.push({ kind: 'tech', id, slot: w.slot, target: t.i, v: tc.pow * (tc.target === 'all' ? living(B.enemies).length : 1) }); }
  const dmgSpell = u.c.spells.map((id) => DB.spells[id]).filter((s) => s.kind === 'dmg' && u.c.jp >= s.jp + 2);
  for (const s of dmgSpell) best.push({ kind: 'spell', id: s.id, target: t.i, v: s.pow * 0.9 * (s.target === 'all' ? living(B.enemies).length : 1) * (1 + (u.d.int - u.d.str) / 20) });
  best.sort((a, b) => b.v - a.v);
  if (best.length && r() < 0.6) return best[0];
  return { kind: 'atk', slot: ws[0].slot, target: t.i };
}

// ---------------------------------------------------------------- after the battle: rewards and growth
const DROP_POOLS = [['potion', 'antidote', 'eyedrop'], ['potion', 'smelling', 'antidote', 'ether'], ['hipotion', 'ether', 'panacea', 'smelling'],
  ['hipotion', 'ether', 'manawater', 'panacea'], ['hipotion', 'ether', 'manawater', 'feather'], ['hipotion', 'manawater', 'feather', 'herb_all'],
  ['hipotion', 'feather', 'herb_all', 'elixir'], ['hipotion', 'elixir', 'lifewater', 'feather']];
export function finishBattle(B, S, r) {
  const out = { gold: 0, items: [], growth: [], left: [], stone: null };
  S.br += 1; S.battles = (S.battles || 0) + 1;
  if (B.over === 'win') {
    for (const e of B.enemies) {
      out.gold += e.gold; S.kills = (S.kills || 0) + 1;
      if (e.boss) for (const d of e.drop) out.items.push(d);
      else if (r() < 0.14) out.items.push(pick(r, DROP_POOLS[e.rank - 1]));
      else if (r() < 0.035) { const tier = clamp(Math.ceil(e.rank * 0.9), 1, 7); out.items.push(r() < 0.55 ? `${pick(r, Object.keys(DB.weaponTypes))}${tier}` : `${pick(r, ['body', 'head', 'shield'])}${Math.min(tier, 6)}`); }
    }
    out.gold += B.gold;
    S.gold += out.gold; for (const it of out.items) give(S, it);
    growth(B, S, r, out);
  }
  // HP comes back after every battle for anyone with LP left; those with no LP leave (the hero: game over)
  for (const u of B.party) {
    const c = u.c;
    if (c.lp <= 0) { if (c.id === S.hero) out.dead = true; else out.left.push(c.id); continue; }
    c.hp = derived(c, S).mhp;
  }
  return out;
}
function growth(B, S, r, out) {
  const L = B.L, bossBonus = B.enemies.some((e) => e.boss) ? 1.6 : 1;
  for (const u of B.party) {
    const c = u.c; if (c.lp <= 0) continue;
    const g = (what, n, extra) => out.growth.push({ id: c.id, what, n, ...extra });
    // max HP: grows when the fight was hard for your current HP
    const target = L * 13;
    if (c.mhp < HP_CAP && r() < clamp((target - c.mhp) / target * 0.9 * bossBonus + 0.04, 0.03, 0.85)) { const n = 3 + Math.floor(r() * (5 + L / 8)); c.mhp = Math.min(HP_CAP, c.mhp + n); g('hp', n); }
    // weapon levels: each type used may rise; fast while below what these enemies can teach, slow after
    const cap = Math.min(LEVEL_CAP, Math.round(L * 0.6 + 4));
    for (const [type, n] of Object.entries(u.used.w)) {
      const lv = c.wl[type] || 0, p = lv < cap ? 0.4 : 0.04, times = n >= 3 ? 2 : 1;
      let up = 0; for (let k = 0; k < times; k++) if (r() < p * bossBonus && lv + up < LEVEL_CAP) up++;
      if (up) { c.wl[type] = lv + up; g('wl', up, { type }); }
    }
    for (const [school, n] of Object.entries(u.used.s)) {
      const lv = c.ml[school] || 0, p = lv < cap ? 0.45 : 0.05, times = n >= 3 ? 2 : 1;
      let up = 0; for (let k = 0; k < times; k++) if (r() < p * bossBonus && lv + up < LEVEL_CAP) up++;
      if (up) { c.ml[school] = lv + up; g('ml', up, { school }); }
    }
    if (u.used.tech && c.mwp < WP_CAP && r() < 0.35 * bossBonus) { c.mwp++; g('wp', 1); }
    if (u.used.spell && c.mjp < WP_CAP && r() < 0.35 * bossBonus) { c.mjp++; g('jp', 1); }
    // stats follow what you do: weapons raise their stats, magic raises INT/WIL, being hit raises CON
    const statCap = Math.min(STAT_CAP, 12 + Math.round(L * 0.6));
    const tryStat = (k, p) => { if (c[k] < statCap && r() < p * bossBonus) { c[k]++; g('stat', 1, { stat: k }); } };
    for (const type of Object.keys(u.used.w)) { const T = DB.weaponTypes[type]; tryStat(T.a, 0.14); tryStat(T.b, 0.07); }
    if (u.used.spell) { tryStat('int', 0.12); tryStat('wil', 0.08); }
    if (u.used.hit) tryStat('con', 0.1);
    tryStat('agi', 0.04);
  }
}
