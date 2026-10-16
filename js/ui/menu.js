// The field menu: status, equipment, techniques & spells, items, Fate Stones, system (save, language).
import { DB } from '../data/index.js';
import { derived, equip, SLOTS, STATS, count, itemDef, take, weaponsOf } from '../engine/state.js';
import { App, $, el, btn, esc, toast, itemName } from './app.js';
import { L, t, getLang, setLang } from './i18n.js';
import { portraitChibi as portrait } from './chibi.js';
import { desc, kindName } from './places.js';

let tab = 'status', from = 'town', who = 0, slotSel = null;
const TABS = ['status', 'equip', 'skills', 'items', 'stones', 'system'];
function draw() {
  const S = App.S, p = $('#panel'); p.innerHTML = '';
  const box = el('div', 'win menu');
  const head = el('div', 'whead'); head.appendChild(el('h2', '', t(tab === 'skills' ? 'skills' : tab)));
  head.appendChild(btn('✕', () => App.go(from, { back: true }), 'x')); box.appendChild(head);
  const tabs = el('div', 'tabs'); for (const k of TABS) tabs.appendChild(btn(t(k), () => { tab = k; slotSel = null; draw(); }, tab === k ? 'on' : '')); box.appendChild(tabs);
  if (['status', 'equip', 'skills', 'items'].includes(tab)) {
    const who2 = el('div', 'who2');
    S.party.forEach((c, i) => { const cv = el('canvas', 'mini' + (i === who ? ' on' : '')); cv.width = cv.height = 64; portrait(cv.getContext('2d'), c.id, 0, 0, 1); cv.onclick = () => { who = i; slotSel = null; draw(); }; who2.appendChild(cv); });
    box.appendChild(who2);
  }
  const body = el('div', 'wbody'); box.appendChild(body); p.appendChild(box);
  who = Math.min(who, S.party.length - 1);
  const c = S.party[who], d = derived(c, S), dc = DB.chars[c.id];
  if (tab === 'status') {
    body.appendChild(el('div', 'sname', `<b>${esc(L(dc))}</b> <small>${esc(L(dc.title || { zh: '', en: '' }))}</small>`));
    if (dc.bio) body.appendChild(el('p', 'sm', esc(L(dc.bio))));
    const g = el('div', 'stats');
    const rows = [['hp', `${c.hp}/${d.mhp}`], ['lp', `${c.lp}/${c.mlp}`], ['wp', `${c.wp}/${c.mwp}`], ['jp', `${c.jp}/${c.mjp}`], ...STATS.map((k) => [k, d[k] + (d[k] !== c[k] ? ` <small>(${c[k]})</small>` : '')]), ['def', d.def], ['mdef', d.mdef]];
    for (const [k, v] of rows) g.appendChild(el('div', '', `<span>${t(k)}</span><b>${v}</b>`));
    body.appendChild(g);
    body.appendChild(el('div', 'sect', t('weaponLv')));
    const wl = el('div', 'levels'); for (const [type, v] of Object.entries(c.wl).sort((a, b) => b[1] - a[1])) wl.appendChild(el('div', '', `${DB.weaponTypes[type].icon} ${esc(L(DB.weaponTypes[type]))} <b>${v}</b>`)); body.appendChild(wl);
    if (Object.keys(c.ml).length) { body.appendChild(el('div', 'sect', t('magicLv'))); const ml = el('div', 'levels'); for (const [s, v] of Object.entries(c.ml)) ml.appendChild(el('div', '', `${DB.schools[s].icon} ${esc(L(DB.schools[s]))} <b>${v}</b> <small>✕${esc(L(DB.schools[DB.schools[s].opp]))}</small>`)); body.appendChild(ml); }
    body.appendChild(el('p', 'sm', `${t('br')} ${S.br} · ${t('battles')} ${S.battles} · ${t('kills')} ${S.kills || 0} · ${t('glimmers')} ${S.glimmers || 0} · ${t('playTime')} ${fmt(S.playTime)}`));
  }
  if (tab === 'equip') {
    const list = el('div', 'list');
    for (const slot of SLOTS) {
      const id = c.equip[slot], r = el('div', 'row' + (slotSel === slot ? ' on' : ''));
      r.appendChild(el('div', 'nm', `<small>${t('slot_' + slot)}</small>${id ? esc(itemName(id)) + `<small>${desc(id)}</small>` : t('none')}`));
      r.onclick = () => { slotSel = slotSel === slot ? null : slot; draw(); };
      list.appendChild(r);
    }
    body.appendChild(list);
    if (slotSel) {
      const fits = Object.keys(S.inv).filter((id) => (slotSel.startsWith('wpn') ? DB.weapons[id] : DB.armor[id] && DB.armor[id].slot === slotSel));
      const pick = el('div', 'list pick'); pick.appendChild(el('div', 'sect', `${t('slot_' + slotSel)} ── ${t('equip')}`));
      if (c.equip[slotSel]) pick.appendChild(btn(t('remove'), () => { equip(S, c, slotSel, null); draw(); }));
      for (const id of fits) { const b = btn(`${esc(itemName(id))} ×${count(S, id)}<small>${desc(id)}</small>`, () => { equip(S, c, slotSel, id); slotSel = null; draw(); }); pick.appendChild(b); }
      if (!fits.length) pick.appendChild(el('div', 'sm', t('none')));
      body.appendChild(pick);
    }
  }
  if (tab === 'skills') {
    body.appendChild(el('p', 'sm', t('helpBattle')));
    for (const w of weaponsOf(c)) {
      const all = Object.values(DB.techs).filter((x) => x.type === w.type).sort((a, b) => a.order - b.order);
      body.appendChild(el('div', 'sect', `${DB.weaponTypes[w.type].icon} ${esc(L(DB.weaponTypes[w.type]))} Lv${c.wl[w.type] || 0} · ${c.techs.filter((x) => DB.techs[x].type === w.type).length}/${all.length}`));
      const g = el('div', 'skills');
      for (const tc of all) { const has = c.techs.includes(tc.id); g.appendChild(el('div', has ? 'on' : 'off', has ? `${esc(L(tc))}<small>WP ${tc.wp} · ×${tc.pow}${tc.target !== 'one' ? ' · ' + (tc.target === 'all' ? L({ zh: '全體', en: 'all' }) : L({ zh: '亂擊', en: 'random' })) : ''}</small>` : '？？？')); }
      body.appendChild(g);
    }
    const others = Object.keys(c.wl).filter((type) => !weaponsOf(c).some((w) => w.type === type)).map((type) => `${DB.weaponTypes[type].icon}${c.techs.filter((x) => DB.techs[x].type === type).length}`);
    if (others.length) body.appendChild(el('p', 'sm', L({ zh: '其他武器的技：', en: 'Techniques of other weapons: ' }) + others.join(' ')));
    body.appendChild(el('div', 'sect', t('spells')));
    const sp = el('div', 'skills');
    for (const id of c.spells) { const s = DB.spells[id]; sp.appendChild(el('div', 'on', `${DB.schools[s.school].icon} ${esc(L(s))}<small>JP ${s.jp} · ${kindName(s)}</small>`)); }
    if (!c.spells.length) sp.appendChild(el('div', 'off', t('noSpells')));
    body.appendChild(sp);
  }
  if (tab === 'items') {
    const list = el('div', 'list');
    for (const [id, n] of Object.entries(S.inv)) {
      const it = itemDef(id); if (!it) continue;
      const r = el('div', 'row'); r.appendChild(el('div', 'nm', `${esc(L(it))} ×${n}<small>${desc(id)}${it.kind === 'key' ? L({ zh: '重要物品', en: 'Key item' }) : ''}</small>`));
      if (DB.items[id] && DB.items[id].kind === 'use') { const b = btn(t('use'), () => useField(id)); b.disabled = !!DB.items[id].battle; r.appendChild(b); }
      list.appendChild(r);
    }
    body.appendChild(list);
  }
  if (tab === 'stones') {
    body.appendChild(el('p', 'sm', L({ zh: '每持有一顆命運之石，隊伍能力提升，邪神的力量也會被削弱。', en: 'Each Fate Stone you hold strengthens the party and weakens the evil god.' })));
    const g = el('div', 'stones');
    for (const s of Object.values(DB.stones)) { const has = S.stones.includes(s.id);
      g.appendChild(el('div', has ? 'on' : 'off', `<i style="background:${has ? s.col : '#333'}"></i>${has ? esc(L(s)) : '？？？'}<small>${has ? Object.entries(s.bonus).map(([k, v]) => `${t(k)}+${v}`).join(' ') : ''}</small>`)); }
    body.appendChild(g);
  }
  if (tab === 'system') {
    const list = el('div', 'list');
    list.appendChild(btn(`💾 ${t('save')}`, () => { App.save(); toast(t('saved')); }, 'go'));
    list.appendChild(btn(`🌐 ${t('language')}: ${getLang() === 'zh' ? '中文' : 'English'}`, () => { setLang(getLang() === 'zh' ? 'en' : 'zh'); App.applyLang(); draw(); }));
    list.appendChild(btn(`⏩ ${L({ zh: '戰鬥動畫速度', en: 'Battle speed' })}: ${App.fast ? L({ zh: '快', en: 'Fast' }) : L({ zh: '普通', en: 'Normal' })}`, () => { App.fast = !App.fast; try { localStorage.setItem('efs_fast', App.fast ? '1' : ''); } catch (e) { /* */ } draw(); }));
    list.appendChild(btn(`🏠 ${t('toTitle')}`, () => App.go('title')));
    body.appendChild(list);
  }
}
function useField(id) {
  const S = App.S, it = DB.items[id];
  if (it.camp) { take(S, id); for (const c of S.party) { c.wp = c.mwp; c.jp = c.mjp; } toast(t('camp')); draw(); return; }
  const c = S.party[who], d = derived(c, S);
  if (it.target === 'allies') { take(S, id); for (const x of S.party) x.hp = Math.min(derived(x, S).mhp, x.hp + (it.heal || 0)); draw(); return; }
  take(S, id);
  if (it.heal) c.hp = Math.min(d.mhp, c.hp + it.heal);
  if (it.wp) c.wp = Math.min(c.mwp, c.wp + it.wp);
  if (it.jp) c.jp = Math.min(c.mjp, c.jp + it.jp);
  if (it.lp) c.lp = Math.min(c.mlp, c.lp + it.lp);
  toast(`${esc(L(DB.chars[c.id]))} ── ${esc(L(it))}`); draw();
}
const fmt = (s) => `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}`;
App.screens.menu = {
  enter(arg = {}) { if (arg.from) from = arg.from; draw(); if (from === 'dungeon') $('#pad').classList.add('hidden'); },
  draw() { const s = App.screens[from]; if (s && s.draw) s.draw(); App.cx.fillStyle = 'rgba(0,0,0,.45)'; App.cx.fillRect(0, 0, App.w, App.h); },
  key(k) { if (k === 'menu' || k === 'cancel') App.go(from, { back: true }); },
};
