// Dungeon floors: rooms joined by corridors, generated from the dungeon id and floor number, so a floor is always the
// same (and so are its chests). Monster symbols wander and chase you; touching one starts a battle.
import { DB } from '../data/index.js';
import { rng, pick, clamp } from './state.js';

export const WALL = 0, FLOOR = 1;
const hash = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

export function makeFloor(dungeonId, f) {
  // floors are roomy (40% larger than the listed size, wide rooms, two-tile corridors) so monsters can be walked around
  const d = DB.dungeons[dungeonId], w = Math.round(d.size[0] * 1.4), h = Math.round(d.size[1] * 1.4), r = rng(hash(dungeonId + ':' + f));
  const tiles = new Uint8Array(w * h), rooms = [];
  const set = (x, y) => { if (x > 0 && y > 0 && x < w - 1 && y < h - 1) tiles[y * w + x] = FLOOR; };
  const want = clamp(Math.floor((w * h) / 120), 5, 10);
  for (let tries = 0; rooms.length < want && tries < 400; tries++) {
    const rw = 6 + Math.floor(r() * 6), rh = 5 + Math.floor(r() * 4), rx = 1 + Math.floor(r() * (w - rw - 2)), ry = 1 + Math.floor(r() * (h - rh - 2));
    if (rooms.some((o) => rx < o.x + o.w + 1 && rx + rw + 1 > o.x && ry < o.y + o.h + 1 && ry + rh + 1 > o.y)) continue;
    rooms.push({ x: rx, y: ry, w: rw, h: rh, cx: rx + Math.floor(rw / 2), cy: ry + Math.floor(rh / 2) });
  }
  for (const o of rooms) for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) set(x, y);
  // corridors: each room to the next (sorted left to right), plus a few loops
  rooms.sort((a, b) => a.cx - b.cx);
  const set2 = (x, y) => { set(x, y); set(x + 1, y); set(x, y + 1); set(x + 1, y + 1); };      // corridors are two tiles wide
  const dig = (a, b) => { let x = a.cx, y = a.cy; const hFirst = r() < 0.5;
    const stepX = () => { while (x !== b.cx) { set2(x, y); x += Math.sign(b.cx - x); } }, stepY = () => { while (y !== b.cy) { set2(x, y); y += Math.sign(b.cy - y); } };
    if (hFirst) { stepX(); stepY(); } else { stepY(); stepX(); } set2(x, y); };
  for (let i = 1; i < rooms.length; i++) dig(rooms[i - 1], rooms[i]);
  for (let k = 0; k < Math.floor(rooms.length / 3); k++) dig(pick(r, rooms), pick(r, rooms));
  // the way in on one side, the way down (or the boss altar) in the farthest room
  const start = rooms[0], dist = bfs(tiles, w, h, start.cx, start.cy);
  const far = rooms.slice(1).sort((a, b) => dist[b.cy * w + b.cx] - dist[a.cy * w + a.cx])[0];
  const last = f === d.floors;
  const fl = { id: dungeonId, f, w, h, tiles, rooms, theme: d.theme, start: { x: start.cx, y: start.cy }, end: { x: far.cx, y: far.cy, kind: last ? 'altar' : 'down' }, chests: [] };
  // chests: a fixed find (the dungeon's treasure on this floor) and some random ones
  const spots = rooms.filter((o) => o !== start && o !== far);
  const fixed = (d.treasure || []).filter(([tf]) => tf === f).map(([, it]) => it);
  const n = fixed.length + 1 + Math.floor(r() * 2);
  for (let i = 0; i < n && spots.length; i++) {
    const o = spots.splice(Math.floor(r() * spots.length), 1)[0];
    const x = o.x + Math.floor(r() * o.w), y = o.y + Math.floor(r() * o.h);
    fl.chests.push({ key: `${dungeonId}:${f}:${i}`, x, y, item: i < fixed.length ? fixed[i] : chestLoot(d, r) });
  }
  return fl;
}
// random chest contents for a dungeon's level: gold, potions, or gear
function chestLoot(d, r) {
  const x = r(), lv = d.lv;
  if (x < 0.3) return 'gold:' + (60 + lv * lv * 45 + Math.floor(r() * lv * 60));
  if (x < 0.65) return pick(r, lv < 3 ? ['potion', 'potion', 'antidote', 'ether', 'eyedrop'] : lv < 6 ? ['hipotion', 'ether', 'manawater', 'panacea', 'feather'] : ['hipotion', 'elixir', 'manawater', 'feather', 'lifewater']);
  const tier = clamp(lv + (r() < 0.4 ? 1 : 0), 1, 8);
  if (r() < 0.6) return `${pick(r, Object.keys(DB.weaponTypes))}${tier}`;
  const s = pick(r, ['body', 'head', 'shield', 'robe']);
  return s === 'body' ? `body${Math.min(9, tier)}` : s === 'robe' ? `robe${clamp(Math.ceil(tier / 2), 1, 4)}` : `${s}${Math.min(6, tier)}`;
}
export function bfs(tiles, w, h, sx, sy) {
  const dist = new Int32Array(w * h).fill(-1), q = [sy * w + sx]; dist[q[0]] = 0;
  for (let i = 0; i < q.length; i++) { const p = q[i], x = p % w, y = (p - x) / w;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, np = ny * w + nx; if (nx >= 0 && ny >= 0 && nx < w && ny < h && tiles[np] === FLOOR && dist[np] < 0) { dist[np] = dist[p] + 1; q.push(np); } } }
  return dist;
}
export const open = (fl, x, y) => x >= 0 && y >= 0 && x < fl.w && y < fl.h && fl.tiles[y * fl.w + x] === FLOOR;

// monster symbols for a floor (not saved: they come back when you return)
export function spawnSymbols(fl, S, r) {
  const d = DB.dungeons[fl.id], dist = bfs(fl.tiles, fl.w, fl.h, fl.start.x, fl.start.y), out = [];
  // a few monsters per floor, spread out and away from the way in
  const n = clamp(Math.floor((fl.w * fl.h) / 260) + Math.floor(d.lv / 4), 3, 7);
  const cells = []; for (let y = 0; y < fl.h; y++) for (let x = 0; x < fl.w; x++) if (dist[y * fl.w + x] > 10) cells.push([x, y]);
  for (let i = 0; i < n && cells.length; i++) { const [x, y] = cells.splice(Math.floor(r() * cells.length), 1)[0]; out.push({ x, y, fam: pick(r, d.fams), stun: 0, id: i });
    for (let k = cells.length - 1; k >= 0; k--) if (Math.abs(cells[k][0] - x) + Math.abs(cells[k][1] - y) < 7) cells.splice(k, 1); }
  return out;
}
// one step for each symbol: chase the player when close, otherwise wander
export function moveSymbols(fl, syms, px, py, r) {
  const toward = bfs(fl.tiles, fl.w, fl.h, px, py);
  for (const s of syms) {
    if (s.stun > 0) { s.stun--; continue; }
    const md = Math.abs(s.x - px) + Math.abs(s.y - py);
    let best = null;
    if (md <= 4 && r() < 0.75) { let bd = toward[s.y * fl.w + s.x];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = s.x + dx, ny = s.y + dy, v = toward[ny * fl.w + nx]; if (open(fl, nx, ny) && v >= 0 && v < bd && !syms.some((o) => o !== s && o.x === nx && o.y === ny)) { bd = v; best = [nx, ny]; } } }
    else if (r() < 0.5) { const [dx, dy] = pick(r, [[1, 0], [-1, 0], [0, 1], [0, -1]]); if (open(fl, s.x + dx, s.y + dy) && !syms.some((o) => o.x === s.x + dx && o.y === s.y + dy)) best = [s.x + dx, s.y + dy]; }
    if (best) { s.x = best[0]; s.y = best[1]; }
  }
  return syms.find((s) => s.stun <= 0 && Math.abs(s.x - px) + Math.abs(s.y - py) === 0) || null;
}
