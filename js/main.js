// Boot: title screen, choosing a hero, game over, the ending, the frame loop and input.
import { DB } from './data/index.js';
import { newGame, rest, derived, fromSave } from './engine/state.js';
import { App, $, el, btn, esc, resize, advanceDialog, event, toast } from './ui/app.js';
import { L, t, getLang, setLang } from './ui/i18n.js';
import { H } from './ui/art.js';
import { portraitHD as portrait, diorama, particles, bloom } from './ui/hd.js';
import './ui/battleview.js';
import './ui/dungeonview.js';
import './ui/places.js';
import './ui/menu.js';

App.cv = $('#cv'); App.cx = App.cv.getContext('2d');
try { App.fast = !!localStorage.getItem('efs_fast'); } catch (e) { /* */ }
resize(); addEventListener('resize', () => { resize(); const s = App.screens[App.screen]; if (s && s.resize) s.resize(); });
App.applyLang = () => { document.documentElement.lang = getLang() === 'zh' ? 'zh-Hant' : 'en'; document.title = `${t('title')} ${t('subtitle')}`; };
App.applyLang();

// ---------------------------------------------------------------- title
const HEROES = Object.values(DB.chars).filter((c) => c.hero);
App.screens.title = {
  enter() {
    App.S = null; const p = $('#panel'); p.innerHTML = '';
    const box = el('div', 'title');
    box.appendChild(el('div', 'logo', `<div class="l1">${t('title')}</div><div class="l2">${t('subtitle')}</div><div class="l3">Eightfold Saga · Rise of the Evil God</div>`));
    const m = el('div', 'tmenu');
    const has = App.loadSave();
    const cb = btn(t('cont'), () => App.continueGame(), 'go'); cb.disabled = !has; m.appendChild(cb);
    if (has) m.appendChild(el('div', 'sm', `${esc(L(DB.chars[has.hero]))} · ${esc(L(DB.locations[has.loc] || { zh: '', en: '' }))} · ${t('br')} ${has.br} · 💎${(has.stones || []).length}`));
    m.appendChild(btn(t('newGame'), () => App.go('choose')));
    m.appendChild(btn(`🌐 ${getLang() === 'zh' ? 'English' : '中文'}`, () => { setLang(getLang() === 'zh' ? 'en' : 'zh'); App.applyLang(); App.go('title'); }, 'small'));
    box.appendChild(m); p.appendChild(box);
  },
  draw() { const c = App.cx, w = App.w, h = App.h;
    c.drawImage(diorama('castle', Math.round(w), Math.round(h), 0.62), 0, 0); particles(c, 'tower', w, h, App.time, 60);
    // the eight stars of the heroes circling the title
    for (let i = 0; i < 8; i++) { const a = App.time * 0.12 + i / 8 * Math.PI * 2, r = Math.min(w, h) * 0.34, x = w / 2 + Math.cos(a) * r, y = h * 0.36 + Math.sin(a) * r * 0.35; bloom(c, x, y, 26, H(i * 45, 70, 70, 0.9), 0.8); c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 1.8, 0, 7); c.fill(); } },
};
// ---------------------------------------------------------------- choosing a hero
let pickH = null;
App.screens.choose = {
  enter() {
    const p = $('#panel'); p.innerHTML = '';
    const box = el('div', 'win choose'); const head = el('div', 'whead', `<h2>${t('chooseHero')}</h2>`); head.appendChild(btn('✕', () => App.go('title'), 'x')); box.appendChild(head);
    const grid = el('div', 'heroes');
    for (const c of HEROES) {
      const card = el('div', 'hcard' + (pickH === c.id ? ' on' : '')); const cv = el('canvas'); cv.width = cv.height = 128; portrait(cv.getContext('2d'), c.id, 0, 0, 2); card.appendChild(cv);
      card.appendChild(el('div', 'hn', `<b>${esc(L(c))}</b><small>${esc(L(c.title))}</small><small>${Object.keys(c.wl).map((w) => DB.weaponTypes[w].icon + L(DB.weaponTypes[w])).join(' ')}</small>`));
      card.onclick = () => { pickH = c.id; App.go('choose'); }; grid.appendChild(card);
    }
    box.appendChild(grid);
    if (pickH) {
      const c = DB.chars[pickH], s = c.stats, det = el('div', 'hdetail');
      det.appendChild(el('p', '', esc(L(c.bio))));
      det.appendChild(el('p', 'sm', `HP ${s.hp} · LP ${s.lp} · WP ${s.wp} · JP ${s.jp} · ${['str', 'dex', 'agi', 'int', 'wil', 'con'].map((k) => `${t(k)} ${s[k]}`).join(' · ')}`));
      det.appendChild(el('p', 'sm', `🏠 ${esc(L(DB.locations[c.home]))}${Object.keys(c.ml).length ? ' · ' + Object.keys(c.ml).map((k) => DB.schools[k].icon + L(DB.schools[k])).join(' ') : ''}`));
      det.appendChild(btn(t('start'), () => start(pickH), 'go'));
      box.appendChild(det);
    }
    p.appendChild(box);
  },
  draw() { App.screens.title.draw(); },
};
async function start(hero) {
  App.S = newGame(hero, Date.now() >>> 0); pickH = null;
  App.go('town');
  await event(DB.chars[hero].prologue);
  if (App.screen === 'town') App.screens.town.enter();
  App.save();
}
// ---------------------------------------------------------------- game over
App.screens.gameover = {
  enter() {
    const S = App.S, p = $('#panel'); p.innerHTML = ''; const box = el('div', 'win over');
    const heroDead = !S.party.some((c) => c.id === S.hero && c.lp > 0);
    box.appendChild(el('h1', '', t('gameOver'))); if (heroDead) box.appendChild(el('p', '', t('heroDead')));
    if (App.loadSave()) box.appendChild(btn(t('retrySave'), () => App.continueGame(), 'go'));
    if (!heroDead && S.lastTown) box.appendChild(btn(t('backTown'), () => { S.gold = Math.floor(S.gold / 2); S.dungeon = null; for (const c of S.party) c.hp = derived(c, S).mhp; S.loc = S.lastTown; App.go('town'); }));
    box.appendChild(btn(t('toTitle'), () => App.go('title')));
    p.appendChild(box);
  },
  draw() { App.cx.fillStyle = '#1a0408'; App.cx.fillRect(0, 0, App.w, App.h); },
};
// ---------------------------------------------------------------- the ending (you can keep playing afterwards)
let endDone = null;
App.screens.ending = {
  run(kind) { return new Promise((res) => { endDone = res; App.go('ending', kind); }); },
  enter(kind) {
    const S = App.S, p = $('#panel'); p.innerHTML = ''; const box = el('div', 'win ending');
    box.appendChild(el('h1', '', t('ending')));
    const lines = [L({ zh: '邪神索拉克斯消散了，十顆命運之石的光芒灑遍大陸。', en: 'Sorrax faded away, and the light of the ten Fate Stones fell across the land.' }),
      L({ zh: `${L(DB.chars[S.hero])}的名字，成為了新的傳說。`, en: `${L(DB.chars[S.hero])}'s name became a new legend.` }),
      L({ zh: `命運之石 ${S.stones.length}/10 · 戰鬥 ${S.battles} 次 · 閃現 ${S.glimmers || 0} 次`, en: `Fate Stones ${S.stones.length}/10 · ${S.battles} battles · ${S.glimmers || 0} glimmers` })];
    for (const l of lines) box.appendChild(el('p', '', esc(l)));
    box.appendChild(el('div', 'party', S.party.map((c) => esc(L(DB.chars[c.id]))).join(' · ')));
    box.appendChild(btn(t('keepPlaying'), () => { S.dungeon = null; App.save(); App.go('world'); const d = endDone; endDone = null; d && d(); }, 'go'));
    box.appendChild(btn(t('toTitle'), () => { App.save(); App.go('title'); const d = endDone; endDone = null; d && d(); }));
    p.appendChild(box); App.save();
  },
  draw() { App.screens.title.draw(); },
};

// ---------------------------------------------------------------- input
const input = { up: 0, down: 0, left: 0, right: 0 };
const KEYS = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
addEventListener('keydown', (e) => {
  if (KEYS[e.code]) { input[KEYS[e.code]] = 1; if (App.screen === 'dungeon') e.preventDefault(); }
  if (['Enter', 'Space', 'KeyZ'].includes(e.code) && advanceDialog()) { e.preventDefault(); return; }
  const s = App.screens[App.screen];
  if (['Escape', 'KeyX', 'KeyM'].includes(e.code) && s && s.key) s.key(e.code === 'KeyM' || (e.code === 'Escape' && App.screen === 'dungeon') ? 'menu' : 'cancel');
});
addEventListener('keyup', (e) => { if (KEYS[e.code]) input[KEYS[e.code]] = 0; });
addEventListener('blur', () => { for (const k in input) input[k] = 0; });
App.cv.addEventListener('pointerdown', (e) => { const s = App.screens[App.screen]; if (s && s.click) s.click(e.clientX, e.clientY); });
App.cv.addEventListener('pointermove', (e) => { const s = App.screens[App.screen]; if (s && s.move) s.move(e.clientX, e.clientY); });
for (const b of document.querySelectorAll('#pad [data-d]')) {
  const d = b.dataset.d, on = (e) => { e.preventDefault(); input[d] = 1; }, off = () => { input[d] = 0; };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
}
// ---------------------------------------------------------------- the loop
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000); last = now; App.time += dt;
  if (App.S && !['title', 'choose'].includes(App.screen)) App.S.playTime += dt;
  if (App.cv.clientWidth && (Math.abs(App.cv.clientWidth - App.w) > 1 || Math.abs(App.cv.clientHeight - App.h) > 1)) { resize(); const r = App.screens[App.screen]; if (r && r.resize) r.resize(); }
  const s = App.screens[App.screen]; if (!s) return;
  if (s.tick) s.tick(dt, input);
  if (s.draw) s.draw();
}
requestAnimationFrame(frame);
// cloud saves shared by the site's games (optional)
import('/save.js').then(async (m) => { App.cloud = m; if (await m.pull('eightfold-saga', 'efs_save') && App.screen === 'title') App.go('title'); }).catch(() => {});
window.__efs = { App, DB, newGame, rest, fromSave, event };
App.go('title');
