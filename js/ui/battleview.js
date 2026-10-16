// The battle screen: enemies on the canvas, the party as cards at the bottom, a command menu per member, then the
// round's log played back with damage numbers, knock-outs and glimmer flashes. run(spec) resolves to win/lose/flee.
import { DB } from '../data/index.js';
import { rng, weaponsOf, techsFor, derived } from '../engine/state.js';
import { startBattle, resolveTurn, autoCommand, finishBattle, unitOf } from '../engine/battle.js';
import { App, $, el, btn, esc, toast, itemName } from './app.js';
import { L, t } from './i18n.js';
import { monster, battleBg, portrait } from './art.js';

let B = null, R = null, done = null, cmds = {}, who = 0, fx = [], msg = '', flash = {}, shake = 0, theme = 'cave', auto = false, glim = null;
const living = (list) => list.filter((u) => !u.ko && u.hp > 0);
const nm = (u) => (u.side === 'p' ? L(DB.chars[u.c.id]) : L(u));
const BAR = () => Math.min(150, Math.max(104, App.h * 0.24));

function layout() {
  // on narrow screens the command menu sits above the party, so the monsters stand higher up
  const n = B.enemies.length, top = App.w > 700 ? App.h - BAR() : App.h - BAR() - Math.min(App.h * 0.4, 330), k = Math.max(0.45, Math.min(1.3, Math.min(App.w / 900, top / 420)));
  B.enemies.forEach((e, i) => {
    const col = n <= 4 ? i : i % 4, row = n <= 4 ? 0 : Math.floor(i / 4), per = n <= 4 ? n : Math.min(4, n - row * 4);
    const aw = App.w > 700 ? App.w - 350 : App.w;   // keep clear of the command menu on wide screens
    e.px = aw * (col + 1) / (per + 1); e.py = top * (row ? 0.48 : 0.86) - (e.fly ? 30 * k : 0); e.k = k * (e.boss ? e.size * 0.62 : e.size);
  });
}
function draw() {
  if (App.screen !== 'battle') return;
  const c = App.cx, w = App.w, h = App.h, top = h - BAR();
  c.save(); if (shake > 0) c.translate((Math.random() - 0.5) * shake, 0);
  c.fillStyle = '#08060e'; c.fillRect(0, 0, w, h);
  battleBg(c, theme, w, w > 700 ? top : (top - Math.min(h * 0.4, 330)) * 1.25, App.time);
  for (const e of [...B.enemies].sort((a, b) => a.py - b.py)) {
    if (e.ko && !e.fade) continue;
    if (e.ko) { e.fade -= 0.04; if (e.fade <= 0) { e.fade = 0; continue; } c.globalAlpha = e.fade; }
    monster(c, e.art, e.hue, e.px, e.py, e.k, App.time + e.i, { flash: flash['e' + e.i] > 0 });
    c.globalAlpha = 1;
    if (pickTarget && !e.ko) { c.strokeStyle = '#ffe070'; c.lineWidth = 2; c.strokeRect(e.px - 46 * e.k, e.py - 100 * e.k, 92 * e.k, 104 * e.k); }
    if (Object.keys(e.st).length) { c.font = '13px sans-serif'; c.fillStyle = '#ffe070'; c.fillText(Object.keys(e.st).map((s) => L(DB.statuses[s])).join(' '), e.px - 30, e.py + 16); }
  }
  for (const f of fx) { c.globalAlpha = Math.min(1, f.t * 2); c.font = `bold ${f.big ? 30 : 22}px sans-serif`; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = '#000'; c.strokeText(f.text, f.x, f.y); c.fillStyle = f.col; c.fillText(f.text, f.x, f.y); }
  c.globalAlpha = 1; c.textAlign = 'left';
  if (msg) { c.font = 'bold 18px sans-serif'; const tw = c.measureText(msg).width; c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(w / 2 - tw / 2 - 16, 12, tw + 32, 34); c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(msg, w / 2, 36); c.textAlign = 'left'; }
  if (glim) { const a = Math.min(1, glim.t * 2); c.globalAlpha = a; c.fillStyle = 'rgba(255,240,150,.25)'; c.fillRect(0, 0, w, top);
    c.font = 'bold 54px sans-serif'; c.textAlign = 'center'; c.fillText('💡', w / 2, top * 0.38); c.font = 'bold 30px sans-serif'; c.lineWidth = 6; c.strokeStyle = '#3a2a00';
    c.strokeText(`${t('glimmer')} ${glim.name}`, w / 2, top * 0.38 + 50); c.fillStyle = '#fff6c0'; c.fillText(`${t('glimmer')} ${glim.name}`, w / 2, top * 0.38 + 50); c.textAlign = 'left'; c.globalAlpha = 1; }
  c.restore();
}
function tick(dt) {
  for (const f of fx) { f.t -= dt; f.y -= 30 * dt; } fx = fx.filter((f) => f.t > 0);
  for (const k in flash) flash[k] -= dt; if (shake > 0) shake -= dt * 30; if (glim) { glim.t -= dt; if (glim.t <= 0) glim = null; }
}
// ---------------------------------------------------------------- the party bar
function partyBar() {
  const hud = $('#hud'); hud.innerHTML = ''; const bar = el('div', 'pbar'); bar.style.height = BAR() + 'px';
  for (const u of B.party) {
    const c = u.c, d = u.d, card = el('div', 'pcard' + (u.ko ? ' ko' : '') + (who === u.i && !busy ? ' cur' : '') + (flash['p' + u.i] > 0 ? ' hit' : ''));
    const cv = el('canvas', 'pf'); cv.width = cv.height = 64; portrait(cv.getContext('2d'), c.id, 0, 0, 1); card.appendChild(cv);
    const st = Object.keys(u.st).map((s) => `<span style="color:${DB.statuses[s].col}">${L(DB.statuses[s])}</span>`).join(' ');
    card.appendChild(el('div', 'pinfo', `<div class="pn">${esc(L(DB.chars[c.id]))} <span class="lp">LP ${c.lp}</span></div>
      <div class="bar hp"><i style="width:${Math.max(0, u.hp / d.mhp * 100)}%"></i><span>${Math.max(0, Math.round(u.hp))}/${d.mhp}</span></div>
      <div class="sm">WP ${c.wp}/${c.mwp} · JP ${c.jp}/${c.mjp}</div><div class="sm">${st}</div>`));
    card.onclick = () => { if (pickAlly) pickAlly(u.i); };
    bar.appendChild(card);
  }
  hud.appendChild(bar);
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
  if (rf.s === 'e') { const e = B.enemies[rf.i]; return [e.px, e.py - 70 * e.k]; }
  const cards = document.querySelectorAll('.pcard'), r = cards[rf.i] && cards[rf.i].getBoundingClientRect();
  return r ? [r.left + r.width / 2, r.top - 8] : [App.w / 2, App.h - 60];
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
        msg = ev.confused ? `${nm(u)}…？` : `${nm(u)}：${name}`; await wait(ev.tech || ev.spell || ev.skill ? 520 : 300); break; }
      case 'glimmer': { const name = ev.kind === 'tech' ? L(DB.techs[ev.id]) : L(DB.spells[ev.id]); glim = { name, t: 1.3 }; msg = `💡 ${nm(u)}`; await wait(1200); break; }
      case 'dmg': flash[(ev.tg.s === 'e' ? 'e' : 'p') + ev.tg.i] = 0.25; num(ev.tg, ev.n, ev.tg.s === 'p' ? '#ff8a8a' : ev.crit ? '#ffe070' : '#fff', ev.crit); if (ev.tg.s === 'p') { shake = 8; partyBar(); } await wait(260); break;
      case 'heal': num(ev.tg, '+' + ev.n, '#7dff9a'); partyBar(); await wait(220); break;
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
      case 'split': layout(); await wait(300); break;
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
  click(x, y) { if (!pickTarget) return; for (const e of B.enemies) if (!e.ko && Math.abs(x - e.px) < 50 * e.k && y < e.py + 10 && y > e.py - 110 * e.k) { pickTarget(e.i); return; } },
  resize() { if (B) { layout(); partyBar(); } },
  key(k) { if (k === 'cancel' && !busy && (pickTarget || pickAlly)) { pickTarget = pickAlly = null; menu(); } },
};
export { derived };
