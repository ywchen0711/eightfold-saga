// The battle screen, laid out like Romancing SaGa: monsters on the left, the party standing on the right facing
// them, drawn as 16-bit pixel sprites. A status window and a command window sit at the bottom. The round's log is
// played back with lunges, slashes, damage numbers and glimmer flashes. run(spec) resolves to win/lose/flee.
import { DB } from '../data/index.js';
import { rng, weaponsOf, techsFor, derived } from '../engine/state.js';
import { startBattle, resolveTurn, autoCommand, finishBattle, unitOf } from '../engine/battle.js';
import { App, $, el, btn, esc, toast, itemName } from './app.js';
import { L, t } from './i18n.js';
import { monster, battler, pixelBg } from './art.js';
import { beginLow, endLow, outlined } from './pixel.js';

let B = null, R = null, done = null, cmds = {}, who = 0, fx = [], sfx = [], msg = '', flash = {}, shake = 0, theme = 'cave', auto = false, glim = null, G = null;
const living = (list) => list.filter((u) => !u.ko && u.hp > 0);
const nm = (u) => (u.side === 'p' ? L(DB.chars[u.c.id]) : L(u));
const narrow = () => App.w <= 700;
// the scene's height on screen: all of it on wide screens (windows float over the ground), the top part on phones
const sceneH = () => (narrow() ? Math.round(App.h * 0.44) : App.h);
const VH = 240;

// where everyone stands, in game pixels (feet positions)
function layout() {
  const s = sceneH() / VH, W = App.w / s, H = VH, wide = !narrow();
  const yA = H * (wide ? 0.5 : 0.68), yB = H * (wide ? 0.64 : 0.9);
  G = { s, W, H, yA, yB };
  const n = B.enemies.length, unit = H * 0.22 / 90;
  const left = W * 0.04, right = W * (wide ? 0.55 : 0.6);
  B.enemies.forEach((e, i) => {
    if (e.boss) { e.vx = left + (right - left) * 0.48; e.vy = yB; e.k = unit * e.size * 0.78; return; }
    const two = n > 3, row = two ? (i < Math.ceil(n / 2) ? 0 : 1) : 1, inRow = two ? (row === 0 ? Math.ceil(n / 2) : n - Math.ceil(n / 2)) : n, j = two && row === 1 ? i - Math.ceil(n / 2) : i;
    e.vx = left + (right - left) * (j + 0.5) / inRow + (row === 0 ? -W * 0.03 : W * 0.03); e.vy = (row ? yB : yA) - (e.fly ? H * 0.06 : 0); e.k = unit * e.size * (two ? 0.85 : 1);
  });
  // a minion beside a boss stands to the front
  if (B.enemies[0] && B.enemies[0].boss) B.enemies.slice(1).forEach((e, i) => { e.vx = left + (right - left) * (i % 2 ? 0.9 : 0.1); e.vy = i < 2 ? yB : yA; e.k = unit * e.size * 0.8; });
  // the party: a slanted column, front-left to back-right (the SaGa formation)
  const m = B.party.length;
  B.party.forEach((u, i) => { const f = m > 1 ? i / (m - 1) : 0.5; u.vx = W * (wide ? 0.66 : 0.68) + W * (wide ? 0.2 : 0.24) * f + (i % 2 ? W * 0.02 : 0); u.vy = yA - H * 0.02 + (yB - yA + H * 0.04) * f; });
}
// ---------------------------------------------------------------- drawing
function draw() {
  if (App.screen !== 'battle' || !G) return;
  App.cx.fillStyle = '#05050c'; App.cx.fillRect(0, 0, App.w, App.h);
  const sh = sceneH(), f = beginLow(VH * (App.h / sh)), c = f.c;
  c.save(); if (shake > 0) c.translate(Math.round((Math.random() - 0.5) * shake), 0);
  pixelBg(c, theme, G.W, VH, App.time);
  // everyone sorted by depth
  const all = [...B.enemies.filter((e) => !(e.ko && !(e.fade > 0))), ...B.party];
  all.sort((a, b) => a.vy - b.vy);
  for (const u of all) {
    const a = u.anim; let ox = 0, oy = 0;
    if (a) { const p = Math.min(1, a.t / a.dur), out = p < 0.5 ? p * 2 : (1 - p) * 2; ox = (a.dx || 0) * out; oy = (a.dy || 0) * out; }
    if (u.side === 'e') {
      if (u.ko) { u.fade -= 0.035; if (u.fade <= 0) continue; c.globalAlpha = Math.max(0, u.fade); }
      const k = u.k, w = 130 * k, h = 140 * k;
      outlined(c, u.vx + ox - w / 2, u.vy + oy - h + 8 * k, w, h, (tc) => monster(tc, u.art, u.hue, w / 2, h - 8 * k, k, App.time + u.i, { flip: true, flash: flash['e' + u.i] > 0 }));
      c.globalAlpha = 1;
      if (pickTarget && !u.ko) { c.strokeStyle = '#ffe070'; c.lineWidth = 1; c.strokeRect(Math.round(u.vx - w * 0.4) + 0.5, Math.round(u.vy - h * 0.8) + 0.5, Math.round(w * 0.8), Math.round(h * 0.82)); }
    } else {
      const ws = weaponsOf(u.c), wtype = (a && a.wtype) || ws[0].type;
      const pose = u.ko ? 'ko' : a ? a.pose : B.over === 'win' ? 'win' : u.hp < u.d.mhp * 0.25 ? 'hurt' : u.defending ? 'def' : pickAlly || who === u.i ? 'step' : 'idle';
      if (flash['p' + u.i] > 0 && Math.floor(App.time * 30) % 2) c.globalAlpha = 0.4;
      outlined(c, u.vx + ox - 24, u.vy + oy - 52, 48, 56, (tc) => battler(tc, u.c.id, 24, 52, pose, App.time + u.i, wtype, a ? a.t / a.dur : 0));
      c.globalAlpha = 1;
      if (who === u.i && !busy && !B.over) { c.fillStyle = '#ffe070'; c.fillRect(Math.round(u.vx) - 1, Math.round(u.vy) - 50 + (Math.floor(App.time * 4) % 2), 3, 3); }
    }
  }
  // effects: slashes, bursts, sparkles
  for (const e of sfx) {
    const p = 1 - e.t / e.dur; c.globalAlpha = 1 - p * 0.8;
    if (e.k === 'slash') { c.strokeStyle = '#fff8d0'; c.lineWidth = 2; c.beginPath(); c.moveTo(e.x - 14 + p * 6, e.y - 16); c.lineTo(e.x + 14 - p * 6, e.y + 10); c.stroke(); c.strokeStyle = '#ffd040'; c.lineWidth = 1; c.beginPath(); c.moveTo(e.x - 10, e.y - 14); c.lineTo(e.x + 12, e.y + 8); c.stroke(); }
    if (e.k === 'burst') for (let i = 0; i < 8; i++) { const ang = i / 8 * 6.283, r = 4 + p * 18; c.fillStyle = e.col; c.fillRect(Math.round(e.x + Math.cos(ang) * r) - 1, Math.round(e.y + Math.sin(ang) * r * 0.7) - 1, 3, 3); }
    if (e.k === 'heal') for (let i = 0; i < 5; i++) { c.fillStyle = '#9affb0'; c.fillRect(Math.round(e.x - 8 + i * 4), Math.round(e.y - p * 20 - (i % 2) * 6), 2, 2); }
    c.globalAlpha = 1;
  }
  c.restore();
  endLow(f);
  // text on top at full resolution: damage numbers, the line of the round, glimmers
  const X = App.cx, s = G.s, w = App.w;
  for (const n of fx) { X.globalAlpha = Math.min(1, n.t * 2); X.font = `bold ${n.big ? 28 : 20}px sans-serif`; X.textAlign = 'center'; X.lineWidth = 4; X.strokeStyle = '#000'; X.strokeText(n.text, n.x, n.y); X.fillStyle = n.col; X.fillText(n.text, n.x, n.y); }
  X.globalAlpha = 1; X.textAlign = 'left';
  for (const e of B.enemies) if (!e.ko && Object.keys(e.st).length) { X.font = '12px sans-serif'; X.fillStyle = '#ffe070'; X.fillText(Object.keys(e.st).map((k) => L(DB.statuses[k])).join(' '), e.vx * s - 24, e.vy * s + 14); }
  if (msg) { X.font = 'bold 17px sans-serif'; const tw = X.measureText(msg).width; X.fillStyle = 'rgba(16,24,96,.92)'; X.fillRect(w / 2 - tw / 2 - 16, 10, tw + 32, 32); X.strokeStyle = '#e8e8f8'; X.lineWidth = 2; X.strokeRect(w / 2 - tw / 2 - 16, 10, tw + 32, 32); X.fillStyle = '#fff'; X.textAlign = 'center'; X.fillText(msg, w / 2, 32); X.textAlign = 'left'; }
  if (glim) { const a = Math.min(1, glim.t * 2), cy = sceneH() * 0.3; X.globalAlpha = a; X.fillStyle = 'rgba(255,240,150,.22)'; X.fillRect(0, 0, w, sceneH());
    X.font = 'bold 48px sans-serif'; X.textAlign = 'center'; X.fillText('💡', glim.x || w / 2, cy); X.font = 'bold 28px sans-serif'; X.lineWidth = 6; X.strokeStyle = '#3a2a00';
    X.strokeText(`${t('glimmer')} ${glim.name}`, w / 2, cy + 46); X.fillStyle = '#fff6c0'; X.fillText(`${t('glimmer')} ${glim.name}`, w / 2, cy + 46); X.textAlign = 'left'; X.globalAlpha = 1; }
}
function tick(dt) {
  for (const f of fx) { f.t -= dt; f.y -= 30 * dt; } fx = fx.filter((f) => f.t > 0);
  for (const e of sfx) e.t -= dt; sfx = sfx.filter((e) => e.t > 0);
  if (B) for (const u of [...B.party, ...B.enemies]) if (u.anim) { u.anim.t += dt; if (u.anim.t >= u.anim.dur) u.anim = null; }
  for (const k in flash) flash[k] -= dt; if (shake > 0) shake -= dt * 30; if (glim) { glim.t -= dt; if (glim.t <= 0) glim = null; }
}
// ---------------------------------------------------------------- the status window (SaGa style: name, HP, WP, JP, LP)
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
  return u.side === 'e' ? [u.vx * s, (u.vy - 70 * u.k) * s] : [u.vx * s, (u.vy - 40) * s];
}
const ELEM_COL = { fire: '#ff7a3a', water: '#6ab8ff', wind: '#8affb0', earth: '#d8a85a', light: '#fff4a0', dark: '#b07aff', star: '#a8e0ff', spirit: '#ff9ad8', poison: '#7adf5a' };
// an actor steps toward its target (party) or lunges at the party (monsters)
function lunge(u, target, pose, wtype) {
  const dx = target ? (target.vx - u.vx) * 0.35 : u.side === 'p' ? -18 : 16, dy = target ? (target.vy - u.vy) * 0.2 : 0;
  u.anim = { pose, t: 0, dur: pose === 'cast' ? 0.6 : 0.5, dx: pose === 'cast' ? -4 : dx, dy: pose === 'cast' ? 0 : dy, wtype };
}
const num = (rf, text, col, big) => { const [x, y] = posOf(rf); fx.push({ x: x + (Math.random() - 0.5) * 30, y, text, col, t: 1.1, big }); };
async function play() {
  busy = true; pickTarget = pickAlly = null; $('#panel').innerHTML = ''; partyBar();
  const log = resolveTurn(B, App.S, cmds, R); cmds = {};
  for (const ev of log) {
    const u = ev.tg && unitOf(B, ev.tg);
    switch (ev.t) {
      case 'act': {
        const name = ev.tech ? L(DB.techs[ev.tech]) : ev.spell ? L(DB.spells[ev.spell]) : ev.item ? itemName(ev.item) : ev.skill ? L(DB.eskills[ev.skill]) : t('attack');
        const tgt = living(u.side === 'p' ? B.enemies : B.party)[0];
        if (u.side === 'p') { const wtype = ev.tech ? DB.techs[ev.tech].type : (DB.weapons[ev.w] || { type: 'fist' }).type; lunge(u, ev.spell || ev.item ? null : tgt, ev.spell || ev.item ? 'cast' : 'atk', wtype); }
        else { lunge(u, null, 'atk'); flash['e' + u.i] = 0.15; }
        msg = ev.confused ? `${nm(u)}…？` : `${nm(u)}：${name}`; await wait(ev.tech || ev.spell || ev.skill ? 520 : 300); break; }
      case 'glimmer': { const name = ev.kind === 'tech' ? L(DB.techs[ev.id]) : L(DB.spells[ev.id]); glim = { name, t: 1.3, x: u.vx * G.s }; msg = `💡 ${nm(u)}`; await wait(1200); break; }
      case 'dmg': {
        flash[(ev.tg.s === 'e' ? 'e' : 'p') + ev.tg.i] = 0.25; num(ev.tg, ev.n, ev.tg.s === 'p' ? '#ff8a8a' : ev.crit ? '#ffe070' : '#fff', ev.crit);
        const col = ELEM_COL[ev.el]; sfx.push(col ? { k: 'burst', x: u.vx, y: u.vy - (u.side === 'e' ? 50 * u.k : 22), col, t: 0.45, dur: 0.45 } : { k: 'slash', x: u.vx, y: u.vy - (u.side === 'e' ? 50 * u.k : 22), t: 0.3, dur: 0.3 });
        if (ev.tg.s === 'p') { shake = 6; u.anim = { pose: 'hurt', t: 0, dur: 0.35, dx: 6, dy: 0 }; partyBar(); } await wait(260); break; }
      case 'heal': num(ev.tg, '+' + ev.n, '#7dff9a'); sfx.push({ k: 'heal', x: u.vx, y: u.vy - 20, t: 0.6, dur: 0.6 }); partyBar(); await wait(220); break;
      case 'miss': num(ev.tg, 'MISS', '#bbb'); await wait(200); break;
      case 'ko': if (ev.tg.s === 'e') { u.fade = 1; } else { msg = `${nm(u)} ✝ LP ${ev.lp}`; partyBar(); } await wait(380); break;
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
  click(x, y) {
    if (!G) return; const vx = x / G.s, vy = y / G.s;
    if (pickTarget) for (const e of B.enemies) if (!e.ko && Math.abs(vx - e.vx) < 55 * e.k && vy < e.vy + 6 && vy > e.vy - 120 * e.k) { pickTarget(e.i); return; }
    if (pickAlly) for (const u of B.party) if (Math.abs(vx - u.vx) < 14 && vy < u.vy + 4 && vy > u.vy - 40) { pickAlly(u.i); return; }
  },
  resize() { if (B) { layout(); partyBar(); } },
  key(k) { if (k === 'cancel' && !busy && (pickTarget || pickAlly)) { pickTarget = pickAlly = null; menu(); } },
};
export { derived };
