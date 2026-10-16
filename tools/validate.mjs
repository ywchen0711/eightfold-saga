// Checks that all content fits together: every id a piece of content points at exists, every technique and spell
// can be glimmered from something you start with, every place can be discovered, every Fate Stone can be won.
import { DB } from '../js/data/index.js';
import { OPS } from '../js/engine/events.js';

const bad = [];
const need = (ok, msg) => { if (!ok) bad.push(msg); };
const anyItem = (id) => DB.weapons[id] || DB.armor[id] || DB.items[id];

for (const w of Object.values(DB.weapons)) need(DB.weaponTypes[w.type], `weapon ${w.id}: type ${w.type}`);
for (const t of Object.values(DB.techs)) {
  need(DB.weaponTypes[t.type], `tech ${t.id}: type`);
  for (const f of t.from) need(f === 'atk' || (DB.techs[f] && DB.techs[f].type === t.type), `tech ${t.id}: from ${f}`);
  if (t.st) need(DB.statuses[t.st], `tech ${t.id}: status ${t.st}`);
}
// every technique can be reached from a normal attack
for (const type of Object.keys(DB.weaponTypes)) {
  const known = new Set(['atk']); let grew = true;
  const list = Object.values(DB.techs).filter((t) => t.type === type);
  while (grew) { grew = false; for (const t of list) if (!known.has(t.id) && t.from.some((f) => known.has(f))) { known.add(t.id); grew = true; } }
  for (const t of list) need(known.has(t.id), `tech ${t.id} can never be glimmered`);
  need(list.length >= 8, `weapon type ${type} has only ${list.length} techniques`);
}
for (const s of Object.values(DB.spells)) {
  need(DB.schools[s.school], `spell ${s.id}: school`);
  for (const f of s.from) need(DB.spells[f] && DB.spells[f].school === s.school, `spell ${s.id}: from ${f}`);
  if (s.st) need(DB.statuses[s.st], `spell ${s.id}: status`);
  need(s.tier <= 2 ? s.price > 0 : s.from.length > 0, `spell ${s.id}: tier ${s.tier} needs a price or a source`);
}
for (const sc of Object.values(DB.schools)) need(DB.schools[sc.opp] && DB.schools[sc.opp].opp === sc.id, `school ${sc.id}: opposite`);
for (const e of Object.values(DB.enemies)) { need(DB.families[e.family], `enemy ${e.id}: family`); for (const s of e.skills) need(DB.eskills[s], `enemy ${e.id}: skill ${s}`); }
for (const b of Object.values(DB.bosses)) {
  need(b.art === 'god' || DB.families[b.art], `boss ${b.id}: art ${b.art}`);
  for (const s of b.skills) need(DB.eskills[s], `boss ${b.id}: skill ${s}`);
  for (const p of b.phases || []) for (const s of p.add || []) need(DB.eskills[s], `boss ${b.id}: phase skill ${s}`);
  for (const m of b.minions || []) need(DB.enemies[m], `boss ${b.id}: minion ${m}`);
  for (const d of b.drop || []) need(anyItem(d), `boss ${b.id}: drop ${d}`);
}
for (const c of Object.values(DB.chars)) {
  for (const [slot, id] of Object.entries(c.equip)) { const it = anyItem(id); need(it, `char ${c.id}: equip ${id}`); if (it && DB.armor[id]) need(slot === it.slot || (slot === 'acc' && it.slot === 'acc'), `char ${c.id}: ${id} is not a ${slot}`); }
  for (const s of c.spells) { need(DB.spells[s], `char ${c.id}: spell ${s}`); if (DB.spells[s]) need(c.ml[DB.spells[s].school] != null, `char ${c.id}: knows ${s} but has no ${DB.spells[s].school} level`); }
  for (const w of Object.keys(c.wl)) need(DB.weaponTypes[w], `char ${c.id}: weapon type ${w}`);
  if (c.hero) { need(DB.locations[c.home], `hero ${c.id}: home`); need(DB.events[c.prologue], `hero ${c.id}: prologue`); need(DB.events['meet_' + c.id], `hero ${c.id}: meeting`); }
}
for (const l of Object.values(DB.locations)) {
  if (l.kind === 'town') {
    for (const t of l.shop.types) need(DB.weaponTypes[t], `town ${l.id}: weapon type ${t}`);
    for (const i of l.shop.items) need(DB.items[i], `town ${l.id}: item ${i}`);
    for (const s of l.magic) need(DB.schools[s], `town ${l.id}: school ${s}`);
    for (const g of l.guild) need(DB.chars[g] && !DB.chars[g].hero, `town ${l.id}: guild ${g}`);
    for (const [, ev] of l.npcs) need(DB.events[ev], `town ${l.id}: npc event ${ev}`);
    for (const r of l.rumors) need(DB.rumors[r], `town ${l.id}: rumor ${r}`);
  }
  need(l.x >= 0 && l.x <= 960 && l.y >= 0 && l.y <= 540, `place ${l.id}: off the map`);
}
for (const d of Object.values(DB.dungeons)) {
  for (const f of d.fams) need(DB.families[f], `dungeon ${d.id}: family ${f}`);
  need(DB.bosses[d.boss], `dungeon ${d.id}: boss ${d.boss}`);
  for (const [fl, it] of d.treasure || []) { need(anyItem(it), `dungeon ${d.id}: treasure ${it}`); need(fl >= 1 && fl <= d.floors, `dungeon ${d.id}: treasure floor ${fl}`); }
  if (d.stone) need(DB.stones[d.stone], `dungeon ${d.id}: stone`);
  need(d.lv >= 1 && d.lv <= 8, `dungeon ${d.id}: level`);
}
// every Fate Stone comes from exactly one dungeon
for (const s of Object.keys(DB.stones)) need(Object.values(DB.dungeons).filter((d) => d.stone === s).length === 1, `stone ${s}: found in ${Object.values(DB.dungeons).filter((d) => d.stone === s).length} dungeons`);
for (const r of Object.values(DB.rumors)) for (const p of r.reveal) need(DB.locations[p], `rumor ${r.id}: place ${p}`);

// events: every step is a known operation and every id it uses exists
const revealed = new Set();
function walk(steps, where) {
  for (const s of steps) {
    const [op, ...a] = s;
    need(OPS[op], `${where}: unknown step ${op}`);
    if (op === 'reveal') for (const p of a) { need(DB.locations[p], `${where}: reveal ${p}`); revealed.add(p); }
    if (op === 'give' || op === 'giveonce' || op === 'take') need(anyItem(a[0]), `${where}: item ${a[0]}`);
    if (op === 'join' || op === 'recruit' || op === 'meet') need(DB.chars[a[0]], `${where}: char ${a[0]}`);
    if (op === 'battle') need(DB.bosses[a[0]], `${where}: boss ${a[0]}`);
    if (op === 'fight') for (const e of a[0]) need(DB.enemies[e], `${where}: enemy ${e}`);
    if (op === 'run') need(DB.events[a[0]], `${where}: event ${a[0]}`);
    if (op === 'say') need(a[0] === 'nar' || DB.chars[a[0]] || String(a[0]).includes('|'), `${where}: speaker ${a[0]}`);
    if (op === 'if') { walk(a[1], where); walk(a[2] || [], where); }
    if (op === 'choice') for (const [, ...st] of a[1]) walk(st, where);
  }
}
for (const e of Object.values(DB.events)) { walk(e.steps, 'event ' + e.id); if (e.at) need(DB.locations[e.at], `event ${e.id}: at ${e.at}`); if (e.then) need(DB.events[e.then], `event ${e.id}: then`); }
for (const r of Object.values(DB.rumors)) for (const p of r.reveal) revealed.add(p);
for (const c of Object.values(DB.chars)) if (c.hero) revealed.add(c.home);
for (const l of Object.values(DB.locations)) need(revealed.has(l.id), `place ${l.id} is never revealed`);
for (const d of Object.values(DB.dungeons)) need(DB.locations[d.id], `dungeon ${d.id} has no map place`);

const n = (k) => Object.keys(DB[k]).length;
console.log(`content: ${n('weaponTypes')} weapon types, ${n('techs')} techniques, ${n('schools')} schools, ${n('spells')} spells, ${n('weapons')} weapons, ${n('armor')} armour, ${n('items')} items, ${n('enemies')} enemies, ${n('bosses')} bosses, ${n('chars')} characters, ${n('locations')} places (${n('dungeons')} dungeons), ${n('events')} events, ${n('rumors')} rumours`);
if (bad.length) { console.log(bad.length + ' problems:'); for (const b of bad) console.log('  ' + b); process.exit(1); }
console.log('validate: all references ok');
