// The shared UI core: the game state, the canvas, screen switching, dialogue boxes, notices, saving, and the bridge
// that lets event scripts talk to the screens. Screens register themselves in App.screens.
import { DB } from '../data/index.js';
import { toSave, fromSave, reveal as revealPlace, rest } from '../engine/state.js';
import { runEvent, arrivalEvents } from '../engine/events.js';
import { L, t, getLang } from './i18n.js';
import { portraitHD as portrait } from './hd.js';

export const $ = (s) => document.querySelector(s);
export function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export function btn(label, fn, cls = '') { const b = el('button', cls, label); b.onclick = (e) => { e.stopPropagation(); fn(e); }; return b; }

const SAVE = 'efs_save';
export const App = {
  S: null, screen: null, screens: {}, cv: null, cx: null, w: 960, h: 540, dpr: 1, busy: false, cloud: null, time: 0,
  go(name, arg) { if (this.screen && this.screens[this.screen].leave) this.screens[this.screen].leave(); this.screen = name; $('#panel').innerHTML = ''; $('#hud').innerHTML = ''; $('#pad').classList.add('hidden'); this.screens[name].enter(arg); },
  // ---------------------------------------------------------------- saving (local + the site's cloud saves)
  save() { try { localStorage.setItem(SAVE, JSON.stringify(toSave(this.S))); } catch (e) { /* storage blocked */ } if (this.cloud) this.cloud.touch('eightfold-saga', SAVE); },
  loadSave() { try { const d = JSON.parse(localStorage.getItem(SAVE)); return d && d.hero ? d : null; } catch (e) { return null; } },
  continueGame() { const d = this.loadSave(); if (!d) return false; this.S = fromSave(d); this.resume(); return true; },
  resume() { const S = this.S; if (S.dungeon) this.go('dungeon', { resume: true }); else this.go(DB.locations[S.loc].kind === 'town' ? 'town' : 'world'); },
};

// ---------------------------------------------------------------- the canvas fills the window
export function resize() {
  // the canvas fills its box (CSS); its pixel buffer follows whatever size that box really has
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = App.cv.clientWidth || window.innerWidth, h = App.cv.clientHeight || window.innerHeight;
  App.cv.width = Math.round(w * dpr); App.cv.height = Math.round(h * dpr);
  App.w = w; App.h = h; App.dpr = dpr; App.cx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ---------------------------------------------------------------- dialogue
let sayResolve = null;
export function say(who, text) {
  return new Promise((res) => {
    const d = $('#dialog'); d.classList.remove('hidden'); d.innerHTML = '';
    if (who !== 'nar' && DB.chars[who]) { const c = el('canvas', 'face'); c.width = c.height = 128; portrait(c.getContext('2d'), who, 0, 0, 2); d.appendChild(c); }
    const box = el('div', 'dbox');
    if (who !== 'nar') box.appendChild(el('div', 'who', esc(DB.chars[who] ? L(DB.chars[who]) : L(typeof who === 'string' && who.includes('|') ? { zh: who.split('|')[0], en: who.split('|')[1] } : who))));
    box.appendChild(el('div', 'text' + (who === 'nar' ? ' nar' : ''), esc(L(text))));
    box.appendChild(el('div', 'more', '▼'));
    d.appendChild(box);
    sayResolve = () => { d.classList.add('hidden'); sayResolve = null; res(); };
    d.onclick = () => sayResolve && sayResolve();
  });
}
export function advanceDialog() { if (sayResolve) { sayResolve(); return true; } return false; }
export function choice(prompt, options) {
  return new Promise((res) => {
    const c = $('#choices'); c.classList.remove('hidden'); c.innerHTML = '';
    c.appendChild(el('div', 'prompt', esc(L(prompt))));
    options.forEach((o, i) => c.appendChild(btn(esc(L(o)), () => { c.classList.add('hidden'); res(i); })));
  });
}
// ---------------------------------------------------------------- notices
export function toast(html, cls = '') {
  const tt = el('div', 'toast ' + cls, html); $('#toasts').appendChild(tt);
  setTimeout(() => tt.classList.add('out'), 2600); setTimeout(() => tt.remove(), 3200);
}
export const itemName = (id) => { if (id.startsWith('gold:')) return `${id.slice(5)} G`; const it = DB.weapons[id] || DB.armor[id] || DB.items[id]; return it ? L(it) : id; };
export function note(n) {
  if (n.k === 'got') toast(`${t('got')} <b>${esc(itemName(n.item))}</b>${n.n > 1 ? ' ×' + n.n : ''}`);
  if (n.k === 'gold') toast(`${t('got')} <b>${n.n} G</b>`);
  if (n.k === 'join') toast(`<b>${esc(L(DB.chars[n.id]))}</b> ${t('joined')}`, 'big');
  if (n.k === 'full') toast(`${esc(L(DB.chars[n.id]))}：${t('partyFullJoin')}`);
  if (n.k === 'reveal') toast(`🗺 ${t('reveal')}：<b>${esc(L(DB.locations[n.id]))}</b>`);
  if (n.k === 'learn') toast(`${esc(L(DB.chars[n.id]))} ${t('learnedSpell')} <b>${esc(L(DB.spells[n.spell]))}</b>`);
}
// ---------------------------------------------------------------- the bridge for event scripts
export const evUI = {
  say, choice, note,
  battle: (spec) => App.screens.battle.run(spec),
  ending: (kind) => App.screens.ending.run(kind),
};
export async function event(id) { App.busy = true; try { return await runEvent(App.S, id, evUI); } finally { App.busy = false; } }
// arriving somewhere: run its events, then show it
export async function arrive(id) {
  const S = App.S; S.loc = id; revealPlace(S, id);
  const l = DB.locations[id];
  if (l.kind === 'town') { S.lastTown = id; App.go('town'); }
  for (const ev of arrivalEvents(S, id)) { const ctx = await event(ev); if (ctx && ctx.stop) return; if (App.S !== S) return; }
  if (l.kind === 'dungeon') App.go('dungeon', { id: l.dungeon });
  else if (App.screen === 'town') App.screens.town.enter();
}
// a dungeon boss has fallen: the Fate Stone, the clear flag, and the dungeon's story
export async function bossCleared(dungeonId) {
  const S = App.S, d = DB.dungeons[dungeonId];
  S.cleared[dungeonId] = 1;
  toast(`★ ${esc(L(d))} ${t('cleared')}`, 'big');
  if (d.stone && !S.stones.includes(d.stone)) { S.stones.push(d.stone); toast(`💎 ${t('stoneGot')}：<b>${esc(L(DB.stones[d.stone]))}</b>`, 'big stone'); }
  if (DB.events[dungeonId + '_win']) await event(dungeonId + '_win');
}
export { rest, getLang };
