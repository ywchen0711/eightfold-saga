// Procedural art: hero portraits and walking sprites, the 15 monster families (+ the god), dungeon tiles by theme,
// battle backgrounds, town skylines and the world map. Everything is drawn with canvas shapes — no image files.
import { DB } from '../data/index.js';

export const H = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
const TAU = Math.PI * 2;
function ell(c, x, y, rx, ry, fill, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); c.fillStyle = fill; c.fill(); }
function rect(c, x, y, w, h, fill) { c.fillStyle = fill; c.fillRect(x, y, w, h); }
function poly(c, pts, fill, stroke, lw = 2) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); } }
function line(c, x1, y1, x2, y2, col, w = 2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.stroke(); }
let HDM = false;   // HD-2D mode: menacing glowing slits instead of cartoon eyes
const eyes = (c, x, y, d, r = 3, col = '#fff', pupil = '#111') => {
  if (HDM) { const glow = col === '#fff' || col === '#ffe' || col === '#f8ffd0' || col === '#fff6c0' ? '#ffd860' : col; c.save(); c.shadowColor = glow; c.shadowBlur = 4;
    for (const s of [-1, 1]) { c.beginPath(); c.ellipse(x + s * d, y, r * 0.95, r * 0.42, s * 0.25, 0, Math.PI * 2); c.fillStyle = glow; c.fill(); } c.restore(); return; }
  ell(c, x - d, y, r, r, col); ell(c, x + d, y, r, r, col); ell(c, x - d, y, r * 0.5, r * 0.6, pupil); ell(c, x + d, y, r * 0.5, r * 0.6, pupil);
};

// ---------------------------------------------------------------- heroes
// a head-and-shoulders portrait in a 64 x 64 box
export function portrait(c, id, x, y, s = 1) {
  const d = DB.chars[id], lk = d.look, f = d.gender === 'f';
  c.save(); c.translate(x, y); c.scale(s, s);
  rect(c, 0, 0, 64, 64, H(220, 30, 18));
  const g = c.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, 'rgba(255,255,255,.08)'); g.addColorStop(1, 'rgba(0,0,0,.25)'); rect(c, 0, 0, 64, 64, g);
  // shoulders and clothes
  ell(c, 32, 70, 26, 18, lk.cloth); ell(c, 32, 64, 9, 6, lk.cloth2);
  if (lk.extra === 'armor') { ell(c, 14, 58, 9, 7, '#c8ccd8'); ell(c, 50, 58, 9, 7, '#c8ccd8'); }
  // back hair
  if (['long', 'pony', 'wavy', 'braid'].includes(lk.hair)) ell(c, 32, 34, 17, lk.hair === 'long' ? 22 : 17, lk.hairCol);
  if (lk.extra === 'hood') ell(c, 32, 28, 20, 21, lk.cloth2);
  // neck and face
  rect(c, 28, 40, 8, 8, lk.skin); ell(c, 32, 30, 13, 15, lk.skin);
  // front hair
  const hc = lk.hairCol;
  switch (lk.hair) {
    case 'short': ell(c, 32, 19, 14, 8, hc); rect(c, 19, 18, 4, 9, hc); rect(c, 41, 18, 4, 9, hc); break;
    case 'spiky': poly(c, [17, 24, 20, 10, 25, 17, 29, 7, 33, 16, 38, 7, 41, 16, 46, 11, 47, 25, 32, 20], hc); break;
    case 'messy': ell(c, 32, 19, 15, 9, hc); poly(c, [18, 22, 14, 16, 22, 17], hc); poly(c, [46, 22, 50, 15, 42, 17], hc); poly(c, [28, 14, 31, 6, 35, 14], hc); break;
    case 'long': case 'wavy': case 'braid': case 'pony': ell(c, 32, 19, 15, 9, hc); rect(c, 18, 19, 5, f ? 22 : 14, hc); rect(c, 41, 19, 5, f ? 22 : 14, hc);
      if (lk.hair === 'pony') { ell(c, 47, 20, 5, 4, hc); poly(c, [47, 20, 56, 38, 50, 40], hc); } if (lk.hair === 'braid') { for (let i = 0; i < 4; i++) ell(c, 44, 44 + i * 5, 3, 3, hc); } break;
    case 'bun': ell(c, 32, 19, 15, 9, hc); ell(c, 32, 9, 7, 6, hc); rect(c, 18, 19, 4, 12, hc); rect(c, 42, 19, 4, 12, hc); break;
    case 'bald': ell(c, 32, 20, 13, 6, 'rgba(0,0,0,.08)'); break;
    case 'hood': case 'mask': ell(c, 32, 18, 15, 9, hc); break;
  }
  // face
  ell(c, 26, 31, 2, 2.4, '#1a1418'); ell(c, 38, 31, 2, 2.4, '#1a1418'); ell(c, 26.6, 30.3, 0.7, 0.7, '#fff'); ell(c, 38.6, 30.3, 0.7, 0.7, '#fff');
  line(c, 23, 26, 29, 26.5, hc === '#c8c8d0' ? '#8a8a90' : hc, 1.5); line(c, 35, 26.5, 41, 26, hc === '#c8c8d0' ? '#8a8a90' : hc, 1.5);
  c.beginPath(); c.arc(32, 37, 3.5, 0.15 * Math.PI, 0.85 * Math.PI); c.strokeStyle = '#8a4040'; c.lineWidth = 1.4; c.stroke();
  if (f) { ell(c, 22.5, 35, 2.5, 1.4, 'rgba(255,120,120,.35)'); ell(c, 41.5, 35, 2.5, 1.4, 'rgba(255,120,120,.35)'); }
  // extras
  switch (lk.extra) {
    case 'goggles': rect(c, 18, 42, 28, 3, '#5a4030'); ell(c, 25, 43.5, 4, 3.5, '#c8a060'); ell(c, 39, 43.5, 4, 3.5, '#c8a060'); ell(c, 25, 43.5, 2.5, 2.2, '#7ac8e8'); ell(c, 39, 43.5, 2.5, 2.2, '#7ac8e8'); break;
    case 'shades': rect(c, 21, 13, 22, 2, '#222'); ell(c, 25, 15, 5, 3.4, '#202028'); ell(c, 39, 15, 5, 3.4, '#202028'); ell(c, 24, 14, 1.5, 1, 'rgba(255,255,255,.5)'); ell(c, 38, 14, 1.5, 1, 'rgba(255,255,255,.5)'); break;
    case 'cap': ell(c, 32, 16, 16, 7, lk.cloth); rect(c, 30, 15, 20, 4, lk.cloth2); break;
    case 'veil': poly(c, [19, 34, 45, 34, 42, 46, 22, 46], 'rgba(160,40,90,.55)'); ell(c, 32, 14, 6, 3, '#e8c040'); break;
    case 'ribbon': poly(c, [38, 8, 46, 4, 44, 12], '#c02a3a'); poly(c, [38, 8, 30, 3, 32, 12], '#c02a3a'); break;
    case 'hood': c.beginPath(); c.arc(32, 28, 19, Math.PI * 1.05, Math.PI * 1.95); c.strokeStyle = lk.cloth2; c.lineWidth = 5; c.stroke(); break;
    case 'beard': ell(c, 32, 41, 11, 8, lk.hairCol); ell(c, 32, 37, 4, 2, lk.skin); break;
    case 'eyepatch': ell(c, 38, 31, 4, 3.5, '#111'); line(c, 20, 25, 46, 33, '#111', 1.4); break;
    case 'hat': poly(c, [14, 18, 50, 18, 36, -2], lk.cloth2); rect(c, 12, 16, 40, 4, lk.cloth); break;
    case 'feather': poly(c, [44, 16, 56, 2, 50, 18], '#e84a4a'); break;
    case 'scar': line(c, 36, 24, 42, 36, '#a05050', 1.5); break;
    case 'mask': rect(c, 18, 33, 28, 11, '#1a1a24'); break;
  }
  c.restore();
}
// a small walking figure (about 24 px tall at s = 1), facing dir: 0 down 1 left 2 right 3 up
export function hero(c, id, x, y, s = 1, dir = 0, step = 0) {
  const lk = DB.chars[id].look;
  c.save(); c.translate(x, y); c.scale(s, s);
  ell(c, 0, 0, 7, 2.5, 'rgba(0,0,0,.3)');
  const sw = Math.sin(step * Math.PI) * 2;
  rect(c, -4, -7, 3, 7 + (dir < 3 ? sw : 0) * 0.3, '#3a3040'); rect(c, 1, -7, 3, 7 - (dir < 3 ? sw : 0) * 0.3, '#3a3040');
  rect(c, -6, -17, 12, 11, lk.cloth); rect(c, -6, -9, 12, 2, lk.cloth2);
  ell(c, 0, -23, 6.5, 6.5, lk.skin);
  const hc = lk.hairCol;
  if (dir === 3) ell(c, 0, -24, 7, 6.5, hc);
  else { ell(c, 0, -27, 7, 4, hc); if (['long', 'pony', 'wavy', 'braid'].includes(lk.hair)) { rect(c, -7, -27, 2.5, 9, hc); rect(c, 4.5, -27, 2.5, 9, hc); }
    if (lk.hair === 'bun') ell(c, 0, -31, 3, 2.5, hc);
    if (dir === 0) { rect(c, -3, -23, 1.6, 2, '#111'); rect(c, 1.4, -23, 1.6, 2, '#111'); } else rect(c, dir === 1 ? -4 : 2.4, -23, 1.6, 2, '#111'); }
  if (lk.extra === 'hat') poly(c, [-8, -27, 8, -27, 2, -36], lk.cloth2);
  if (lk.extra === 'cap') rect(c, -7, -30, 14, 3, lk.cloth);
  c.restore();
}

// ---------------------------------------------------------------- monsters
// drawn standing on (x, y); k = scale (1 = a normal monster about 90 px tall); t = time for idle motion
export function monster(c, art, hue, x, y, k, t = 0, o = {}) {
  c.save(); c.translate(x, y); c.scale(o.flip ? -k : k, k);
  // HD-2D mode: darker, less saturated, more natural colours (shading and outline are added by the sprite stamp)
  const b = Math.sin(t * 2.4 + hue) * 2, main = o.hd ? H(hue, 26, 38) : H(hue, 45, 45), dark = o.hd ? H(hue, 28, 20) : H(hue, 45, 28), light = o.hd ? H(hue, 30, 56) : H(hue, 55, 65);
  if (!o.hd) ell(c, 0, 0, 34, 7, 'rgba(0,0,0,.35)');
  if (o.flash) c.filter = 'brightness(2.2)';
  const draw = DRAW[art] || DRAW.ooze;
  HDM = !!o.hd; draw(c, { main, dark, light, hue, b, t }); HDM = false;
  c.restore();
}
const DRAW = {
  ooze(c, { main, dark, light, b }) { ell(c, 0, -22 + b * 0.5, 34 - b, 24 + b, main); ell(c, -10, -34, 9, 6, light); eyes(c, 0, -26, 9, 4.5); c.beginPath(); c.arc(0, -16, 6, 0, Math.PI); c.strokeStyle = dark; c.lineWidth = 2; c.stroke(); },
  beast(c, { main, dark, light, b }) {
    poly(c, [26, -40, 46, -58 + b, 34, -34], main); ell(c, 0, -36, 30, 17, main); ell(c, -4, -30, 22, 9, light);
    for (const lx of [-20, -8, 10, 22]) rect(c, lx - 3, -26, 6, 26, dark);
    ell(c, -30, -50 + b, 15, 13, main); poly(c, [-40, -62 + b, -36, -76 + b, -30, -60 + b], dark); poly(c, [-26, -62 + b, -20, -76 + b, -18, -58 + b], dark);
    poly(c, [-44, -50 + b, -58, -44 + b, -42, -40 + b], main); ell(c, -57, -45 + b, 2.5, 2, '#111'); ell(c, -36, -53 + b, 2.6, 2.2, '#ffe060'); line(c, -50, -40 + b, -42, -38 + b, '#fff', 2);
  },
  insect(c, { main, dark, light, b, t }) {
    for (let i = 0; i < 3; i++) { const lx = -14 + i * 14; line(c, lx, -24, lx - 14, 0, dark, 3); line(c, lx, -24, lx + 12, 0, dark, 3); }
    ell(c, 22, -30, 20, 15, main); ell(c, 0, -30, 12, 11, dark); ell(c, -22, -34 + b * 0.5, 13, 12, main);
    eyes(c, -26, -38 + b * 0.5, 5, 4, '#ff4040', '#300'); line(c, -26, -46, -36, -66, dark, 2); line(c, -20, -46, -14, -66, dark, 2);
    c.globalAlpha = 0.45; ell(c, 6, -50, 22, 9, light, -0.4 + Math.sin(t * 20) * 0.2); c.globalAlpha = 1;
  },
  plant(c, { main, dark, light, b, hue }) {
    line(c, 0, 0, 0, -50, H(120, 40, 30), 7); ell(c, -16, -20, 16, 6, H(120, 45, 38), -0.5); ell(c, 16, -28, 16, 6, H(120, 45, 38), 0.5);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + b * 0.05; ell(c, Math.cos(a) * 18, -64 + Math.sin(a) * 18, 13, 9, main, a); }
    ell(c, 0, -64, 14, 14, H(hue + 40, 60, 55)); c.beginPath(); c.arc(0, -62, 8, 0.1, Math.PI - 0.1); c.fillStyle = '#300'; c.fill();
    for (let i = -2; i <= 2; i++) poly(c, [i * 3 - 1.5, -61, i * 3 + 1.5, -61, i * 3, -56], '#fff'); eyes(c, 0, -70, 6, 2.6, '#ffe', '#300');
  },
  undead(c, { main, b }) {
    const bone = '#e8e0cc', sh = '#a8a090';
    line(c, -8, 0, -6, -30, bone, 4); line(c, 8, 0, 6, -30, bone, 4);
    for (let i = 0; i < 4; i++) line(c, -12, -38 - i * 6, 12, -38 - i * 6, bone, 3); line(c, 0, -30, 0, -62, sh, 4);
    line(c, -13, -60, -24, -36 + b, bone, 4); line(c, 13, -60, 22, -40 + b, bone, 4); line(c, 22, -40 + b, 30, -76 + b, '#b8c0d0', 4); line(c, 18, -46 + b, 28, -46 + b, '#8a6a3a', 3);
    ell(c, 0, -74, 13, 13, bone); ell(c, -5, -74, 4, 4.5, '#120c10'); ell(c, 5, -74, 4, 4.5, '#120c10'); ell(c, -5, -74, 1.5, 1.5, main); ell(c, 5, -74, 1.5, 1.5, main); rect(c, -6, -64, 12, 4, sh);
  },
  ghost(c, { main, light, b, t }) {
    c.globalAlpha = 0.82; c.beginPath(); c.moveTo(-26, -20 + b); c.quadraticCurveTo(-28, -84 + b, 0, -86 + b); c.quadraticCurveTo(28, -84 + b, 26, -20 + b);
    for (let i = 0; i < 5; i++) c.quadraticCurveTo(20 - i * 11, -8 + b + Math.sin(t * 5 + i) * 5, 15 - i * 11, -20 + b);
    c.fillStyle = light; c.fill(); c.globalAlpha = 1;
    ell(c, -9, -58 + b, 5, 8, '#1a1030'); ell(c, 9, -58 + b, 5, 8, '#1a1030'); ell(c, 0, -42 + b, 6, 7, '#1a1030'); ell(c, -9, -60 + b, 1.6, 2, main);
  },
  human(c, { main, dark, light, b }) {
    rect(c, -10, -30, 8, 30, '#3a3040'); rect(c, 2, -30, 8, 30, '#3a3040');
    poly(c, [-20, -30, 20, -30, 15, -70, -15, -70], main); rect(c, -15, -40, 30, 5, dark);
    ell(c, 0, -80, 11, 12, '#e0b890'); poly(c, [-14, -80, 14, -80, 9, -96, -9, -96], dark); rect(c, -12, -82, 24, 4, dark);
    ell(c, -4, -79, 1.6, 1.8, '#111'); ell(c, 4, -79, 1.6, 1.8, '#111');
    line(c, 18, -64, 30, -40 + b, main, 6); line(c, 30, -40 + b, 34, -92 + b, '#c8ccd8', 4); line(c, 25, -48 + b, 37, -46 + b, '#8a6a3a', 4);
    line(c, -18, -64, -26, -42, main, 6); ell(c, -28, -44, 11, 13, light);
  },
  reptile(c, { main, dark, light, b }) {
    poly(c, [12, -14, 50, -6 + b, 46, 0, 8, -6], main); rect(c, -10, -28, 7, 28, dark); rect(c, 4, -28, 7, 28, dark);
    ell(c, 0, -46, 17, 24, main); ell(c, 0, -42, 10, 18, light);
    ell(c, -4, -76, 13, 11, main); poly(c, [-14, -76, -34, -72 + b * 0.5, -14, -68], main); ell(c, -10, -80, 2.6, 2.6, '#ffe040'); ell(c, -10, -80, 1, 2.2, '#111');
    for (let i = 0; i < 4; i++) poly(c, [4, -88 + i * 9, 14, -84 + i * 9, 4, -80 + i * 9], dark);
    line(c, 14, -56, 30, -40 + b, main, 6);
  },
  aquatic(c, { main, dark, light, b }) {
    rect(c, -9, -24, 7, 24, dark); rect(c, 3, -24, 7, 24, dark);
    ell(c, 0, -44, 18, 24, main); ell(c, 0, -40, 10, 16, light);
    ell(c, 0, -76, 15, 13, main); poly(c, [0, -88, 12, -104 + b, 10, -84], dark); poly(c, [15, -80, 30, -86, 26, -70], dark);
    eyes(c, -1, -78, 6, 4, '#f8ffd0', '#003'); line(c, -6, -68, 6, -68, dark, 2);
    line(c, -18, -60, -32, -96 + b, '#c8b080', 4); for (const dx of [-38, -32, -26]) line(c, -32, -96 + b, dx, -108 + b, '#c8b080', 3);
  },
  bird(c, { main, dark, light, b, t }) {
    const w = Math.sin(t * 9) * 16;
    poly(c, [-6, -52, -60, -78 - w, -48, -44, -26, -46], dark); poly(c, [6, -52, 60, -78 - w, 48, -44, 26, -46], dark);
    ell(c, 0, -46 + b, 16, 22, main); ell(c, 0, -40 + b, 10, 14, light);
    ell(c, 0, -74 + b, 12, 11, main); poly(c, [-4, -72 + b, 4, -72 + b, 0, -60 + b], '#f0b030'); eyes(c, 0, -77 + b, 5, 2.6, '#ffe', '#200');
    line(c, -6, -26, -8, 0, '#d0a030', 3); line(c, 6, -26, 8, 0, '#d0a030', 3);
  },
  demon(c, { main, dark, light, b, t }) {
    const w = Math.sin(t * 4) * 6;
    poly(c, [-10, -66, -56, -96 - w, -46, -58, -36, -64, -30, -46], dark); poly(c, [10, -66, 56, -96 - w, 46, -58, 36, -64, 30, -46], dark);
    rect(c, -11, -30, 9, 30, dark); rect(c, 2, -30, 9, 30, dark);
    poly(c, [-18, -30, 18, -30, 20, -70, -20, -70], main); ell(c, 0, -60, 12, 8, light);
    ell(c, 0, -82, 13, 13, main); poly(c, [-10, -90, -20, -112, -4, -94], '#e8e0c8'); poly(c, [10, -90, 20, -112, 4, -94], '#e8e0c8');
    ell(c, -5, -83, 3, 2, '#ffe040'); ell(c, 5, -83, 3, 2, '#ffe040'); poly(c, [-6, -74, 6, -74, 0, -70], '#fff');
    poly(c, [16, -20, 34, -6 + b, 30, -24], main);
  },
  dragon(c, { main, dark, light, b, t }) {
    const w = Math.sin(t * 3) * 10;
    poly(c, [0, -60, -70, -110 - w, -60, -60, -40, -56], dark); poly(c, [10, -60, 60, -118 - w, 64, -66, 44, -56], dark);
    poly(c, [30, -24, 76, -10 + b, 70, -2, 26, -12], main);
    ell(c, 6, -40, 38, 26, main); ell(c, 0, -34, 26, 14, light);
    for (const lx of [-20, 24]) rect(c, lx - 6, -24, 12, 24, dark);
    poly(c, [-20, -50, -36, -86 + b, -24, -90 + b, -8, -56], main);
    ell(c, -36, -94 + b, 17, 12, main); poly(c, [-48, -94 + b, -70, -88 + b, -50, -82 + b], main);
    poly(c, [-32, -104 + b, -26, -122 + b, -22, -102 + b], '#e8e0c8'); poly(c, [-42, -104 + b, -42, -120 + b, -36, -102 + b], '#e8e0c8');
    ell(c, -42, -98 + b, 3, 2.4, '#ffe040'); for (let i = 0; i < 3; i++) poly(c, [-62 + i * 5, -86 + b, -58 + i * 5, -86 + b, -60 + i * 5, -82 + b], '#fff');
  },
  construct(c, { main, dark, light, b, t }) {
    rect(c, -22, -30, 16, 30, dark); rect(c, 6, -30, 16, 30, dark);
    rect(c, -30, -78, 60, 50, main); rect(c, -24, -70, 48, 8, light); rect(c, -12, -60, 24, 22, dark);
    ell(c, 0, -49, 6, 6, H((t * 60) % 360, 80, 60));
    rect(c, -46, -76, 14, 42 + b, main); rect(c, 32, -76, 14, 42 - b, main);
    rect(c, -18, -100, 36, 22, main); rect(c, -12, -94, 24, 6, '#111'); rect(c, -10, -93, 20, 4, H(0, 90, 55 + Math.sin(t * 6) * 10));
  },
  elemental(c, { main, light, hue, t }) {
    for (let i = 0; i < 9; i++) { const a = t * 2 + i / 9 * TAU, r = 30 + Math.sin(t * 3 + i) * 6; c.globalAlpha = 0.55; ell(c, Math.cos(a) * r, -50 + Math.sin(a) * r * 0.6, 8, 8, light); }
    c.globalAlpha = 1; const g = c.createRadialGradient(0, -50, 4, 0, -50, 30); g.addColorStop(0, '#fff'); g.addColorStop(0.4, light); g.addColorStop(1, H(hue, 60, 40, 0.2));
    ell(c, 0, -50, 30, 30, g); eyes(c, 0, -52, 8, 3.5, '#fff', H(hue, 80, 25));
  },
  fae(c, { main, dark, light, b, t }) {
    const w = Math.sin(t * 14) * 8; c.globalAlpha = 0.6; ell(c, -18, -56 + b, 16, 24 + w * 0.3, light, -0.5); ell(c, 18, -56 + b, 16, 24 + w * 0.3, light, 0.5); c.globalAlpha = 1;
    rect(c, -7, -26 + b, 5, 18, dark); rect(c, 2, -26 + b, 5, 18, dark);
    poly(c, [-13, -24 + b, 13, -24 + b, 8, -54 + b, -8, -54 + b], main);
    ell(c, 0, -66 + b, 13, 13, H(100, 35, 55)); poly(c, [-12, -68 + b, -28, -74 + b, -12, -60 + b], H(100, 35, 55)); poly(c, [12, -68 + b, 28, -74 + b, 12, -60 + b], H(100, 35, 55));
    eyes(c, 0, -67 + b, 5, 3, '#ffe060', '#300'); c.beginPath(); c.arc(0, -60 + b, 5, 0.1, Math.PI - 0.1); c.strokeStyle = '#300'; c.lineWidth = 2; c.stroke();
    poly(c, [-8, -78 + b, 0, -94 + b, 8, -78 + b], dark);
  },
  god(c, { main, dark, light, hue, b, t }) {
    c.globalAlpha = 0.5; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, -84, 48 + i * 10 + Math.sin(t * 2 + i) * 4, 0, TAU); c.strokeStyle = H(hue, 80, 60); c.lineWidth = 3; c.stroke(); } c.globalAlpha = 1;
    poly(c, [-40, 0, 40, 0, 26, -70, -26, -70], dark);
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.45; line(c, Math.cos(a) * 20, -80 + Math.sin(a) * 20, Math.cos(a) * 70, -84 + Math.sin(a) * 60 + Math.sin(t * 3 + i) * 6, main, 7); }
    ell(c, 0, -86 + b, 24, 26, main); ell(c, 0, -86 + b, 16, 18, '#0a0010');
    for (const [ex, ey] of [[-7, -92], [7, -92], [0, -80], [-12, -82], [12, -82]]) { ell(c, ex, ey + b, 3, 2.2, light); ell(c, ex, ey + b, 1, 1.6, '#fff'); }
    poly(c, [-14, -110 + b, -6, -130 + b, 0, -112 + b, 6, -130 + b, 14, -110 + b], H(hue, 70, 55));
  },
};

// ---------------------------------------------------------------- places
export const THEMES = {
  cave: { floor: '#4a4038', wall: '#2a221c', top: '#5a4e44', bg: ['#1a1410', '#3a2e24'] }, ruins: { floor: '#7a6a50', wall: '#4a3e2e', top: '#9a8a6a', bg: ['#2a2418', '#6a5a3a'] },
  fort: { floor: '#6a6460', wall: '#3a3634', top: '#8a8480', bg: ['#1a1a20', '#4a4448'] }, sewer: { floor: '#3a4a44', wall: '#222c28', top: '#4a5a54', bg: ['#0e1614', '#2a3a34'] },
  tomb: { floor: '#5a5048', wall: '#2e2824', top: '#7a6e60', bg: ['#14100c', '#3a3028'] }, swamp: { floor: '#3a4a2a', wall: '#1e2a16', top: '#4a5e34', bg: ['#0e160a', '#2e3e1e'] },
  forest: { floor: '#3a5a2a', wall: '#1a3418', top: '#4a7a34', bg: ['#0e1a0c', '#2e5a26'] }, tower: { floor: '#6a6070', wall: '#3a3444', top: '#8a8098', bg: ['#141024', '#3a345a'] },
  mine: { floor: '#5a4a3a', wall: '#2a2018', top: '#7a6450', bg: ['#140e08', '#3e2e1e'] }, factory: { floor: '#5a5a60', wall: '#2a2a30', top: '#7a7a84', bg: ['#141418', '#4a3a2a'] },
  ice: { floor: '#9ab8d0', wall: '#4a6a8a', top: '#c8e0f0', bg: ['#1a2a40', '#6a8ab0'] }, castle: { floor: '#6a6a7a', wall: '#34344a', top: '#8a8aa0', bg: ['#10101e', '#3a3a5a'] },
  desert: { floor: '#c8a870', wall: '#8a6a40', top: '#e0c890', bg: ['#4a3018', '#c89a5a'] }, mountain: { floor: '#6a6458', wall: '#3a362e', top: '#8a8474', bg: ['#1e1c1a', '#5a5040'] },
  sea: { floor: '#3a6a7a', wall: '#1a3a4a', top: '#4a8a9a', bg: ['#081a24', '#2a5a6a'] }, volcano: { floor: '#5a3a2a', wall: '#2a1410', top: '#8a4a2a', bg: ['#1a0604', '#8a2a10'] },
  sky: { floor: '#d8d8e8', wall: '#8a8aa8', top: '#f0f0f8', bg: ['#4a7ac8', '#c8e0ff'] }, void: { floor: '#3a2a4a', wall: '#14081e', top: '#5a3a6a', bg: ['#06000c', '#3a104a'] },
};
export function tile(c, theme, kind, x, y, s, seed) {
  const T = THEMES[theme] || THEMES.cave;
  if (kind === 0) { rect(c, x, y, s, s, T.wall); rect(c, x, y, s, s * 0.22, T.top); if (seed % 5 === 0) rect(c, x + s * 0.3, y + s * 0.5, s * 0.25, s * 0.12, 'rgba(0,0,0,.25)'); return; }
  rect(c, x, y, s, s, T.floor);
  if (seed % 7 === 0) ell(c, x + s * 0.3, y + s * 0.6, s * 0.12, s * 0.07, 'rgba(0,0,0,.18)');
  if (seed % 11 === 3) ell(c, x + s * 0.7, y + s * 0.3, s * 0.08, s * 0.05, 'rgba(255,255,255,.12)');
  if (theme === 'forest' && seed % 9 === 1) { line(c, x + s * 0.4, y + s * 0.8, x + s * 0.45, y + s * 0.55, '#6aaa4a', 2); }
}
export function battleBg(c, theme, w, h, t) {
  const T = THEMES[theme] || THEMES.cave, g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, T.bg[0]); g.addColorStop(0.62, T.bg[1]); g.addColorStop(0.62, T.floor); g.addColorStop(1, T.wall); rect(c, 0, 0, w, h, g);
  c.globalAlpha = 0.18; for (let i = 0; i < 9; i++) ell(c, (i * 137 + 60) % w, h * 0.63, 90, 14, T.top); c.globalAlpha = 1;
  if (theme === 'void' || theme === 'sky') for (let i = 0; i < 40; i++) ell(c, (i * 97) % w, (i * 53) % (h * 0.55), 1.3, 1.3, `rgba(255,255,255,${0.3 + 0.3 * Math.sin(t * 2 + i)})`);
}
const TOWN_COL = { castle: ['#2a3050', '#c8b080'], village: ['#2a3a2a', '#c89a6a'], forest: ['#1a3a22', '#7aaa5a'], port: ['#1a3a50', '#e0d0b0'], industrial: ['#2a2a2e', '#a07050'],
  snow: ['#3a4a6a', '#e8eef8'], desert: ['#6a4a2a', '#f0d8a0'], mountain: ['#2a2a2a', '#9a8a7a'], eastern: ['#2a2238', '#c84a4a'], holy: ['#4a6aa8', '#fff8e0'] };
export function townArt(c, style, w, h, t) {
  const [sky, wall] = TOWN_COL[style] || TOWN_COL.village, g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, sky); g.addColorStop(1, '#0a0a12'); rect(c, 0, 0, w, h, g);
  for (let i = 0; i < 30; i++) ell(c, (i * 131) % w, (i * 47) % (h * 0.4), 1, 1, `rgba(255,255,255,${0.2 + 0.2 * Math.sin(t + i)})`);
  const base = h * 0.78;
  for (let i = 0; i < 9; i++) {
    const bx = i * w / 9 + (i % 2) * 14, bw = w / 9 - 6, bh = 60 + ((i * 37) % 70);
    rect(c, bx, base - bh, bw, bh, '#14141c');
    if (style === 'eastern') poly(c, [bx - 8, base - bh, bx + bw + 8, base - bh, bx + bw / 2, base - bh - 26], '#14141c');
    else if (style === 'desert') ell(c, bx + bw / 2, base - bh, bw / 2, 18, '#14141c');
    else poly(c, [bx - 4, base - bh, bx + bw + 4, base - bh, bx + bw / 2, base - bh - 30], '#14141c');
    for (let wy = base - bh + 14; wy < base - 10; wy += 20) for (let wx = bx + 8; wx < bx + bw - 8; wx += 16) if ((wx * 7 + wy * 3 + i) % 5) rect(c, wx, wy, 6, 8, `rgba(255,${200 + ((wx + wy) % 40)},120,${0.5 + 0.3 * Math.sin(t * 2 + wx)})`);
  }
  if (style === 'castle' || style === 'holy') { rect(c, w * 0.42, base - 190, w * 0.16, 190, '#101018'); poly(c, [w * 0.4, base - 190, w * 0.6, base - 190, w * 0.5, base - 250], '#101018'); }
  rect(c, 0, base, w, h - base, '#0e0e14'); rect(c, 0, base, w, 3, wall);
}

// ---------------------------------------------------------------- the world map
let landCache = null;
export function worldMap(c, w, h, S, t, hover) {
  if (!landCache) {
    landCache = document.createElement('canvas'); landCache.width = 960; landCache.height = 540;
    const g = landCache.getContext('2d'), sea = g.createLinearGradient(0, 0, 0, 540); sea.addColorStop(0, '#16304a'); sea.addColorStop(1, '#0c1e34'); rect(g, 0, 0, 960, 540, sea);
    const blobs = Object.values(DB.locations).filter((l) => !['d_skyruins', 'sanctum'].includes(l.id));
    for (const pass of [0, 1]) for (const l of blobs) {
      const rr = l.sea ? 52 : 74;
      for (let i = 0; i < 7; i++) { const a = i * 0.9 + l.x, d = (i % 3) * 16; ell(g, l.x + Math.cos(a) * d, l.y + Math.sin(a) * d * 0.7, (rr - i * 3) * (pass ? 0.9 : 1.08), (rr - i * 3) * (pass ? 0.66 : 0.8),
        pass ? regionCol(l) : '#c8b88a'); }
    }
    for (let i = 0; i < 260; i++) { const x = (i * 211) % 960, y = (i * 97) % 540; const px = g.getImageData(x, y, 1, 1).data; if (px[2] < 120) ell(g, x, y, 3, 2, 'rgba(0,0,0,.12)'); }
    // mountains along the north and east
    for (let i = 0; i < 26; i++) { const x = 380 + (i * 37) % 480, y = 20 + (i * 53) % 150; const px = g.getImageData(x, y, 1, 1).data; if (px[2] < 120) poly(g, [x - 10, y + 8, x, y - 10, x + 10, y + 8], 'rgba(60,50,40,.6)'); }
  }
  c.drawImage(landCache, 0, 0, w, h);
  const sx = w / 960, sy = h / 540;
  for (const l of Object.values(DB.locations)) {
    if (!S.known[l.id]) continue;
    const x = l.x * sx, y = l.y * sy, here = S.loc === l.id, hov = hover === l.id, cleared = l.dungeon && S.cleared[l.id];
    if (l.kind === 'town') { rect(c, x - 7, y - 6, 14, 10, here ? '#ffe070' : '#f0e0c0'); poly(c, [x - 9, y - 6, x + 9, y - 6, x, y - 15], here ? '#ffb040' : '#c04a3a'); }
    else { ell(c, x, y, 7, 7, cleared ? '#6a8a6a' : DB.dungeons[l.dungeon].stone && !cleared ? '#ffd040' : '#a03a4a'); ell(c, x, y, 3, 3, '#1a1010'); }
    if (here || hov) { c.beginPath(); c.arc(x, y - 3, 14 + Math.sin(t * 4) * 2, 0, TAU); c.strokeStyle = here ? '#ffe070' : '#fff'; c.lineWidth = 2; c.stroke(); }
  }
}
function regionCol(l) {
  const map = { aldoria: '#7a9a5a', sage: '#9a9a5a', green: '#4a8a4a', iron: '#8a7a6a', north: '#c8d8e8', desert: '#d8b878', east: '#7aa07a', south: '#8ab07a', sky: '#d8e8f8' };
  return map[l.region] || (l.y < 120 ? '#a8b8c8' : l.y > 420 && l.x < 700 ? '#d0b070' : l.x > 600 ? '#8a8a6a' : '#6a9a5a');
}
export const resetMap = () => { landCache = null; };

// ---------------------------------------------------------------- battle sprites (16-bit style, about 32 px tall)
// a hero standing on (x, y) facing left. pose: idle | step | atk | cast | hurt | def | ko | win. wtype: the weapon in hand
const px = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
export function battler(c, id, x, y, pose = 'idle', t = 0, wtype = 'sword', phase = 0) {
  const d = DB.chars[id], lk = d.look, f = d.gender === 'f', skin = lk.skin, cl = lk.cloth, c2 = lk.cloth2, hc = lk.hairCol;
  c.save(); c.translate(Math.round(x), Math.round(y));
  px(c, -8, -1, 16, 2, 'rgba(0,0,0,.35)');
  if (pose === 'ko') { // lying on the ground
    px(c, -14, -6, 10, 5, cl); px(c, -4, -5, 9, 4, '#3a3040'); px(c, -20, -7, 7, 6, skin); px(c, -21, -8, 7, 3, hc); c.restore(); return;
  }
  const bob = pose === 'idle' ? (Math.sin(t * 3) > 0.6 ? -1 : 0) : 0, lean = pose === 'hurt' ? 3 : pose === 'atk' ? -2 : 0, crouch = pose === 'def' ? 3 : 0;
  c.translate(lean, bob + crouch);
  // legs (the front leg steps out when attacking)
  const step = pose === 'atk' || pose === 'step' ? 3 : 0;
  px(c, -4 - step, -11, 3, 11, '#3a3046'); px(c, 1, -11, 3, 11, '#2e2638'); px(c, -5 - step, -2, 4, 2, '#2a1e18'); px(c, 1, -2, 4, 2, '#2a1e18');
  if (f && lk.extra !== 'armor') px(c, -6, -14, 12, 6, cl);
  // body
  px(c, -6, -22, 12, 11, cl); px(c, -6, -13, 12, 2, c2); px(c, -2, -22, 4, 2, c2);
  if (lk.extra === 'armor') { px(c, -7, -22, 4, 3, '#c8ccd8'); px(c, 3, -22, 4, 3, '#c8ccd8'); }
  // back arm
  px(c, 4, -21, 3, 8, cl); px(c, 4, -14, 3, 2, skin);
  // head, facing left
  px(c, -5, -31, 9, 9, skin); px(c, -6, -28, 1, 2, skin);
  px(c, -4, -27, 2, 2, '#1a1418'); px(c, -4, -27, 1, 1, '#fff');
  if (f) px(c, -5, -25, 2, 1, 'rgba(255,120,120,.6)');
  switch (lk.hair) {
    case 'bald': break;
    case 'spiky': px(c, -5, -34, 10, 4, hc); px(c, -3, -36, 2, 2, hc); px(c, 1, -37, 2, 3, hc); px(c, 4, -35, 2, 2, hc); px(c, 2, -31, 4, 6, hc); break;
    case 'long': case 'wavy': case 'braid': px(c, -5, -34, 10, 4, hc); px(c, 1, -31, 5, 13, hc); if (lk.hair === 'braid') px(c, 4, -18, 2, 5, hc); break;
    case 'pony': px(c, -5, -34, 10, 4, hc); px(c, 2, -31, 4, 5, hc); px(c, 5, -32, 3, 12, hc); break;
    case 'bun': px(c, -5, -34, 10, 4, hc); px(c, 2, -31, 4, 6, hc); px(c, 0, -38, 5, 4, hc); break;
    case 'messy': px(c, -6, -34, 11, 4, hc); px(c, -6, -31, 2, 2, hc); px(c, 3, -35, 3, 2, hc); px(c, 2, -31, 4, 6, hc); break;
    default: px(c, -5, -34, 10, 4, hc); px(c, 2, -31, 4, 6, hc);
  }
  switch (lk.extra) {
    case 'cap': px(c, -6, -35, 11, 3, cl); px(c, -9, -33, 4, 1, c2); break;
    case 'hat': px(c, -8, -35, 15, 2, c2); px(c, -3, -41, 7, 6, c2); px(c, 0, -44, 3, 3, c2); break;
    case 'shades': px(c, -4, -34, 7, 2, '#202028'); break;
    case 'goggles': px(c, -6, -33, 11, 2, '#5a4030'); px(c, -5, -33, 3, 2, '#7ac8e8'); break;
    case 'ribbon': px(c, 3, -36, 4, 3, '#c02a3a'); break;
    case 'veil': px(c, -6, -27, 6, 4, 'rgba(160,40,90,.7)'); break;
    case 'beard': px(c, -6, -25, 7, 4, hc); break;
    case 'eyepatch': px(c, -5, -28, 3, 3, '#111'); break;
    case 'mask': px(c, -6, -27, 9, 4, '#1a1a24'); break;
    case 'hood': px(c, -6, -35, 12, 4, c2); px(c, 3, -33, 4, 12, c2); break;
    case 'feather': px(c, 3, -38, 2, 5, '#e84a4a'); break;
  }
  // front arm and the weapon in hand
  const ang = pose === 'atk' ? (phase < 0.5 ? -2.2 + phase * 4 : -0.2) : pose === 'cast' || pose === 'win' ? -2.5 : -0.4;
  c.save(); c.translate(-4, -20); c.rotate(ang);
  px(c, -1, 0, 3, 8, cl); px(c, -1, 7, 3, 2, skin);
  c.translate(0, 8); weaponArt(c, wtype);
  c.restore();
  if (pose === 'cast') { c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 20); px(c, -14, -40, 4, 4, '#fff6a0'); c.globalAlpha = 1; }
  if (pose === 'def') px(c, -10, -22, 3, 11, '#a8acc0');
  c.restore();
}
function weaponArt(c, type) {
  const steel = '#dfe4ee', wood = '#8a5a2a', gold = '#d8b060';
  switch (type) {
    case 'sword': px(c, -2, 1, 5, 1, gold); px(c, 0, 2, 2, 12, steel); break;
    case 'greatsword': px(c, -2, 1, 6, 2, gold); px(c, -1, 3, 4, 17, steel); px(c, 0, 3, 1, 17, '#fff'); break;
    case 'katana': px(c, -1, 1, 4, 1, gold); px(c, 0, 2, 2, 13, steel); px(c, 1, 14, 1, 2, steel); break;
    case 'rapier': px(c, -2, 0, 5, 2, gold); px(c, 0, 2, 1, 15, steel); break;
    case 'dagger': px(c, -1, 1, 4, 1, gold); px(c, 0, 2, 2, 6, steel); break;
    case 'axe': px(c, 0, -4, 2, 16, wood); px(c, -5, 8, 6, 6, steel); break;
    case 'mace': px(c, 0, 0, 2, 10, wood); px(c, -2, 9, 6, 5, '#a8a8b8'); break;
    case 'spear': px(c, 0, -10, 1, 26, wood); px(c, -1, 15, 3, 5, steel); break;
    case 'bow': c.strokeStyle = wood; c.lineWidth = 2; c.beginPath(); c.arc(-3, 4, 9, -1.2, 1.2); c.stroke(); px(c, 1, -4, 1, 16, '#e8e8e8'); break;
    case 'staff': px(c, 0, -8, 2, 22, wood); px(c, -1, 13, 4, 4, '#7ad8ff'); break;
    case 'whip': c.strokeStyle = '#6a3a1a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(10, 8, 2, 18); c.stroke(); break;
    case 'scythe': px(c, 0, -6, 2, 24, wood); px(c, -8, 16, 9, 2, steel); px(c, -9, 14, 2, 3, steel); break;
    case 'thrown': px(c, -2, 0, 5, 1, steel); px(c, 0, -2, 1, 5, steel); break;
    case 'gun': px(c, -1, 0, 3, 4, wood); px(c, 0, 4, 2, 9, '#5a5a66'); break;
    default: break; // bare hands
  }
}

// ---------------------------------------------------------------- painted battle backgrounds (16-bit style layers)
const band = (c, y0, y1, cols, W) => { const n = cols.length; for (let i = 0; i < n; i++) px(c, 0, y0 + (y1 - y0) * i / n, W, Math.ceil((y1 - y0) / n) + 1, cols[i]); };
function shades(hex, n, dl) { const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return Array.from({ length: n }, (_, i) => { const k = 1 + dl * (i / (n - 1) - 0.5); return `rgb(${Math.min(255, r * k) | 0},${Math.min(255, g * k) | 0},${Math.min(255, b * k) | 0})`; }); }
const LAYERS = { cave: 'rocks', mine: 'rocks', mountain: 'peaks', ruins: 'pillars', tomb: 'pillars', castle: 'castle', fort: 'castle', tower: 'castle', sewer: 'pipes', factory: 'pipes',
  forest: 'trees', swamp: 'trees', ice: 'peaks', desert: 'dunes', sea: 'waves', volcano: 'peaks', sky: 'clouds', void: 'stars' };
export function pixelBg(c, theme, W, H, t) {
  const T = THEMES[theme] || THEMES.cave, hz = Math.round(H * 0.46), r = (i) => ((i * 9301 + 49297) % 233280) / 233280;
  band(c, 0, hz, [...shades(T.bg[0], 3, 0.5), ...shades(T.bg[1], 4, 0.4)], W);
  const kind = LAYERS[theme] || 'rocks', far = shades(T.wall, 3, 0.5);
  if (['stars', 'clouds', 'dunes', 'peaks', 'waves'].includes(kind)) for (let i = 0; i < 40; i++) px(c, r(i) * W, r(i + 99) * hz * 0.7, 1, 1, `rgba(255,255,255,${0.3 + 0.4 * Math.sin(t * 2 + i)})`);
  for (let layer = 0; layer < 2; layer++) {
    const col = layer ? T.wall : far[0], baseY = hz - (layer ? 0 : 6);
    for (let x = -20, i = layer * 50; x < W + 20; i++) {
      const w = 14 + r(i) * 30, h = (layer ? 26 : 44) * (0.5 + r(i + 7));
      if (kind === 'peaks' || kind === 'rocks') { c.fillStyle = col; c.beginPath(); c.moveTo(x, baseY); c.lineTo(x + w / 2, baseY - h); c.lineTo(x + w, baseY); c.fill(); if (kind === 'peaks') px(c, x + w / 2 - 2, baseY - h, 4, 3, theme === 'volcano' ? '#ff6a2a' : '#e8f0ff'); }
      else if (kind === 'trees') { px(c, x + w / 2 - 2, baseY - h * 0.4, 4, h * 0.4, '#2a1a10'); c.fillStyle = layer ? T.top : far[1]; c.beginPath(); c.moveTo(x, baseY - h * 0.3); c.lineTo(x + w / 2, baseY - h * 1.3); c.lineTo(x + w, baseY - h * 0.3); c.fill(); }
      else if (kind === 'pillars') { if (i % 2) { px(c, x + 4, baseY - h * 1.4, 10, h * 1.4, col); px(c, x + 2, baseY - h * 1.4, 14, 4, T.top); } }
      else if (kind === 'castle') { px(c, x, baseY - h, w, h, col); for (let k = 0; k < w; k += 6) px(c, x + k, baseY - h - 4, 4, 4, col); if (layer && i % 2) px(c, x + w / 2 - 2, baseY - h * 0.6, 4, 6, '#ffd070'); }
      else if (kind === 'pipes') { px(c, x, baseY - h, 6, h, col); px(c, x - 2, baseY - h, 10, 3, T.top); if (layer) px(c, x, baseY - h * 0.5, w, 4, col); }
      else if (kind === 'dunes') { c.fillStyle = layer ? T.top : far[2]; c.beginPath(); c.ellipse(x + w, baseY, w * 1.4, h * 0.5, 0, Math.PI, 0); c.fill(); }
      else if (kind === 'waves') { for (let k = 0; k < w; k += 8) px(c, x + k, baseY - 3 - ((k + i + Math.floor(t * 4)) % 3), 6, 2, layer ? '#9ad8f0' : T.top); }
      else if (kind === 'clouds') { c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.ellipse(x + w, baseY - h * 0.8, w, h * 0.25, 0, 0, 7); c.fill(); }
      else if (kind === 'stars') { if (i % 3 === 0) px(c, x, baseY - h, w * 0.6, h * 0.3, far[2]); }
      x += w * (layer ? 0.9 : 1.1);
    }
  }
  // the ground, banded towards the viewer, with perspective lines
  band(c, hz, H, shades(T.floor, 6, 0.7), W);
  c.globalAlpha = 0.18; for (let i = -10; i < 12; i++) { c.strokeStyle = T.wall; c.lineWidth = 1; c.beginPath(); c.moveTo(W / 2 + i * 14, hz); c.lineTo(W / 2 + i * 70, H); c.stroke(); } c.globalAlpha = 1;
  for (let i = 0; i < 30; i++) px(c, r(i + 300) * W, hz + 4 + r(i + 400) * (H - hz), 2, 1, T.wall);
  if (theme === 'volcano') for (let i = 0; i < 8; i++) px(c, r(i + 500) * W, hz + r(i + 600) * (H - hz), 6, 1, '#ff5a1a');
}
