// The battle screen, laid out like Romancing SaGa (monsters on the left, the party on the right facing them) and
// drawn HD-2D style: crisp pixel sprites in a soft, lit diorama with depth of field, light shafts, particles and
// bloom. A status window and a command window sit at the bottom. run(spec) resolves to win/lose/flee.
import { DB } from '../data/index.js';
import { rng, weaponsOf, techsFor, derived } from '../engine/state.js';
import { startBattle, resolveTurn, autoCommand, finishBattle, unitOf } from '../engine/battle.js';
import { App, $, el, btn, esc, toast, itemName } from './app.js';
import { L, t } from './i18n.js';
import { diorama, particles, shadow, monsterSprite, bloom, lightOf } from './hd.js';
import { drawChibi } from './chibi.js';

let B = null, R = null, done = null, cmds = {}, who = 0, fx = [], sfx = [], msg = '', flash = {}, shake = 0, theme = 'cave', auto = false, glim = null, G = null;
const living = (list) => list.filter((u) => !u.ko && u.hp > 0);
const nm = (u) => (u.side === 'p' ? L(DB.chars[u.c.id]) : L(u));
const narrow = () => App.w <= 700;
// the scene's height on screen: all of it on wide screens (windows float over the ground), the top part on phones
const sceneH = () => (narrow() ? Math.round(App.h * 0.44) : App.h);

// where everyone stands (screen pixels, feet positions) and how big the pixels are
function layout() {
  const W = App.w, H = sceneH(), wide = !narrow();
  const PX = Math.max(2, Math.round(H * (wide ? 0.17 : 0.2) / 40)), yA = H * (wide ? 0.53 : 0.66), yB = H * (wide ? 0.665 : 0.92);
  G = { s: 1, W, H, PX, yA, yB };
  const n = B.enemies.length, unit = H * 0.24 / 90, left = W * 0.05, right = W * (wide ? 0.55 : 0.6);
  B.enemies.forEach((e, i) => {
    if (e.boss) { e.vx = left + (right - left) * 0.48; e.vy = yB; e.k = unit * e.size * 0.8; return; }
    const two = n > 3, row = two ? (i < Math.ceil(n / 2) ? 0 : 1) : 1, inRow = two ? (row === 0 ? Math.ceil(n / 2) : n - Math.ceil(n / 2)) : n, j = two && row === 1 ? i - Math.ceil(n / 2) : i;
    e.vx = left + (right - left) * (j + 0.5) / inRow + (row === 0 ? -W * 0.03 : W * 0.03); e.vy = (row ? yB : yA) - (e.fly ? H * 0.06 : 0); e.k = unit * e.size * (two ? 0.85 : 1);
  });
  if (B.enemies[0] && B.enemies[0].boss) B.enemies.slice(1).forEach((e, i) => { e.vx = left + (right - left) * (i % 2 ? 0.92 : 0.08); e.vy = i < 2 ? yB : yA; e.k = unit * e.size * 0.8; });
  // the party: a slanted column from front-left to back-right (the SaGa formation)
  const m = B.party.length;
  B.party.forEach((u, i) => { const f = m > 1 ? i / (m - 1) : 0.5; u.vx = W * (wide ? 0.62 : 0.6) + W * (wide ? 0.27 : 0.32) * f + (i % 2 ? W * 0.025 : 0); u.vy = yA - H * 0.03 + (yB - yA + H * 0.05) * f; });
}
// ---------------------------------------------------------------- drawing
function draw() {
  if (App.screen !== 'battle' || !G) return;
  const c = App.cx, W = App.w, H = G.H, T = App.time;
  c.fillStyle = '#050508'; c.fillRect(0, 0, W, App.h);
  c.save(); if (shake > 0) c.translate(Math.round((Math.random() - 0.5) * shake), 0);
  c.drawImage(diorama(theme, Math.round(W), Math.round(H)), 0, 0);
  // a monster leaves only when the hit that defeats it is played back (e.gone), not when the round is worked out
  const all = [...B.enemies.filter((e) => !(e.gone && !(e.fade > 0))), ...B.party].sort((a, b) => a.vy - b.vy);
  for (const u of all) {
    const a = u.anim; let ox = 0, oy = 0;
    if (a) [ox, oy] = animOffset(a);
    if (u.side === 'e') {
      let dying = false;
      if (u.gone) { u.fade -= 0.022; if (u.fade <= 0) continue; dying = true; c.globalAlpha = Math.max(0, Math.min(1, u.fade * 1.4)); oy += (1 - u.fade) * 10 * u.k; }
      shadow(c, u.vx + ox, u.vy + 2, 46 * u.k * u.size + 10, 10 * u.k + 4);
      monsterSprite(c, u.art, u.hue, u.vx + ox, u.vy + oy, u.k, dying ? 0 : T + u.i, { flash: flash['e' + u.i] > 0 || (dying && u.fade > 0.7), px: G.PX, noGlow: dying });
      c.globalAlpha = 1;
      if (pickTarget && !u.ko) { const y = u.vy - 118 * u.k + Math.sin(T * 6) * 4; c.fillStyle = '#ffe08a'; c.beginPath(); c.moveTo(u.vx - 8, y - 12); c.lineTo(u.vx + 8, y - 12); c.lineTo(u.vx, y); c.fill(); bloom(c, u.vx, y - 6, 22, 'rgba(255,220,140,.8)', 0.5); }
    } else {
      const ws = weaponsOf(u.c), wtype = (a && a.wtype) || ws[0].type;
      const pose = u.ko ? 'ko' : a ? a.pose : B.over === 'win' ? 'win' : u.hp < u.d.mhp * 0.25 ? 'hurt' : u.defending ? 'def' : who === u.i && !busy ? 'step' : 'idle';
      shadow(c, u.vx + ox, u.vy + 2, 13 * G.PX, 4 * G.PX);
      if (who === u.i && !busy && !B.over) bloom(c, u.vx, u.vy - 30 * G.PX, 46 * G.PX, 'rgba(255,230,160,.5)', 0.35 + 0.15 * Math.sin(T * 4));
      if (flash['p' + u.i] > 0 && Math.floor(T * 30) % 2) c.globalAlpha = 0.5;
      const fr = a && ATK_POSE[pose] ? (a.t / a.dur > (a.strike || 0.4) ? 1 : 0) : Math.floor(T * 2 + u.i) % 2;
      if (a && a.trail) for (const [lag, al] of [[0.1, 0.35], [0.2, 0.18]]) {            // afterimages for techs
        const [gx, gy] = animOffset(a, -lag * a.dur); c.globalAlpha = al; drawChibi(c, u.c.id, u.vx + gx, u.vy + gy, G.PX, pose, fr, wtype); c.globalAlpha = 1; }
      drawChibi(c, u.c.id, u.vx + ox, u.vy + oy, G.PX, pose, fr, wtype);
      c.globalAlpha = 1;
    }
  }
  // hit effects with a glow
  for (const e of sfx) {
    const p = 1 - e.t / e.dur, z = G.PX;
    if (e.k === 'slash') { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1 - p; c.strokeStyle = '#fff4d0'; c.lineWidth = 3 * z * (e.big ? 1.6 : 1); c.lineCap = 'round'; c.beginPath(); c.arc(e.x + 10 * z, e.y, 22 * z * (e.big ? 1.5 : 1), -2.2 + p * 0.6, -0.4 + p * 0.6); c.stroke();
      if (e.big) { c.beginPath(); c.arc(e.x - 6 * z, e.y + 4 * z, 26 * z, 0.6 - p * 0.6, 2.4 - p * 0.6); c.stroke(); } c.restore(); bloom(c, e.x, e.y, 30 * z, 'rgba(255,230,180,.9)', 0.6 * (1 - p)); }
    if (e.k === 'burst') { bloom(c, e.x, e.y, (14 + p * 30) * z, e.col, 0.9 * (1 - p)); c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = e.col; for (let i = 0; i < 10; i++) { const ang = i / 10 * 6.283, r = (6 + p * 26) * z; c.globalAlpha = 1 - p; c.fillRect(e.x + Math.cos(ang) * r - z, e.y + Math.sin(ang) * r * 0.7 - z, 2 * z, 2 * z); } c.restore(); }
    if (e.k === 'crush') { c.save(); c.globalAlpha = 1 - p; c.strokeStyle = '#ffe6b0'; c.lineWidth = 3 * z; c.beginPath(); c.ellipse(e.x, e.y + 22 * z, (8 + p * 34) * z * (e.big ? 1.5 : 1), (3 + p * 10) * z, 0, 0, 7); c.stroke();
      c.fillStyle = '#c8a878'; for (let i = 0; i < 8; i++) { const a2 = i / 8 * 3.14, r = (6 + p * 24) * z; c.fillRect(e.x + Math.cos(a2) * r * 1.4, e.y + 18 * z - Math.sin(a2) * r + p * p * 30 * z, 2 * z, 2 * z); } c.restore(); bloom(c, e.x, e.y, 34 * z * (e.big ? 1.4 : 1), 'rgba(255,220,160,.9)', 0.7 * (1 - p)); }
    if (e.k === 'pierce') { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1 - p; c.strokeStyle = '#e8f4ff'; c.lineCap = 'round';
      for (let i = 0; i < (e.big ? 5 : 3); i++) { const yy = e.y + (i - 1) * 7 * z, x0 = e.x + 30 * z - p * 50 * z; c.lineWidth = (i === 1 ? 3 : 1.5) * z; c.beginPath(); c.moveTo(x0, yy); c.lineTo(x0 - (24 + i * 4) * z, yy); c.stroke(); } c.restore(); bloom(c, e.x, e.y, 22 * z, 'rgba(220,240,255,.9)', 0.6 * (1 - p)); }
    if (e.k === 'impact') { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1 - p; c.fillStyle = '#fff6d0'; const r = (4 + p * 16) * z * (e.big ? 1.4 : 1);
      c.beginPath(); for (let i = 0; i < 16; i++) { const a2 = i / 16 * 6.283, rr = i % 2 ? r * 0.45 : r; c.lineTo(e.x + Math.cos(a2) * rr, e.y + Math.sin(a2) * rr); } c.fill(); c.restore(); bloom(c, e.x, e.y, 24 * z, 'rgba(255,240,200,.9)', 0.7 * (1 - p)); }
    if (e.k === 'whip') { c.save(); c.globalAlpha = Math.min(1, (1 - p) * 2); c.strokeStyle = '#7a4a22'; c.lineWidth = 2 * z; c.beginPath(); c.moveTo(e.x0, e.y0); c.quadraticCurveTo((e.x0 + e.x1) / 2, Math.min(e.y0, e.y1) - 40 * z * (1 - p), e.x1, e.y1); c.stroke(); c.restore(); }
    if (e.k === 'circle') { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, (1 - p) * 3) * 0.9; c.strokeStyle = e.col; c.lineWidth = 2 * z;
      for (const rr of [1, 0.7]) { c.beginPath(); c.ellipse(e.x, e.y, 18 * z * rr, 6 * z * rr, 0, 0, 7); c.stroke(); }
      c.fillStyle = e.col; for (let i = 0; i < 6; i++) { const a2 = i / 6 * 6.283 + p * 4; c.fillRect(e.x + Math.cos(a2) * 15 * z - z, e.y + Math.sin(a2) * 5 * z - z - p * 14 * z * (i % 2), 2 * z, 2 * z); } c.restore(); bloom(c, e.x, e.y - 8 * z, 30 * z, e.col, 0.35 * (1 - p)); }
    if (e.k === 'charge') { bloom(c, e.x, e.y, (18 + p * 14) * z, 'rgba(255,214,120,.95)', 0.6 * Math.sin(p * 3.14)); c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = '#ffe9a0';
      for (let i = 0; i < 10; i++) { const a2 = i / 10 * 6.283, r = (20 - p * 16) * z; c.globalAlpha = 1 - p * 0.5; c.fillRect(e.x + Math.cos(a2) * r - z, e.y + Math.sin(a2) * r * 0.8 - z, 2 * z, 2 * z); } c.restore(); }
    if (e.k === 'poof') { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1 - p; c.fillStyle = '#fff0e0';
      for (let i = 0; i < 14; i++) { const a2 = i / 14 * 6.283 + i, r = (6 + p * (20 + (i % 3) * 8)) * z; c.fillRect(e.x + Math.cos(a2) * r * e.s, e.y - p * 18 * z + Math.sin(a2) * r * 0.7 * e.s, 2 * z, 2 * z); } c.restore(); bloom(c, e.x, e.y, 40 * z * e.s, 'rgba(255,240,220,.8)', 0.5 * (1 - p)); }
    if (e.k === 'proj') {
      const q = Math.min(1, p * 1.0), px = e.x0 + (e.x1 - e.x0) * q, py = e.y0 + (e.y1 - e.y0) * q - (e.arc ? Math.sin(q * 3.14) * e.arc * z : 0), ang = Math.atan2(e.y1 - e.y0, e.x1 - e.x0);
      c.save(); c.translate(px, py);
      if (e.style === 'arrow') { c.rotate(ang); c.fillStyle = '#d8c8a0'; c.fillRect(-12 * z, -0.5 * z, 12 * z, z); c.fillStyle = '#e8eef8'; c.beginPath(); c.moveTo(2 * z, 0); c.lineTo(-2 * z, -2 * z); c.lineTo(-2 * z, 2 * z); c.fill(); c.fillStyle = '#d04a4a'; c.fillRect(-13 * z, -1.5 * z, 3 * z, 3 * z); }
      else if (e.style === 'bullet') { c.rotate(ang); c.globalCompositeOperation = 'lighter'; c.fillStyle = '#fff2a0'; c.fillRect(-16 * z, -0.5 * z, 16 * z, z); c.fillRect(-3 * z, -1 * z, 3 * z, 2 * z); }
      else if (e.style === 'star') { c.rotate(p * 30); c.fillStyle = '#dfe4ee'; c.beginPath(); for (let i = 0; i < 8; i++) { const a2 = i / 8 * 6.283, rr = i % 2 ? 1.5 * z : 5 * z; c.lineTo(Math.cos(a2) * rr, Math.sin(a2) * rr); } c.fill(); }
      else if (e.style === 'bottle') { c.rotate(p * 12); c.fillStyle = '#9ad8ff'; c.fillRect(-2 * z, -3 * z, 4 * z, 6 * z); c.fillStyle = '#c89a5a'; c.fillRect(-1 * z, -5 * z, 2 * z, 2 * z); }
      else { c.restore(); bloom(c, px, py, 16 * z, e.col, 0.9); c.save(); c.translate(px, py); c.fillStyle = '#ffffff'; c.fillRect(-2 * z, -2 * z, 4 * z, 4 * z); }
      c.restore();
    }
    if (e.k === 'heal') { bloom(c, e.x, e.y - p * 20 * z, 24 * z, 'rgba(140,255,170,.9)', 0.7 * (1 - p)); c.fillStyle = 'rgba(200,255,210,.9)'; for (let i = 0; i < 6; i++) c.fillRect(e.x - 12 * z + i * 5 * z, e.y - p * 30 * z - (i % 2) * 8 * z, z * 2, z * 2); }
  }
  particles(c, theme, W, H, T, narrow() ? 28 : 48);
  c.restore();
  // text on top: damage numbers, the line of the round, glimmers
  for (const n of fx) { c.globalAlpha = Math.min(1, n.t * 2); c.font = `700 ${n.big ? 30 : 22}px "Cinzel", "Noto Serif TC", serif`; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = 'rgba(0,0,0,.85)'; c.strokeText(n.text, n.x, n.y); c.fillStyle = n.col; c.fillText(n.text, n.x, n.y); }
  c.globalAlpha = 1; c.textAlign = 'left';
  for (const e of B.enemies) if (!e.ko && Object.keys(e.st).length) { c.font = '12px "Noto Serif TC", serif'; c.fillStyle = '#ffe08a'; c.fillText(Object.keys(e.st).map((k) => L(DB.statuses[k])).join(' '), e.vx - 24, e.vy + 16); }
  if (msg) { c.font = '600 17px "Noto Serif TC", serif'; const tw = c.measureText(msg).width, x0 = W / 2 - tw / 2 - 28; const g = c.createLinearGradient(x0, 0, x0 + tw + 56, 0); g.addColorStop(0, 'rgba(8,8,16,0)'); g.addColorStop(0.15, 'rgba(8,8,16,.85)'); g.addColorStop(0.85, 'rgba(8,8,16,.85)'); g.addColorStop(1, 'rgba(8,8,16,0)');
    c.fillStyle = g; c.fillRect(x0, 12, tw + 56, 32); c.fillStyle = 'rgba(214,190,130,.6)'; c.fillRect(x0 + 20, 12, tw + 16, 1); c.fillRect(x0 + 20, 43, tw + 16, 1); c.fillStyle = '#f4ecd8'; c.textAlign = 'center'; c.fillText(msg, W / 2, 34); c.textAlign = 'left'; }
  if (glim) { const a = Math.min(1, glim.t * 2), cy = H * 0.3; c.globalAlpha = a; bloom(c, glim.x || W / 2, cy - 20, 120, 'rgba(255,236,170,.9)', 0.55);
    c.font = '48px serif'; c.textAlign = 'center'; c.fillText('💡', glim.x || W / 2, cy); c.font = '700 30px "Noto Serif TC", serif'; c.lineWidth = 6; c.strokeStyle = 'rgba(40,24,0,.9)';
    c.strokeText(`${t('glimmer')} ${glim.name}`, W / 2, cy + 48); c.fillStyle = '#fff2c0'; c.fillText(`${t('glimmer')} ${glim.name}`, W / 2, cy + 48); c.textAlign = 'left'; c.globalAlpha = 1; }
}
function tick(dt) {
  for (const f of fx) { f.t -= dt; f.y -= 30 * dt; } fx = fx.filter((f) => f.t > 0);
  for (const e of sfx) e.t -= dt; sfx = sfx.filter((e) => e.t > 0);
  if (B) for (const u of [...B.party, ...B.enemies]) if (u.anim) { u.anim.t += dt; if (u.anim.t >= u.anim.dur) u.anim = null; }
  for (const k in flash) flash[k] -= dt; if (shake > 0) shake -= dt * 30; if (glim) { glim.t -= dt; if (glim.t <= 0) glim = null; }
}
// ---------------------------------------------------------------- the status window (name, HP, WP, JP, LP)
function partyBar() {
  const hud = $('#hud'); hud.innerHTML = ''; const box = el('div', 'bstat bwin');
  for (const u of B.party) {
    const c = u.c, d = u.d, row = el('div', 'brow' + (u.ko ? ' ko' : '') + (who === u.i && !busy ? ' cur' : '') + (flash['p' + u.i] > 0 ? ' hit' : ''));
    const st = Object.keys(u.st).map((s) => `<span style="color:${DB.statuses[s].col}">${L(DB.statuses[s])}</span>`).join(' ');
    row.innerHTML = `<b class="bn">${esc(L(DB.chars[c.id]))}</b><span class="bh"><i style="width:${Math.max(0, u.hp / d.mhp * 100)}%"></i><em>${Math.max(0, Math.round(u.hp))}</em></span>`
      + `<span class="bw">WP<b>${c.wp}</b></span><span class="bw">JP<b>${c.jp}</b></span><span class="bl">LP<b>${c.lp}</b></span><span class="bs">${st}</span>`;
    row.onclick = () => { if (pickAlly) pickAlly(u.i); };
    box.appendChild(row);
  }
  hud.appendChild(box);
}
// ---------------------------------------------------------------- choosing commands
let pickTarget = null, pickAlly = null, busy = false;
function nextCommander(from) { for (let i = from; i < B.party.length; i++) if (!B.party[i].ko && B.party[i].hp > 0) return i; return -1; }
function ask() {
  who = nextCommander(who);
  if (who < 0) { play(); return; }
  if (auto) { cmds[who] = autoCommand(B, B.party[who], R, App.S); who++; ask(); return; }
  partyBar(); menu();
}
function setCmd(cmd) { cmds[who] = cmd; pickTarget = pickAlly = null; who++; ask(); }
function chooseEnemy(build) {
  const alive = living(B.enemies);
  if (alive.length === 1) { setCmd(build(alive[0].i)); return; }
  panel(t('target'), alive.map((e) => [esc(nm(e)), () => setCmd(build(e.i))]));
  pickTarget = (i) => setCmd(build(i));
}
function chooseAlly(build) { panel(t('target'), B.party.map((u) => [esc(nm(u)) + (u.ko ? ' ✝' : ''), () => setCmd(build(u.i))])); pickAlly = (i) => setCmd(build(i)); }
function panel(title, items, back = true) {
  const p = $('#panel'); p.innerHTML = ''; const box = el('div', 'cmd'); box.appendChild(el('div', 'ctitle', title));
  const list = el('div', 'clist'); for (const [label, fn, dis, sub] of items) { const b = btn(label + (sub ? `<small>${sub}</small>` : ''), fn); b.disabled = !!dis; list.appendChild(b); }
  box.appendChild(list); if (back) box.appendChild(btn(t('back'), () => { pickTarget = pickAlly = null; menu(); }, 'back'));
  p.appendChild(box);
}
function menu() {
  const u = B.party[who], c = u.c, ws = weaponsOf(c);
  const items = ws.map((w) => [`${DB.weaponTypes[w.type].icon} ${t('attack')}`, () => chooseEnemy((i) => ({ kind: 'atk', slot: w.slot, target: i })), false, esc(L(w.w))]);
  items.push([`✦ ${t('techs')}`, techMenu], [`✧ ${t('spells')}`, spellMenu], [`🎒 ${t('items')}`, itemMenu], [`🛡 ${t('defend')}`, () => setCmd({ kind: 'def' })]);
  if (!B.noFlee) items.push([`🏃 ${t('flee')}`, () => setCmd({ kind: 'flee' })]);
  items.push([`⚙ ${t('auto')}`, () => { cmds[who] = autoCommand(B, u, R, App.S); who++; ask(); }]);
  if (who > 0) items.push([`↶ ${t('cancelCmd')}`, () => { who = Math.max(0, who - 1); while (who > 0 && (B.party[who].ko)) who--; delete cmds[who]; ask(); }]);
  panel(`${esc(L(DB.chars[c.id]))}`, items, false);
  const p = $('#panel .cmd'); const at = btn(t('auto') + ' ▶▶', () => { auto = true; cmds[who] = autoCommand(B, u, R, App.S); who++; ask(); }, 'autoall'); p.appendChild(at);
}
function techMenu() {
  const u = B.party[who], c = u.c, items = [];
  for (const w of weaponsOf(c)) for (const id of techsFor(c, w.type)) {
    const tc = DB.techs[id], tgt = tc.target === 'one' ? 'one' : 'all';
    items.push([`${DB.weaponTypes[tc.type].icon} ${esc(L(tc))}`, () => (tgt === 'one' && !tc.counter ? chooseEnemy((i) => ({ kind: 'tech', id, slot: w.slot, target: i })) : setCmd({ kind: 'tech', id, slot: w.slot, target: 0 })), c.wp < tc.wp, `WP ${tc.wp}${tc.target !== 'one' ? ' · ' + (tc.target === 'all' ? '全體|all' : '亂擊|random').split('|')[L({ zh: 0, en: 1 })] : ''}`]);
  }
  panel(t('techs'), items.length ? items : [[t('noTechs'), () => {}, true]]);
}
function spellMenu() {
  const u = B.party[who], c = u.c;
  const items = c.spells.map((id) => { const sp = DB.spells[id], sc = DB.schools[sp.school];
    const go = sp.target === 'one' ? () => chooseEnemy((i) => ({ kind: 'spell', id, target: i })) : sp.target === 'ally' ? () => chooseAlly((i) => ({ kind: 'spell', id, target: i })) : () => setCmd({ kind: 'spell', id, target: 0 });
    return [`${sc.icon} ${esc(L(sp))}`, go, c.jp < sp.jp, `JP ${sp.jp}`]; });
  panel(t('spells'), items.length ? items : [[t('noSpells'), () => {}, true]]);
}
function itemMenu() {
  const S = App.S, items = Object.entries(S.inv).filter(([id]) => DB.items[id] && DB.items[id].kind === 'use' && !DB.items[id].field).map(([id, n]) => { const it = DB.items[id];
    const go = it.target === 'one' ? () => chooseEnemy((i) => ({ kind: 'item', id, target: i })) : it.target === 'ally' ? () => chooseAlly((i) => ({ kind: 'item', id, target: i })) : () => setCmd({ kind: 'item', id, target: 0 });
    return [`${esc(L(it))} ×${n}`, go]; });
  panel(t('items'), items.length ? items : [[t('noItems'), () => {}, true]]);
}
// ---------------------------------------------------------------- playing a round back
const wait = (ms) => new Promise((r) => setTimeout(r, App.fast ? ms * 0.35 : ms));
function posOf(rf) {
  const u = unitOf(B, rf), s = G.s;
  return u.side === 'e' ? [u.vx, u.vy - 70 * u.k] : [u.vx, u.vy - 44 * G.PX];
}
const ELEM_COL = { fire: '#ff7a3a', water: '#6ab8ff', wind: '#8affb0', earth: '#d8a85a', light: '#fff4a0', dark: '#b07aff', star: '#a8e0ff', spirit: '#ff9ad8', poison: '#7adf5a' };
// how a hero attacks with each weapon type
const STYLE = { sword: 'swing', katana: 'swing', scythe: 'swing', greatsword: 'smash', axe: 'smash', mace: 'smash', staff: 'smash',
  rapier: 'thrust', dagger: 'thrust', spear: 'thrust', fist: 'punch', whip: 'whip', bow: 'shoot', gun: 'shoot', thrown: 'throw' };
const POSE = { swing: 'atk', smash: 'smash', thrust: 'thrust', punch: 'thrust', whip: 'atk', shoot: 'aim', throw: 'throw' };
const ATK_POSE = { atk: 1, smash: 1, thrust: 1, aim: 1, throw: 1 };
const MELEE = { swing: 1, smash: 1, thrust: 1, punch: 1 };
// where an animating unit is drawn: melee dashes in, holds through the hit and walks back; smashes jump; ranged recoils
function animOffset(a, shift = 0) {
  const p = Math.max(0, Math.min(1, (a.t + shift) / a.dur));
  let out;
  if (a.melee) out = p < 0.35 ? 1 - (1 - p / 0.35) ** 2 : p < 0.62 ? 1 : 1 - (p - 0.62) / 0.38;
  else out = p < 0.5 ? p * 2 : (1 - p) * 2;
  const hop = a.hop ? Math.sin(Math.min(1, p / 0.45) * Math.PI) * a.hop : 0;
  return [(a.dx || 0) * out, (a.dy || 0) * out - hop];
}
const hand = (u) => [u.vx - 10 * G.PX, u.vy - 30 * G.PX];
const aimAt = (t) => [t.vx, t.vy - (t.side === 'e' ? 50 * t.k : 30 * G.PX)];
// a hero's action: returns how long to wait before the hits are shown
async function heroAct(u, ev, hits) {
  const tgt = hits.find((h) => h && h !== u) || living(B.enemies)[0], z = G.PX;
  if (ev.spell) {
    const sp = DB.spells[ev.spell], col = (DB.schools[sp.school] || {}).col || '#fff0a0';
    u.anim = { pose: 'cast', t: 0, dur: 0.7, dx: -4 * z, dy: 0 }; sfx.push({ k: 'circle', x: u.vx, y: u.vy, col, t: 0.8, dur: 0.8 });
    await wait(380);
    if (tgt && tgt.side === 'e' && hits.length === 1) { const [x0, y0] = hand(u), [x1, y1] = aimAt(tgt); sfx.push({ k: 'proj', style: 'orb', col, x0, y0: y0 - 10 * z, x1, y1, t: 0.25, dur: 0.25 }); await wait(240); }
    return 120;
  }
  if (ev.item) {
    // healing and support items are used on the spot (the glow plays on whoever they heal); attack items are thrown
    const onEnemy = tgt && tgt.side === 'e';
    if (!onEnemy) { u.anim = { pose: 'cast', t: 0, dur: 0.5, dx: 0, dy: 0 }; sfx.push({ k: 'charge', x: u.vx, y: u.vy - 22 * z, t: 0.35, dur: 0.35 }); await wait(260); return 60; }
    u.anim = { pose: 'throw', t: 0, dur: 0.45, dx: -3 * z, dy: 0, strike: 0.35 };
    await wait(150);
    const [x0, y0] = hand(u), [x1, y1] = aimAt(tgt); sfx.push({ k: 'proj', style: 'bottle', arc: 26, x0, y0, x1, y1, t: 0.32, dur: 0.32 }); await wait(320);
    return 80;
  }
  const wtype = ev.tech ? DB.techs[ev.tech].type : (DB.weapons[ev.w] || { type: 'fist' }).type, style = STYLE[wtype] || 'swing', tech = !!ev.tech, z2 = tech ? 1.25 : 1;
  const sweep = tech && hits.filter((h) => h.side === 'e').length > 1, dest = sweep ? { vx: B.enemies.reduce((a, e) => a + e.vx, 0) / B.enemies.length, vy: tgt.vy } : tgt;
  lastStyle = { style, tech, wtype };
  if (tech) { sfx.push({ k: 'charge', x: u.vx, y: u.vy - 22 * z, t: 0.4, dur: 0.4 }); await wait(260); }
  const pose = POSE[style], dur = (style === 'thrust' || style === 'punch' ? 0.45 : 0.6) * (tech ? 1.3 : 1);
  if (MELEE[style]) {
    const reach = style === 'thrust' && wtype === 'spear' ? 0.45 : 0.62, gap = (dest.side === 'e' ? 40 * dest.k : 0);
    u.anim = { pose, t: 0, dur, melee: 1, dx: (dest.vx + gap - u.vx) * reach, dy: (dest.vy - u.vy) * 0.6, hop: style === 'smash' ? 14 * z * z2 : 0, wtype, trail: tech, strike: style === 'smash' ? 0.42 : 0.33 };
    await wait(dur * 1000 * 0.4);
    if (style === 'smash') shake = tech ? 12 : 7;
    return 60;
  }
  if (style === 'whip') {
    u.anim = { pose, t: 0, dur, melee: 1, dx: (dest.vx - u.vx) * 0.25, dy: 0, wtype, trail: tech, strike: 0.3 };
    await wait(dur * 1000 * 0.3); const [x0, y0] = hand(u), [x1, y1] = aimAt(tgt); sfx.push({ k: 'whip', x0: x0 + (dest.vx - u.vx) * 0.25, y0, x1, y1, t: 0.3, dur: 0.3 }); await wait(120);
    return 40;
  }
  // ranged: stand and shoot / throw, the shot flies to each target
  u.anim = { pose, t: 0, dur: dur * 1.1, dx: 3 * z, dy: 0, wtype, trail: tech, strike: 0.35 };
  await wait(dur * 1000 * 0.35);
  const shots = (sweep ? hits.filter((h) => h.side === 'e') : [tgt]).filter((h, i, a) => a.indexOf(h) === i);
  for (const h of shots) { const [x0, y0] = hand(u), [x1, y1] = aimAt(h); sfx.push({ k: 'proj', style: style === 'throw' ? 'star' : wtype === 'gun' ? 'bullet' : 'arrow', arc: style === 'throw' ? 8 : 0, x0, y0, x1, y1, t: 0.2, dur: 0.2 }); }
  await wait(200);
  return 40;
}
let lastStyle = null;
// the hit effect on a monster for the last hero action
function heroHit(u, ev) {
  const x = u.vx, y = u.vy - 50 * u.k, big = lastStyle && lastStyle.tech, st = lastStyle ? lastStyle.style : 'swing';
  const k = { swing: 'slash', whip: 'slash', smash: 'crush', thrust: 'pierce', punch: 'impact', shoot: 'impact', throw: 'impact' }[st] || 'slash';
  sfx.push({ k, x, y, big, t: k === 'crush' ? 0.5 : 0.34, dur: k === 'crush' ? 0.5 : 0.34 });
  const col = ELEM_COL[ev.el]; if (col) sfx.push({ k: 'burst', x, y, col, t: 0.45, dur: 0.45 });
}
// an actor steps toward its target (party) or lunges at the party (monsters)
function lunge(u, target, pose, wtype) {
  const dx = target ? (target.vx - u.vx) * 0.35 : u.side === 'p' ? -18 * G.PX : 16 * G.PX, dy = target ? (target.vy - u.vy) * 0.2 : 0;
  u.anim = { pose, t: 0, dur: pose === 'cast' ? 0.6 : 0.5, dx: pose === 'cast' ? -4 * G.PX : dx, dy: pose === 'cast' ? 0 : dy, wtype };
}
const num = (rf, text, col, big) => { const [x, y] = posOf(rf); fx.push({ x: x + (Math.random() - 0.5) * 30, y, text, col, t: 1.1, big }); };
async function play() {
  busy = true; pickTarget = pickAlly = null; $('#panel').innerHTML = ''; partyBar();
  const log = resolveTurn(B, App.S, cmds, R); cmds = {};
  for (let li = 0; li < log.length; li++) {
    const ev = log[li], u = ev.tg && unitOf(B, ev.tg);
    switch (ev.t) {
      case 'act': {
        const name = ev.tech ? L(DB.techs[ev.tech]) : ev.spell ? L(DB.spells[ev.spell]) : ev.item ? itemName(ev.item) : ev.skill ? L(DB.eskills[ev.skill]) : t('attack');
        msg = ev.confused ? `${nm(u)}…？` : `${nm(u)}：${name}`;
        // who this action hits: the events after it, up to the next action
        const hits = [];
        for (let j = li + 1; j < log.length && log[j].t !== 'act' && log[j].t !== 'glimmer'; j++) if (log[j].tg && ['dmg', 'miss', 'heal', 'status', 'buff', 'ko'].includes(log[j].t)) { const h = unitOf(B, log[j].tg); if (!hits.includes(h)) hits.push(h); }
        if (u.side === 'p' && !ev.confused) { lastStyle = null; await wait(await heroAct(u, ev, hits)); }
        else { lastStyle = null; lunge(u, null, 'atk'); flash['e' + u.i] = 0.15; await wait(ev.skill ? 520 : 300); }
        break; }
      case 'glimmer': { const name = ev.kind === 'tech' ? L(DB.techs[ev.id]) : L(DB.spells[ev.id]); glim = { name, t: 1.3, x: u.vx }; msg = `💡 ${nm(u)}`; await wait(1200); break; }
      case 'dmg': {
        flash[(ev.tg.s === 'e' ? 'e' : 'p') + ev.tg.i] = 0.25; num(ev.tg, ev.n, ev.tg.s === 'p' ? '#ff8a8a' : ev.crit ? '#ffe070' : '#fff', ev.crit);
        if (u.side === 'e' && lastStyle) heroHit(u, ev);
        else { const col = ELEM_COL[ev.el]; sfx.push(col ? { k: 'burst', x: u.vx, y: u.vy - (u.side === 'e' ? 50 * u.k : 30 * G.PX), col, t: 0.5, dur: 0.5 } : { k: 'slash', x: u.vx, y: u.vy - (u.side === 'e' ? 50 * u.k : 30 * G.PX), t: 0.32, dur: 0.32 }); }
        if (ev.tg.s === 'p') { shake = 6; u.anim = { pose: 'hurt', t: 0, dur: 0.35, dx: 4 * G.PX, dy: 0 }; partyBar(); } await wait(260); break; }
      case 'heal': num(ev.tg, '+' + ev.n, '#7dff9a'); sfx.push({ k: 'heal', x: u.vx, y: u.vy - 30 * G.PX, t: 0.6, dur: 0.6 }); partyBar(); await wait(220); break;
      case 'miss': num(ev.tg, 'MISS', '#bbb'); await wait(200); break;
      case 'ko': if (ev.tg.s === 'e') { u.gone = true; u.fade = 1; sfx.push({ k: 'poof', x: u.vx, y: u.vy - 40 * u.k, s: Math.max(0.8, u.k), t: 0.7, dur: 0.7 }); } else { msg = `${nm(u)} ✝ LP ${ev.lp}`; partyBar(); } await wait(380); break;
      case 'lp': num(ev.tg, 'LP -1', '#ff4a4a'); partyBar(); await wait(250); break;
      case 'status': num(ev.tg, L(DB.statuses[ev.st]), DB.statuses[ev.st].col); await wait(250); break;
      case 'buff': num(ev.tg, `${t(ev.k === 'atk' ? 'str' : ev.k === 'mag' ? 'int' : ev.k)} ${ev.d > 0 ? '▲' : '▼'}`, ev.d > 0 ? '#9ad8ff' : '#ff9ad8'); await wait(200); break;
      case 'phase': msg = L({ zh: ev.say.split('|')[0], en: ev.say.split('|')[1] }); shake = 14; await wait(1500); break;
      case 'asleep': case 'stunned': case 'paralyzed': msg = `${nm(u)}：${L(DB.statuses[{ asleep: 'sleep', stunned: 'stun', paralyzed: 'paralyze' }[ev.t]])}`; await wait(350); break;
      case 'nowp': msg = `${nm(u)}：${t('nowp')}`; await wait(400); break;
      case 'nojp': msg = `${nm(u)}：${t('nojp')}`; await wait(400); break;
      case 'counter': msg = `${nm(u)}：${L({ zh: '反擊！', en: 'Counter!' })}`; await wait(400); break;
      case 'stance': msg = `${nm(u)}：${L({ zh: '架勢', en: 'Stance' })}`; await wait(300); break;
      case 'revive': partyBar(); break;
      case 'flee': msg = ev.ok ? t('fled') : L({ zh: '逃不掉！', en: 'Couldn\'t escape!' }); await wait(600); break;
      case 'noflee': msg = t('cantFlee'); await wait(500); break;
      case 'steal': num(ev.tg, `+${ev.n}G`, '#ffd76a'); await wait(250); break;
      case 'stolen': msg = L({ zh: `被偷走了 ${ev.n} G！`, en: `${ev.n} G stolen!` }); await wait(500); break;
      case 'split': { const o = B.enemies[B.enemies.length - 1]; layout(); o.fade = 1; await wait(300); break; }
      case 'wp': num(ev.tg, `WP+${ev.n}`, '#9ad8ff'); break;
    }
  }
  msg = ''; busy = false; partyBar();
  if (B.over) return end();
  who = 0; ask();
}
// ---------------------------------------------------------------- the end of a battle
async function end() {
  const S = App.S, res = B.over, out = finishBattle(B, S, R);
  for (const id of out.left) { const i = S.party.findIndex((c) => c.id === id); const [c] = S.party.splice(i, 1); c.lp = c.mlp; S.away[id] = c; toast(`${esc(L(DB.chars[id]))} ${t('left')}`); }
  if (res === 'lose' || out.dead) { finish('lose'); App.go('gameover'); return; }
  if (res === 'flee') { finish('flee'); return; }
  const p = $('#panel'); p.innerHTML = ''; const box = el('div', 'results');
  box.appendChild(el('h2', '', t('win')));
  box.appendChild(el('div', 'gold', `💰 ${out.gold} G`));
  for (const it of out.items) box.appendChild(el('div', 'loot', `🎁 ${esc(itemName(it))}`));
  const lines = {};
  for (const g of out.growth) {
    const n = L(DB.chars[g.id]); lines[n] ||= [];
    lines[n].push(g.what === 'hp' ? `${t('hpUp')} +${g.n}` : g.what === 'wp' ? `${t('wpUp')} +1` : g.what === 'jp' ? `${t('jpUp')} +1` : g.what === 'stat' ? `${t(g.stat)} +1`
      : g.what === 'wl' ? `${L(DB.weaponTypes[g.type])} ${t('lvUp')} +${g.n}` : `${L(DB.schools[g.school])} ${t('lvUp')} +${g.n}`);
  }
  for (const [n, ls] of Object.entries(lines)) box.appendChild(el('div', 'grow', `<b>${esc(n)}</b> ${ls.map(esc).join('、')}`));
  box.appendChild(btn(t('continueBtn'), () => finish('win'), 'go'));
  p.appendChild(box);
  if (auto && !B.boss) setTimeout(() => { if (App.screen === 'battle' && $('#panel .results')) finish('win'); }, 1600);
}
let prev = null;
function finish(res) { const d = done; done = null; $('#hud').innerHTML = ''; $('#panel').innerHTML = ''; if (prev && res !== 'lose') App.go(prev, { back: true }); d && d(res); }

App.screens.battle = {
  run(spec) {
    return new Promise((res) => {
      done = res; prev = App.screen; R = rng((Date.now() ^ (App.S.battles * 7919)) >>> 0);
      theme = App.S.dungeon ? DB.dungeons[App.S.dungeon.id].theme : spec.theme || 'castle';
      B = startBattle(App.S, spec.enemies || [], { boss: spec.boss }); cmds = {}; who = 0; fx = []; msg = ''; glim = null; auto = false;
      App.screen = 'battle'; $('#panel').innerHTML = ''; $('#pad').classList.add('hidden');
      layout(); partyBar(); ask();
    });
  },
  enter() {}, draw, tick,
  dbg: { B: () => B, sfx: (e) => sfx.push(e), G: () => G, animOffset },   // for tests and screenshots
  click(x, y) {
    if (!G) return; const vx = x, vy = y;
    if (pickTarget) for (const e of B.enemies) if (!e.ko && Math.abs(vx - e.vx) < 60 * e.k && vy < e.vy + 10 && vy > e.vy - 130 * e.k) { pickTarget(e.i); return; }
    if (pickAlly) for (const u of B.party) if (Math.abs(vx - u.vx) < 16 * G.PX && vy < u.vy + 6 && vy > u.vy - 64 * G.PX) { pickAlly(u.i); return; }
  },
  resize() { if (B) { layout(); partyBar(); } },
  key(k) { if (k === 'cancel' && !busy && (pickTarget || pickAlly)) { pickTarget = pickAlly = null; menu(); } },
};
export { derived };
