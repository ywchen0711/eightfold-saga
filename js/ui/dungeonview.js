// The dungeon screen: walk a floor (keys, d-pad or swipe), open chests, take the stairs, touch monster symbols to
// fight them, and challenge the boss at the altar on the last floor.
import { DB } from '../data/index.js';
import { rng, give } from '../engine/state.js';
import { makeFloor, spawnSymbols, moveSymbols, open } from '../engine/dungeon.js';
import { encounter } from '../engine/battle.js';
import { App, $, el, btn, esc, toast, itemName, choice, bossCleared, event } from './app.js';
import { L, t } from './i18n.js';
import { tile, hero, monster } from './art.js';

let fl = null, syms = [], R = rng(1), px = 0, py = 0, dir = 0, anim = 0, cool = 0, symT = 0, safe = 0, inBattle = false, moving = false;
const D = () => DB.dungeons[App.S.dungeon.id];
function loadFloor(f, at) {
  const S = App.S; fl = makeFloor(S.dungeon.id, f); S.dungeon.floor = f;
  const p = at === 'end' ? fl.end : fl.start; px = p.x; py = p.y; S.dungeon.x = px; S.dungeon.y = py;
  syms = spawnSymbols(fl, S, R); safe = 1.2; hud();
}
function hud() {
  const S = App.S, h = $('#hud'); h.innerHTML = '';
  const top = el('div', 'dhud');
  top.appendChild(el('div', 'dname', `${esc(L(D()))} <b>${S.dungeon.floor}${t('floor')}</b>${S.cleared[S.dungeon.id] ? ' ★' : ''}`));
  const party = el('div', 'dparty'); for (const c of S.party) party.appendChild(el('div', 'dp', `${esc(L(DB.chars[c.id]))}<i>LP${c.lp} WP${c.wp} JP${c.jp}</i>`)); top.appendChild(party);
  top.appendChild(btn('☰ ' + t('menu'), () => App.go('menu', { from: 'dungeon' }), 'mbtn'));
  h.appendChild(top);
  $('#pad').classList.remove('hidden');
}
async function step(dx, dy) {
  if (App.busy || inBattle || moving) return;
  dir = dy > 0 ? 0 : dx < 0 ? 1 : dx > 0 ? 2 : 3;
  const nx = px + dx, ny = py + dy; if (!open(fl, nx, ny)) return;
  px = nx; py = ny; anim = 1; App.S.dungeon.x = px; App.S.dungeon.y = py;
  moving = true;
  try { await arriveTile(); } finally { moving = false; }
  await touchCheck();
}
async function arriveTile() {
  const S = App.S, ch = fl.chests.find((c) => c.x === px && c.y === py);
  if (ch && !S.done['chest:' + ch.key]) {
    S.done['chest:' + ch.key] = 1;
    if (ch.item.startsWith('gold:')) { S.gold += +ch.item.slice(5); toast(`📦 ${t('chest')}：<b>${ch.item.slice(5)} G</b>`); }
    else { give(S, ch.item); toast(`📦 ${t('chest')}：<b>${esc(itemName(ch.item))}</b>`, DB.items[ch.item] && DB.items[ch.item].kind === 'key' ? 'big' : ''); }
  }
  if (px === fl.start.x && py === fl.start.y && anim) {
    if (S.dungeon.floor === 1) { if ((await choice(t('exit') + '？', [t('ok'), t('cancel')])) === 0) leave(); }
    else { toast(t('up')); loadFloor(S.dungeon.floor - 1, 'end'); }
    return;
  }
  if (px === fl.end.x && py === fl.end.y) {
    if (fl.end.kind === 'down') { toast(t('down')); loadFloor(S.dungeon.floor + 1, 'start'); return; }
    // the altar: the boss, or (once beaten) the way out
    const d = D();
    if (S.cleared[d.id]) { if ((await choice(t('bossAgain') + ' ' + t('exit') + '？', [t('ok'), t('cancel')])) === 0) leave(); return; }
    const b = DB.bosses[d.boss];
    if ((await choice(`${L(b)} ── ${L({ zh: '挑戰嗎？', en: 'Challenge it?' })}`, [L({ zh: '戰鬥', en: 'Fight' }), t('cancel')])) !== 0) { px = fl.end.x; py = fl.end.y + (open(fl, fl.end.x, fl.end.y + 1) ? 1 : -1); return; }
    inBattle = true;
    const res = await App.screens.battle.run({ boss: d.boss }); inBattle = false;
    if (res === 'win') { await bossCleared(d.id); hud(); }
    else if (res === 'flee') { px = fl.start.x; py = fl.start.y; }
  }
}
async function touchCheck() {
  if (safe > 0 || inBattle) return;
  const s = syms.find((o) => o.stun <= 0 && o.x === px && o.y === py);
  if (s) await fight(s);
}
async function fight(s) {
  inBattle = true;
  const res = await App.screens.battle.run({ enemies: encounter(App.S, D(), R) });
  inBattle = false;
  if (res === 'win') syms = syms.filter((o) => o !== s);
  else if (res === 'flee') { s.stun = 8; safe = 1.5; }
  if (App.screen === 'dungeon') hud();
}
function leave() { const S = App.S; S.loc = S.dungeon.id; S.dungeon = null; App.save(); App.go('world'); }

// for tests: look at the floor and jump next to a spot
App.dbg = { floor: () => fl, pos: () => [px, py], tp(x, y) { px = x; py = y; App.S.dungeon.x = x; App.S.dungeon.y = y; }, clearSyms() { syms = []; }, step: (dx, dy) => step(dx, dy) };
App.screens.dungeon = {
  enter(arg = {}) {
    const S = App.S;
    if (arg.back && fl) { hud(); return; }
    R = rng((Date.now() ^ 0x5bd1e995) >>> 0);
    if (arg.id) { S.dungeon = { id: arg.id, floor: 1, x: 0, y: 0 }; loadFloor(1, 'start'); toast(`${esc(L(D()))}`, 'big'); }
    else { const keep = { ...S.dungeon }; loadFloor(keep.floor, 'start'); if (open(fl, keep.x, keep.y)) { px = keep.x; py = keep.y; } }
  },
  leave() {},
  tick(dt, input) {
    if (!fl || App.busy || inBattle) return;
    if (anim > 0) anim = Math.max(0, anim - dt * 7);
    if (safe > 0) safe -= dt;
    cool -= dt;
    const dx = input.right ? 1 : input.left ? -1 : 0, dy = dx ? 0 : input.down ? 1 : input.up ? -1 : 0;
    if ((dx || dy) && cool <= 0) { cool = 0.13; step(dx, dy); }
    symT += dt;
    if (symT > 0.36) { symT = 0; const hit = moveSymbols(fl, syms, px, py, R); if (hit && safe <= 0 && !moving) fight(hit); }
  },
  draw() {
    if (!fl) return;
    const c = App.cx, w = App.w, h = App.h, ts = Math.round(Math.max(28, Math.min(58, Math.min(w, h) / 10.5)));
    const ox = w / 2 - (px + 0.5) * ts, oy = h / 2 - (py + 0.5) * ts;
    c.fillStyle = '#05050a'; c.fillRect(0, 0, w, h);
    const x0 = Math.max(0, Math.floor(-ox / ts)), x1 = Math.min(fl.w, Math.ceil((w - ox) / ts)), y0 = Math.max(0, Math.floor(-oy / ts)), y1 = Math.min(fl.h, Math.ceil((h - oy) / ts));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) tile(c, fl.theme, fl.tiles[y * fl.w + x], ox + x * ts, oy + y * ts, ts + 0.5, (x * 31 + y * 17) >>> 0);
    const S = App.S, mark = (x, y, glyph, col) => { c.font = `${Math.round(ts * 0.62)}px sans-serif`; c.textAlign = 'center'; c.fillStyle = col; c.fillText(glyph, ox + (x + 0.5) * ts, oy + (y + 0.78) * ts); c.textAlign = 'left'; };
    mark(fl.start.x, fl.start.y, S.dungeon.floor === 1 ? '🚪' : '⬆', '#fff');
    mark(fl.end.x, fl.end.y, fl.end.kind === 'down' ? '⬇' : S.cleared[fl.id] ? '✨' : '💀', '#fff');
    for (const ch of fl.chests) mark(ch.x, ch.y, S.done['chest:' + ch.key] ? '▫' : '🎁', '#fff');
    for (const s of syms) { const f = DB.families[s.fam]; if (s.stun > 0) c.globalAlpha = 0.45; monster(c, f.art, f.hue, ox + (s.x + 0.5) * ts, oy + (s.y + 0.92) * ts, ts / 140, App.time + s.id); c.globalAlpha = 1; }
    hero(c, S.party[0].id, ox + (px + 0.5) * ts, oy + (py + 0.9) * ts, ts / 30, dir, anim);
    // a vignette: the dungeon is dark
    const g = c.createRadialGradient(w / 2, h / 2, ts * 3, w / 2, h / 2, Math.max(w, h) * 0.65); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.75)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  },
  key(k) { if (k === 'menu') App.go('menu', { from: 'dungeon' }); },
};
export { event, btn };
