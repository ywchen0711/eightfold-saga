// The dungeon screen: walk a floor (keys, d-pad or swipe), open chests, take the stairs, touch monster symbols to
// fight them, and challenge the boss at the altar on the last floor.
import { DB } from '../data/index.js';
import { rng, give, weaponsOf } from '../engine/state.js';
import { makeFloor, spawnSymbols, moveSymbols, open, WALL } from '../engine/dungeon.js';
import { encounter } from '../engine/battle.js';
import { App, $, el, btn, esc, toast, itemName, choice, bossCleared, event } from './app.js';
import { L, t } from './i18n.js';
import { THEMES } from './art.js';
import { shadow, monsterSprite, particles, bloom, lightOf, mix } from './hd.js';
import { drawChibi } from './chibi.js';

let fl = null, syms = [], R = rng(1), px = 0, py = 0, dir = 0, face = -1, anim = 0, cool = 0, symT = 0, safe = 0, inBattle = false, moving = false;
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
  dir = dy > 0 ? 0 : dx < 0 ? 1 : dx > 0 ? 2 : 3; if (dx) face = dx;
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
    const res = await App.screens.battle.run({ boss: d.boss }); inBattle = false; safe = 2;
    for (const o of syms) if (Math.abs(o.x - px) + Math.abs(o.y - py) <= 5) o.stun = Math.max(o.stun, 6);
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
  else if (res === 'flee') s.stun = 8;
  // after any battle: a moment of safety, and monsters close by are stunned so you can walk away
  safe = 2;
  for (const o of syms) if (Math.abs(o.x - px) + Math.abs(o.y - py) <= 5) o.stun = Math.max(o.stun, 6);
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
    else {
      // back in a dungeon from a save (e.g. retrying after a defeat): no monster starts right next to you
      const keep = { ...S.dungeon }; loadFloor(keep.floor, 'start'); if (open(fl, keep.x, keep.y)) { px = keep.x; py = keep.y; }
      syms = syms.filter((o) => Math.abs(o.x - px) + Math.abs(o.y - py) > 7); safe = 2.5;
    }
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
  // HD-2D: raised stone blocks and textured floors at screen resolution, detailed pixel sprites, torchlight,
  // drifting dust and a tilt-shift blur at the top and bottom of the view
  draw() {
    if (!fl) return;
    const W = App.w, H = App.h, ts = Math.round(Math.max(52, Math.min(96, Math.min(W, H) / 9))), lift = Math.round(ts * 0.5), PX = Math.max(2, Math.round(ts / 32));
    const c = scene(W, H), S = App.S, T = THEMES[fl.theme] || THEMES.cave;
    const ox = Math.round(W / 2 - (px + 0.5) * ts), oy = Math.round(H / 2 - (py + 0.5) * ts + lift * 0.5);
    c.fillStyle = '#040308'; c.fillRect(0, 0, W, H);
    const x0 = Math.max(0, Math.floor(-ox / ts) - 1), x1 = Math.min(fl.w, Math.ceil((W - ox) / ts) + 1), y0 = Math.max(0, Math.floor(-oy / ts) - 1), y1 = Math.min(fl.h, Math.ceil((H - oy) / ts) + 2);
    const floorTex = texture(fl.theme, 'floor', ts), wallTex = texture(fl.theme, 'wall', ts), topTex = texture(fl.theme, 'top', ts);
    const isWall = (x, y) => x < 0 || y < 0 || x >= fl.w || y >= fl.h || fl.tiles[y * fl.w + x] === WALL;
    // floors first
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (!isWall(x, y)) c.drawImage(floorTex, ((x * 7 + y * 13) % 4) * ts, 0, ts, ts, ox + x * ts, oy + y * ts, ts, ts);
    // soft shadows the walls cast onto the floor below them
    c.fillStyle = 'rgba(0,0,0,.35)'; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (isWall(x, y) && !isWall(x, y + 1)) c.fillRect(ox + x * ts, oy + (y + 1) * ts, ts, ts * 0.22);
    // things on the floor
    const marks = [], z = PX;
    marks.push({ y: fl.start.y, draw: () => { const X = ox + fl.start.x * ts, Y = oy + fl.start.y * ts; if (S.dungeon.floor === 1) door(c, X, Y, ts); else stairs(c, X, Y, ts, true); } });
    marks.push({ y: fl.end.y, draw: () => { const X = ox + fl.end.x * ts, Y = oy + fl.end.y * ts; if (fl.end.kind === 'down') stairs(c, X, Y, ts, false); else altar(c, X, Y, ts, !!S.cleared[fl.id]); } });
    for (const ch of fl.chests) marks.push({ y: ch.y, draw: () => chest(c, ox + ch.x * ts, oy + ch.y * ts, ts, !!S.done['chest:' + ch.key]) });
    for (const s of syms) { const fm = DB.families[s.fam]; marks.push({ y: s.y + 0.5, draw: () => { const X = ox + (s.x + 0.5) * ts, Y = oy + (s.y + 0.9) * ts; if (s.stun > 0) c.globalAlpha = 0.45; shadow(c, X, Y, ts * 0.4, ts * 0.12); monsterSprite(c, fm.art, fm.hue, X, Y, ts * 0.85 / 90, App.time + s.id, { px: z }); c.globalAlpha = 1; } }); }
    marks.push({ y: py + 0.6, draw: () => { const X = ox + (px + 0.5) * ts, Y = oy + (py + 0.92) * ts; shadow(c, X, Y, ts * 0.32, ts * 0.1);
      drawChibi(c, S.party[0].id, X, Y - (anim > 0 ? Math.round(Math.sin(anim * Math.PI) * z) : 0), z, anim > 0 ? 'step' : 'idle', Math.floor(App.time * 2) % 2, weaponsOf(S.party[0])[0].type, { flip: face > 0 }); } });
    // walls are raised blocks: draw row by row so a block in front covers what stands behind it
    marks.sort((a, b) => a.y - b.y); let mi = 0;
    for (let y = y0; y < y1; y++) {
      while (mi < marks.length && marks[mi].y < y) marks[mi++].draw();
      for (let x = x0; x < x1; x++) if (isWall(x, y)) {
        const X = ox + x * ts, Y = oy + y * ts;
        if (!isWall(x, y + 1)) { // a visible front face
          c.drawImage(wallTex, 0, 0, ts, ts, X, Y + ts - lift, ts, lift);
          const g = c.createLinearGradient(0, Y + ts - lift, 0, Y + ts); g.addColorStop(0, 'rgba(0,0,0,.05)'); g.addColorStop(1, 'rgba(0,0,0,.5)'); c.fillStyle = g; c.fillRect(X, Y + ts - lift, ts, lift);
        }
        // the top face: dark capstone with a lit rim, so walls read clearly against the floor
        c.drawImage(topTex, ((x * 5 + y * 3) % 3) * ts, 0, ts, ts, X, Y - lift, ts, ts);
        c.fillStyle = 'rgba(255,240,210,.12)'; c.fillRect(X, Y - lift, ts, 1);
        if (!isWall(x - 1, y)) { c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(X, Y - lift, 2, ts); }
        if (!isWall(x + 1, y)) { c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(X + ts - 2, Y - lift, 2, ts); }
      }
    }
    while (mi < marks.length) marks[mi++].draw();
    // torchlight around the hero; glows on chests and the altar
    const hx = ox + (px + 0.5) * ts, hy = oy + (py + 0.5) * ts;
    light(c, W, H, hx, hy, ts * (4.2 + Math.sin(App.time * 7) * 0.08), fl.theme);
    for (const ch of fl.chests) if (!S.done['chest:' + ch.key]) bloom(c, ox + (ch.x + 0.5) * ts, oy + (ch.y + 0.5) * ts, ts * 0.9, 'rgba(255,210,120,.8)', 0.35 + 0.15 * Math.sin(App.time * 3 + ch.x));
    if (fl.end.kind === 'altar') bloom(c, ox + (fl.end.x + 0.5) * ts, oy + (fl.end.y + 0.3) * ts, ts * 1.6, S.cleared[fl.id] ? 'rgba(140,255,220,.8)' : 'rgba(255,60,80,.8)', 0.45);
    particles(c, fl.theme, W, H, App.time, 30);
    present(W, H);
  },
  key(k) { if (k === 'menu') App.go('menu', { from: 'dungeon' }); },
};
// ---------------------------------------------------------------- drawing helpers
// the frame is drawn off-screen first, so the top and bottom can be blurred (tilt-shift depth of field)
const scn = document.createElement('canvas'), sx = scn.getContext('2d');
function scene(W, H) { const d = App.dpr; if (scn.width !== Math.round(W * d) || scn.height !== Math.round(H * d)) { scn.width = Math.round(W * d); scn.height = Math.round(H * d); } sx.setTransform(d, 0, 0, d, 0, 0); return sx; }
function present(W, H) {
  const c = App.cx;
  c.drawImage(scn, 0, 0, W, H);
  const band = H * 0.2, blur = Math.max(2, Math.round(Math.min(W, H) / 220));
  for (const [y0, dir] of [[0, 1], [H - band, -1]]) {
    c.save(); c.beginPath(); c.rect(0, y0, W, band); c.clip(); c.filter = `blur(${blur}px)`; c.globalAlpha = 0.9; c.drawImage(scn, 0, 0, W, H); c.restore();
    const g = c.createLinearGradient(0, y0, 0, y0 + band); g.addColorStop(dir > 0 ? 0 : 1, 'rgba(4,3,8,.25)'); g.addColorStop(dir > 0 ? 1 : 0, 'rgba(4,3,8,0)'); c.fillStyle = g; c.fillRect(0, y0, W, band);
  }
}
// tiled textures per theme (floor: 4 variants side by side; wall: one), drawn once
const tex = new Map();
function texture(theme, kind, ts) {
  const key = `${theme}:${kind}:${ts}`; if (tex.has(key)) return tex.get(key);
  const T = THEMES[theme] || THEMES.cave, cv = document.createElement('canvas'), n = kind === 'floor' ? 4 : kind === 'top' ? 3 : 1; cv.width = ts * n; cv.height = ts; const c = cv.getContext('2d');
  const r = (i) => ((Math.sin(i * 91.7 + ts) * 43758.5) % 1 + 1) % 1;
  for (let v = 0; v < n; v++) {
    const X = v * ts;
    if (kind === 'floor') {
      c.fillStyle = T.floor; c.fillRect(X, 0, ts, ts);
      // flagstones with worn edges
      const cells = theme === 'forest' || theme === 'swamp' || theme === 'desert' || theme === 'sea' ? 0 : 2;
      for (let i = 0; i < cells; i++) for (let j = 0; j < cells; j++) { const s = ts / cells; c.fillStyle = mix(T.floor, i + j + v & 1 ? '#000000' : '#ffffff', 0.05 + r(v * 9 + i * 3 + j) * 0.05); c.fillRect(X + i * s + 1, j * s + 1, s - 2, s - 2); c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(X + i * s, j * s + s - 1, s, 1); c.fillRect(X + i * s + s - 1, j * s, 1, s); }
      for (let k = 0; k < 18; k++) { c.fillStyle = `rgba(${r(k + v * 40) > 0.5 ? '255,240,220' : '0,0,0'},${0.05 + r(k + 7 + v * 40) * 0.08})`; c.fillRect(X + r(k * 3 + v) * ts, r(k * 5 + v) * ts, 1 + r(k + v) * 3, 1 + r(k * 2 + v) * 2); }
      if (theme === 'forest' || theme === 'swamp') for (let k = 0; k < 6; k++) { c.fillStyle = mix('#4a7a3a', T.floor, 0.3); c.fillRect(X + r(k * 7 + v * 3) * ts, r(k * 11 + v) * ts, 1, 3 + r(k) * 3); }
    } else if (kind === 'top') {
      // the capstones on top of walls: irregular dark stones with lit edges and a little moss or dust
      c.fillStyle = mix(T.wall, '#000000', 0.45); c.fillRect(X, 0, ts, ts);
      const k = 3, s = ts / k;
      for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) { const jx = (r(v * 31 + i * 7 + j) - 0.5) * s * 0.3, jy = (r(v * 17 + i + j * 5) - 0.5) * s * 0.3;
        c.fillStyle = mix(mix(T.wall, T.top, 0.3), '#000000', 0.1 + r(v + i * 3 + j * 9) * 0.25); c.fillRect(X + i * s + 2 + jx * 0.3, j * s + 2 + jy * 0.3, s - 4, s - 4);
        c.fillStyle = 'rgba(255,240,210,.1)'; c.fillRect(X + i * s + 2 + jx * 0.3, j * s + 2 + jy * 0.3, s - 4, 1); }
      if (['forest', 'swamp', 'ruins', 'tomb'].includes(theme)) for (let m = 0; m < 5; m++) { c.fillStyle = `rgba(80,120,60,${0.25 + r(m + v * 9) * 0.25})`; c.fillRect(X + r(m * 3 + v) * ts, r(m * 7 + v) * ts, 3 + r(m) * 6, 2 + r(m * 2) * 3); }
    } else {
      const g = c.createLinearGradient(0, 0, 0, ts); g.addColorStop(0, mix(T.wall, '#ffffff', 0.08)); g.addColorStop(1, mix(T.wall, '#000000', 0.25)); c.fillStyle = g; c.fillRect(0, 0, ts, ts);
      c.fillStyle = 'rgba(0,0,0,.28)'; const bh = ts / 4;
      for (let row = 0; row < 4; row++) { c.fillRect(0, row * bh, ts, 1); for (let k = (row % 2) * ts / 4; k < ts; k += ts / 2) c.fillRect(k, row * bh, 1, bh); }
      c.fillStyle = 'rgba(255,240,210,.06)'; for (let row = 0; row < 4; row++) c.fillRect(0, row * bh + 1, ts, 1);
    }
  }
  tex.set(key, cv); return cv;
}
// darkness everywhere but the circle of torchlight
const lc = document.createElement('canvas'), lx = lc.getContext('2d');
function light(c, W, H, x, y, r, theme) {
  if (lc.width !== Math.round(W) || lc.height !== Math.round(H)) { lc.width = Math.round(W); lc.height = Math.round(H); }
  lx.globalCompositeOperation = 'source-over'; lx.fillStyle = theme === 'sky' || theme === 'desert' ? 'rgba(10,10,30,.45)' : 'rgba(2,2,8,.86)'; lx.clearRect(0, 0, W, H); lx.fillRect(0, 0, W, H);
  lx.globalCompositeOperation = 'destination-out'; const g = lx.createRadialGradient(x, y, r * 0.15, x, y, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,.75)'); g.addColorStop(1, 'rgba(0,0,0,0)'); lx.fillStyle = g; lx.fillRect(0, 0, W, H);
  c.drawImage(lc, 0, 0, W, H);
  c.save(); c.globalCompositeOperation = 'soft-light'; const w = c.createRadialGradient(x, y, 0, x, y, r * 0.9); w.addColorStop(0, lightOf(theme) + 'aa'); w.addColorStop(1, lightOf(theme) + '00'); c.fillStyle = w; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
}
function door(c, X, Y, ts) { const g = c.createLinearGradient(X, Y, X + ts, Y); g.addColorStop(0, '#6a4020'); g.addColorStop(1, '#3a2010'); c.fillStyle = '#20140c'; c.fillRect(X + ts * 0.16, Y + ts * 0.02, ts * 0.68, ts * 0.92); c.fillStyle = g; c.fillRect(X + ts * 0.22, Y + ts * 0.08, ts * 0.56, ts * 0.86); c.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 1; i < 4; i++) c.fillRect(X + ts * (0.22 + i * 0.14), Y + ts * 0.08, 1, ts * 0.86); bloom(c, X + ts * 0.66, Y + ts * 0.55, ts * 0.2, 'rgba(255,220,120,.9)', 0.6); }
function stairs(c, X, Y, ts, up) { for (let i = 0; i < 5; i++) { const k = up ? 4 - i : i, y = Y + ts * 0.1 + i * ts * 0.17; c.fillStyle = mix('#8a8494', '#1a1820', k / 5); c.fillRect(X + ts * (0.08 + i * 0.03), y, ts * (0.84 - i * 0.06), ts * 0.15); c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(X + ts * (0.08 + i * 0.03), y, ts * (0.84 - i * 0.06), 1); } bloom(c, X + ts / 2, Y + ts * (up ? 0.2 : 0.85), ts * 0.5, up ? 'rgba(160,255,220,.8)' : 'rgba(255,210,120,.8)', 0.35); }
function altar(c, X, Y, ts, lit) { c.fillStyle = '#3a3646'; c.fillRect(X + ts * 0.12, Y + ts * 0.42, ts * 0.76, ts * 0.5); c.fillStyle = '#5a5668'; c.fillRect(X + ts * 0.08, Y + ts * 0.34, ts * 0.84, ts * 0.12); c.fillStyle = 'rgba(255,255,255,.15)'; c.fillRect(X + ts * 0.08, Y + ts * 0.34, ts * 0.84, 1);
  const f = Math.sin(App.time * 3) * ts * 0.03; c.fillStyle = lit ? '#9affe0' : '#ff3a52'; c.beginPath(); c.moveTo(X + ts / 2, Y + ts * 0.02 + f); c.lineTo(X + ts * 0.62, Y + ts * 0.18 + f); c.lineTo(X + ts / 2, Y + ts * 0.3 + f); c.lineTo(X + ts * 0.38, Y + ts * 0.18 + f); c.fill(); }
function chest(c, X, Y, ts, opened) { const x = X + ts * 0.18, y = Y + ts * 0.36, w = ts * 0.64, h = ts * 0.46; shadow(c, X + ts / 2, Y + ts * 0.86, ts * 0.36, ts * 0.08);
  const g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, '#8a5424'); g.addColorStop(1, '#4a2a10'); c.fillStyle = g; c.fillRect(x, y, w, h);
  c.fillStyle = opened ? '#2a160a' : '#a0682c'; c.fillRect(x - 1, y - (opened ? ts * 0.18 : 0) - ts * 0.08, w + 2, ts * 0.12);
  c.fillStyle = '#d8b050'; c.fillRect(x, y + h * 0.35, w, 2); c.fillRect(x + w * 0.45, y + h * 0.25, w * 0.1, h * 0.25); c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(x, y, w, 1); }
export { event, btn };
