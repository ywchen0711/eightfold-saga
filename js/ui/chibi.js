// Chibi pixel heroes in the Pixel Hoops style: a big head, a small body, flat colours with one shadow tone, round eyes
// with a white glint, rosy cheeks and a dark outline. Each pose is drawn once into a small canvas and cached.
import { DB } from '../data/index.js';

export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f));
  return '#' + c.map((v) => ('0' + Math.max(0, Math.min(255, v)).toString(16)).slice(-2)).join('');
}
const ROBE = new Set(['erin', 'morrow', 'agnes', 'quill', 'hexa']), CAPE = new Set(['gareth', 'morrow', 'chizuru', 'elio', 'rook', 'kaz']);
export const CW = 36, CH = 40, FOOT = 38;           // the sprite box and where the feet are
const cache = new Map();

// pose: idle | step | atk | cast | hurt | def | ko | win; frame 0/1 animates; wtype: the weapon in hand
export function chibi(id, pose = 'idle', frame = 0, wtype = 'sword') {
  const key = `${id}|${pose}|${frame}|${wtype}`; let cv = cache.get(key); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = CW; cv.height = CH; const x = cv.getContext('2d');
  const d = DB.chars[id], lk = d.look, f = d.gender === 'f';
  const skin = lk.skin, skinD = shade(skin, -0.2), hair = lk.hairCol, hairD = shade(hair, -0.35), hairL = shade(hair, 0.3);
  const cl = lk.cloth, clD = shade(cl, -0.3), c2 = lk.cloth2, pants = shade(cl, -0.55), boots = '#3a2a22', bootsD = '#241812';
  const R = (a, b, w, h, col) => { if (!col || w <= 0 || h <= 0) return; x.fillStyle = col; x.fillRect(a, b, w, h); };
  const small = id === 'jasper' ? 1 : 0;                                   // Jasper is a little shorter
  const bx = 12, hx = bx, hy = 6 + small, ty = hy + 12, sy = ty + 8, ly = sy + 3, legH = 4 - small;
  const bob = pose === 'idle' && frame ? 1 : 0, crouch = pose === 'def' ? 1 : 0;
  x.translate(pose === 'hurt' ? 2 : pose === 'atk' ? -2 : 0, bob + crouch);
  // ---- cape and long hair behind ----
  if (CAPE.has(id)) { R(bx + 1, ty + 1, 12, 13, shade(c2, -0.2)); R(bx + 12, ty + 2, 2, 12, shade(c2, -0.4)); }
  if (['long', 'wavy', 'braid', 'pony'].includes(lk.hair)) { R(hx - 1, hy + 3, 3, lk.hair === 'pony' ? 6 : 11, hairD); R(hx + 10, hy + 3, 3, 11, hairD); if (lk.hair === 'pony') R(hx + 11, hy + 1, 3, 12, hair); }
  if (lk.hair === 'bun') { x.fillStyle = hair; x.beginPath(); x.arc(hx + 6, hy - 2, 2.8, 0, Math.PI * 2); x.fill(); R(hx + 4, hy - 1, 4, 1, c2); }
  if (lk.extra === 'hood') R(hx - 1, hy - 1, 14, 13, c2);
  // ---- body ----
  const st = pose === 'step' || (pose === 'idle' && frame) ? 1 : 0;
  if (ROBE.has(id)) {
    R(bx + 1, ty, 12, 8 + 3 + legH, cl); R(bx + 1, ty, 1, 11 + legH, shade(cl, 0.2)); R(bx + 11, ty, 2, 11 + legH, clD); R(bx + 1, ty + 10 + legH, 12, 1, clD);
    R(bx + 5, ty, 4, 11 + legH, c2); R(bx + 6, ty + 1, 2, 10 + legH, shade(c2, 0.2));
    R(bx + 2, ly + legH, 4, 2, boots); R(bx + 8, ly + legH, 4, 2, bootsD);
  } else {
    R(bx + 1, ty, 12, 8, cl); R(bx + 1, ty, 1, 8, shade(cl, 0.2)); R(bx + 11, ty, 2, 8, clD);                 // tunic
    R(bx + 5, ty, 4, 1, skin); R(bx + 6, ty + 1, 2, 1, skin);                                                // neck opening
    R(bx + 6, ty + 2, 2, 5, c2);                                                                              // trim
    R(bx + 1, sy - 1, 12, 1, '#3a2418'); R(bx + 6, sy - 1, 2, 1, '#e0b84a');                                  // belt
    if (f) { R(bx, sy, 14, 3, cl); R(bx + 11, sy, 3, 3, clD); R(bx, sy + 2, 14, 1, c2); }                    // skirt
    else { R(bx + 1, sy, 12, 3, pants); R(bx + 11, sy, 2, 3, shade(pants, -0.3)); }
    const l1 = st ? 1 : 0, l2 = st ? 0 : 1;
    R(bx + 2, ly, 3, legH - l1, f ? skin : pants); R(bx + 9, ly, 3, legH - l2, f ? skinD : shade(pants, -0.3));
    R(bx + 1, ly + legH - l1, 5, 2, boots); R(bx + 8, ly + legH - l2, 5, 2, boots); R(bx + 1, ly + legH - l1 + 1, 5, 1, bootsD); R(bx + 8, ly + legH - l2 + 1, 5, 1, bootsD);
  }
  if (lk.extra === 'armor') { R(bx - 1, ty, 4, 3, '#d8dce8'); R(bx + 11, ty, 4, 3, '#a8acbc'); R(bx + 2, ty + 1, 10, 5, '#c8ccd8'); R(bx + 2, ty + 1, 10, 1, '#f0f2f8'); R(bx + 6, ty + 1, 2, 5, c2); }
  // back arm (the shadowed side)
  R(bx + 13, ty + 1, 3, 3, cl); R(bx + 13, ty + 4, 3, 3, skinD); R(bx + 13, ty + 6 + (st ? 1 : 0), 3, 2, skinD);
  // ---- the head (big) ----
  R(hx, hy + 1, 14, 9, skin); R(hx + 1, hy, 12, 11, skin); R(hx + 1, hy + 10, 12, 1, skinD); R(hx + 12, hy + 2, 2, 8, skinD);
  R(hx - 1, hy + 5, 1, 2, skin);                                                                              // ear
  const hairTop = () => { R(hx, hy, 14, 3, hair); R(hx + 1, hy - 1, 12, 1, hair); R(hx, hy + 3, 1, 2, hair); R(hx + 13, hy + 3, 1, 3, hair); R(hx + 2, hy, 4, 1, hairL); };
  switch (lk.hair) {
    case 'bald': R(hx + 3, hy + 1, 3, 1, shade(skin, 0.45)); break;
    case 'spiky': hairTop(); for (let k = 0; k < 5; k++) { R(hx + 1 + k * 3, hy - 2, 2, 1, hair); R(hx + 2 + k * 3, hy - 3, 1, 1, hair); } break;
    case 'messy': hairTop(); R(hx - 1, hy + 1, 2, 3, hair); R(hx + 4, hy - 2, 3, 1, hair); R(hx + 9, hy - 2, 2, 1, hair); R(hx + 1, hy + 3, 3, 1, hair); break;
    case 'long': case 'wavy': case 'braid': case 'pony': hairTop(); R(hx, hy + 3, 2, 5, hair); R(hx + 12, hy + 3, 2, 6, hair); break;
    case 'hood': case 'mask': hairTop(); break;
    default: hairTop();
  }
  // face: eyes look to the left, towards the enemies
  const ex = hx + 2, ey = hy + 5;
  if (pose === 'hurt') { R(ex, ey, 1, 1, '#1a1420'); R(ex + 1, ey + 1, 1, 1, '#1a1420'); R(ex, ey + 2, 1, 1, '#1a1420'); R(ex + 6, ey, 1, 1, '#1a1420'); R(ex + 5, ey + 1, 1, 1, '#1a1420'); R(ex + 6, ey + 2, 1, 1, '#1a1420'); }
  else if (pose === 'win') { R(ex, ey + 1, 3, 1, '#1a1420'); R(ex + 5, ey + 1, 3, 1, '#1a1420'); }
  else { R(ex, ey, 2, 2 + (f ? 1 : 0), '#1a1420'); R(ex + 5, ey, 2, 2 + (f ? 1 : 0), '#1a1420'); R(ex, ey, 1, 1, '#ffffff'); R(ex + 5, ey, 1, 1, '#ffffff'); }
  R(ex - 1, ey - 1, 3, 1, hairD); R(ex + 4, ey - 1, 3, 1, hairD);                                            // brows
  R(hx + 1, hy + 7, 2, 1, 'rgba(255,110,120,0.5)'); R(hx + 8, hy + 7, 2, 1, 'rgba(255,110,120,0.5)');        // cheeks
  R(hx + 4, hy + 8, 2, 1, pose === 'hurt' ? '#5a1a1a' : '#9a3a3a');                                         // mouth
  switch (lk.extra) {
    case 'goggles': R(hx, hy + 2, 14, 1, '#4a3020'); R(hx + 1, hy + 1, 4, 3, '#b08a50'); R(hx + 7, hy + 1, 4, 3, '#b08a50'); R(hx + 2, hy + 2, 2, 1, '#9ad8ff'); R(hx + 8, hy + 2, 2, 1, '#9ad8ff'); break;
    case 'shades': R(hx + 1, hy - 1, 5, 2, '#1a1820'); R(hx + 7, hy - 1, 5, 2, '#1a1820'); R(hx + 6, hy - 1, 1, 1, '#1a1820'); R(hx + 2, hy - 1, 1, 1, '#8aa8d0'); break;
    case 'cap': R(hx - 1, hy - 1, 15, 3, cl); R(hx - 3, hy + 1, 5, 1, clD); R(hx + 3, hy - 1, 3, 1, shade(cl, 0.3)); break;
    case 'hat': R(hx - 2, hy, 18, 2, c2); R(hx + 2, hy - 6, 9, 6, c2); R(hx + 5, hy - 9, 4, 3, c2); R(hx + 3, hy - 6, 2, 6, shade(c2, 0.25)); break;
    case 'veil': R(hx + 1, hy + 7, 9, 3, 'rgba(170,40,90,.75)'); R(hx + 4, hy - 1, 5, 1, '#e8c040'); break;
    case 'ribbon': R(hx + 10, hy - 3, 3, 3, '#d03040'); R(hx + 13, hy - 4, 2, 2, '#d03040'); break;
    case 'beard': R(hx, hy + 7, 1, 3, hair); R(hx + 13, hy + 7, 1, 3, hair); R(hx + 1, hy + 9, 12, 2, hair); R(hx + 4, hy + 8, 4, 1, skin); break;
    case 'eyepatch': R(ex + 4, ey - 1, 4, 3, '#14121a'); R(hx, hy + 3, 14, 1, '#14121a'); break;
    case 'mask': R(hx + 1, hy + 7, 12, 4, '#1e1e2a'); break;
    case 'hood': R(hx - 1, hy - 1, 15, 3, c2); R(hx - 1, hy + 2, 2, 8, c2); R(hx + 12, hy + 2, 3, 9, shade(c2, -0.3)); break;
    case 'feather': R(hx + 11, hy - 4, 2, 4, '#e04a4a'); R(hx + 12, hy - 6, 2, 2, '#f08a8a'); break;
    case 'scar': R(hx + 9, hy + 4, 1, 3, '#b06060'); break;
    case 'armor': R(hx, hy - 1, 14, 2, '#c8ccd8'); R(hx + 1, hy - 1, 4, 1, '#f0f2f8'); break;
  }
  // ---- the front arm with the weapon (raised to strike or cast) ----
  x.save();
  const ax = bx - 1, ay = ty + 1;
  if (pose === 'atk') { x.translate(ax + 1, ay + 1); x.rotate(frame ? -0.6 : -2.2); }
  else if (pose === 'cast' || pose === 'win') { x.translate(ax + 1, ay + 1); x.rotate(-2.8); }
  else if (pose === 'def') { x.translate(ax + 1, ay + 1); x.rotate(-1.3); }
  else x.translate(ax + 1, ay + 1);
  R(-1, -1, 3, 3, cl); R(-1, 2, 3, 3, skin); R(-1, 4 + (st && pose === 'idle' ? 1 : 0), 3, 2, skin);
  x.translate(0, 6); weapon(x, wtype, R);
  x.restore();
  if (pose === 'cast') { R(bx - 6, hy - 6, 2, 2, '#fff6a0'); R(bx - 4, hy - 8, 1, 1, '#ffffff'); R(bx - 8, hy - 3, 1, 1, '#fff6a0'); }
  // knocked out: the whole figure lies on its side
  if (pose === 'ko') { const t2 = document.createElement('canvas'); t2.width = CW; t2.height = CH; const y2 = t2.getContext('2d'); y2.translate(CW / 2, FOOT - 1); y2.rotate(-Math.PI / 2); y2.drawImage(cv, -CW / 2 - 6, -FOOT + 1);
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, CW, CH); x.drawImage(t2, 0, 0); }
  outline(x);
  cache.set(key, cv); return cv;
}
function weapon(x, type, R) {
  const st = '#dfe4ee', sd = '#9aa0b0', wood = '#8a5a2a', gold = '#e0b84a';
  switch (type) {
    case 'sword': R(-2, 0, 6, 1, gold); R(0, 1, 2, 10, st); R(1, 1, 1, 10, sd); R(0, 11, 1, 1, st); break;
    case 'greatsword': R(-3, 0, 8, 2, gold); R(-1, 2, 4, 14, st); R(2, 2, 1, 14, sd); R(0, 16, 2, 1, st); break;
    case 'katana': R(-1, 0, 4, 1, '#2a2a2a'); R(0, 1, 2, 12, st); R(1, 1, 1, 12, sd); R(1, 13, 1, 1, st); break;
    case 'rapier': R(-2, -1, 6, 2, gold); R(0, 1, 1, 13, st); break;
    case 'dagger': R(-1, 0, 4, 1, gold); R(0, 1, 2, 5, st); break;
    case 'axe': R(0, -3, 2, 14, wood); R(-4, 6, 5, 6, st); R(-4, 6, 1, 6, '#ffffff'); break;
    case 'mace': R(0, 0, 2, 9, wood); R(-2, 8, 6, 5, '#a8a8b8'); R(-2, 8, 6, 1, '#d8d8e8'); break;
    case 'spear': R(0, -8, 1, 22, wood); R(-1, 13, 3, 4, st); R(0, 16, 1, 2, st); break;
    case 'bow': R(-3, -3, 2, 1, wood); R(-4, -2, 1, 12, wood); R(-3, 10, 2, 1, wood); R(-2, -2, 1, 12, '#f0f0f0'); break;
    case 'staff': R(0, -8, 2, 20, wood); R(-1, 11, 4, 4, '#5ab0ff'); R(0, 12, 1, 1, '#ffffff'); break;
    case 'whip': R(0, 0, 1, 4, '#6a3a1a'); R(1, 4, 1, 3, '#6a3a1a'); R(0, 7, 1, 3, '#6a3a1a'); R(-1, 10, 1, 3, '#6a3a1a'); break;
    case 'scythe': R(0, -6, 2, 20, wood); R(-7, 12, 8, 2, st); R(-8, 10, 2, 3, st); break;
    case 'thrown': R(-2, 2, 5, 1, st); R(0, 0, 1, 5, st); break;
    case 'gun': R(-1, 0, 3, 4, wood); R(0, 4, 2, 7, '#5a5a6a'); R(0, 4, 1, 7, '#8a8a9a'); break;
  }
}
function outline(x) {
  const W = CW, H = CH, id = x.getImageData(0, 0, W, H), d = id.data, src = new Uint8ClampedArray(d);
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
    const i = (yy * W + xx) * 4; if (src[i + 3] > 40) continue;
    if ((xx > 0 && src[i - 1] > 40) || (xx < W - 1 && src[i + 7] > 40) || (yy > 0 && src[i - W * 4 + 3] > 40) || (yy < H - 1 && src[i + W * 4 + 3] > 40)) { d[i] = 20; d[i + 1] = 16; d[i + 2] = 24; d[i + 3] = 255; }
  }
  x.putImageData(id, 0, 0);
}
// draw a hero standing with their feet at (fx, fy), each sprite pixel `k` screen pixels; flip to face right
export function drawChibi(c, id, fx, fy, k, pose, frame, wtype, o = {}) {
  const img = chibi(id, pose, frame, wtype);
  c.save(); c.imageSmoothingEnabled = false;
  if (o.flip) { c.translate(fx, 0); c.scale(-1, 1); c.translate(-fx, 0); }
  if (o.alpha != null) c.globalAlpha = o.alpha;
  c.drawImage(img, Math.round(fx - (CW / 2 + 2) * k), Math.round(fy - FOOT * k), CW * k, CH * k);
  c.restore();
}
// a portrait: the chibi's head and shoulders, big, on a soft lit backdrop (64 x 64 box)
export function portraitChibi(c, id, x, y, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const g = c.createRadialGradient(40, 18, 2, 32, 32, 46); g.addColorStop(0, '#4a4458'); g.addColorStop(1, '#16141e'); c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  c.imageSmoothingEnabled = false;
  const img = chibi(id, 'idle', 0, 'none');
  c.drawImage(img, 9, 2, 22, 26, 2, 2, 22 * 2.7, 26 * 2.7);
  c.restore();
}
