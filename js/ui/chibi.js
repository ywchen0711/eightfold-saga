// The heroes, drawn in the Chosen Ones style: little 16px four-direction people (coart.js) shown at twice size, with a
// tiny pixel weapon in hand. Battle poses lean, swing the weapon and fall over; each pose is drawn once and cached.
import { DB } from '../data/index.js';
import { person, LOOKS } from './coart.js';

export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f));
  return '#' + c.map((v) => ('0' + Math.max(0, Math.min(255, v)).toString(16)).slice(-2)).join('');
}
export const CW = 48, CH = 44, FOOT = 42;           // the sprite box (twice the 24 x 22 pixel drawing) and where the feet are
const cache = new Map();
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// each character's costume in the Chosen Ones style (colours come from their own look)
const STYLE = {
  jeff: { style: 'short', extra: 'goggles' }, erin: { style: 'long', robe: 1 }, josh: { style: 'spiky' }, jasper: { style: 'short', extra: 'cap', small: 1 },
  lyra: { style: 'dancer' }, gareth: { style: 'helmet' }, chizuru: { style: 'long', extra: 'ribbon' }, morrow: { style: 'wizard', nobeard: 1 },
  bram: { style: 'beard' }, agnes: { style: 'nun' }, tova: { style: 'long' }, lin: { style: 'bald' }, quill: { style: 'wizard', nobeard: 1 },
  rook: { style: 'long', extra: 'eyepatch' }, elio: { style: 'short', extra: 'feather' }, kaz: { style: 'short', extra: 'scar' },
  hexa: { style: 'wizard', nobeard: 1 }, kage: { style: 'helmet', extra: 'mask' },
};
const BY_HAIR = { spiky: 'spiky', bald: 'bald', long: 'long', wavy: 'long', braid: 'long', pony: 'dancer', bun: 'long', hood: 'nun', mask: 'helmet' };
export function lookOf(id) {
  const key = 'efs_' + id; if (LOOKS[key]) return key;
  const d = DB.chars[id], lk = (d && d.look) || {};
  LOOKS[key] = { skin: lk.skin || '#f0c8a0', hair: lk.hairCol || '#4a3020', cloth: lk.cloth || '#5a7ab0', cloth2: lk.cloth2 || '#e0c060', ...(STYLE[id] || { style: BY_HAIR[lk.hair] || 'short' }) };
  return key;
}

// tiny weapons, drawn pointing up (-y) from the hand at (0, 0); rotated a quarter turn they point at the enemy
const BL = '#e8eef8', BLD = '#9aa4b8', WD = '#8a5a2a', GD = '#e0b84a';
const WEAPON = {
  sword: (R) => { R(0, -7, 1, 6, BL); R(-1, -1, 3, 1, GD); R(0, 0, 1, 2, WD); },
  greatsword: (R) => { R(0, -9, 2, 8, BL); R(1, -9, 1, 8, BLD); R(-1, -1, 4, 1, GD); R(0, 0, 2, 2, WD); },
  katana: (R) => { R(0, -8, 1, 7, '#f4f6fc'); R(1, -8, 1, 2, BLD); R(-1, -1, 3, 1, '#2a2a2a'); R(0, 0, 1, 2, '#a02a2a'); },
  rapier: (R) => { R(0, -8, 1, 7, BL); R(-1, -1, 3, 1, GD); R(-1, 0, 1, 1, GD); R(0, 0, 1, 2, WD); },
  dagger: (R) => { R(0, -3, 1, 3, BL); R(-1, 0, 3, 1, GD); },
  axe: (R) => { R(0, -7, 1, 9, WD); R(-3, -7, 3, 3, BLD); R(-3, -7, 1, 3, BL); },
  mace: (R) => { R(0, -5, 1, 7, WD); R(-1, -8, 3, 3, '#b8bcc8'); R(-1, -8, 1, 1, '#ffffff'); },
  spear: (R) => { R(0, -10, 1, 13, WD); R(0, -12, 1, 2, BL); R(-1, -10, 3, 1, BL); },
  bow: (R) => { R(-1, -5, 1, 1, WD); R(-2, -4, 1, 8, WD); R(-1, 4, 1, 1, WD); R(0, -5, 1, 10, '#e8e8e8'); },
  martial: () => {},
  none: () => {},
  staff: (R) => { R(0, -8, 1, 11, WD); R(-1, -10, 3, 2, '#7ad8ff'); R(0, -10, 1, 1, '#ffffff'); },
  whip: (R) => { R(0, -1, 1, 2, WD); R(-1, -3, 1, 2, '#6a4a2a'); R(-2, -5, 1, 2, '#6a4a2a'); R(-1, -7, 1, 2, '#6a4a2a'); },
  scythe: (R) => { R(0, -9, 1, 12, '#4a3a3a'); R(-4, -9, 4, 1, BLD); R(-5, -8, 2, 1, BLD); R(-4, -10, 4, 1, BL); },
  thrown: (R) => { R(0, -3, 1, 3, '#c8ccd8'); R(-1, -2, 3, 1, '#c8ccd8'); },
  gun: (R) => { R(0, -5, 1, 5, '#4a4a52'); R(-1, -5, 1, 4, '#2a2a30'); R(0, 0, 2, 2, WD); },
};
const ATK = { atk: 1, smash: 1, throw: 1 }, LEVEL = { thrust: 1, aim: 1 };

// pose: idle | step | atk | smash | thrust | aim | throw | cast | hurt | def | ko | win; frame 0 = wind-up, 1 = strike
export function chibi(id, pose = 'idle', frame = 0, wtype = 'sword', dir = 'left') {
  const key = `${id}|${pose}|${frame}|${wtype}|${dir}`; let cv = cache.get(key); if (cv) return cv;
  const s = mk(24, 22), g = s.getContext('2d'); g.imageSmoothingEnabled = false;
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const look = lookOf(id), OX = 4, OY = 5;
  if (pose === 'ko') {
    g.save(); g.translate(OX + 8, OY + 16); g.rotate(-Math.PI / 2); g.drawImage(person(look, 'down', 0), -16, -8); g.restore();
  } else {
    const d = pose === 'win' ? 'down' : dir, side = d === 'right' ? 1 : -1;
    const strike = (ATK[pose] || LEVEL[pose]) && frame === 1, lean = pose === 'hurt' ? -side : strike ? side * (pose === 'thrust' ? 2 : 1) : ATK[pose] ? -side : 0;
    const walk = pose === 'idle' || pose === 'step' || pose === 'win' ? frame : 0;
    const hx = OX + lean + (d === 'right' || d === 'up' ? 12 : 3), hy = OY + 11 - (pose === 'win' || pose === 'cast' || (ATK[pose] && !frame) ? 3 : 0);
    const w = WEAPON[wtype] || WEAPON.sword;
    const drawWeapon = () => {
      g.save(); g.translate(hx, hy);
      if (strike || LEVEL[pose]) g.rotate(side * Math.PI / 2);
      w(R); g.restore();
      if (pose === 'cast') { R(hx - 1, hy - 13, 1, 1, '#fff6a0'); R(hx + 2, hy - 12, 1, 1, '#ffffff'); R(hx - 3, hy - 10, 1, 1, '#fff6a0'); }
    };
    if (d === 'up' && !(pose === 'throw' && frame)) drawWeapon();
    g.drawImage(person(look, d, walk), OX + lean, OY);
    if (pose === 'def') { R(OX + lean + (side < 0 ? 0 : 12), OY + 8, 4, 5, '#8a96b0'); R(OX + lean + (side < 0 ? 1 : 13), OY + 9, 2, 3, '#c8d0e0'); }
    if (d !== 'up' && !(pose === 'throw' && frame)) drawWeapon();
  }
  cv = mk(CW, CH); const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(s, 0, 0, CW, CH);
  cache.set(key, cv); return cv;
}
// draw a hero standing with their feet at (fx, fy), each pixel of the 2x drawing `k` screen pixels.
// o.dir: up | down | left | right (battle: left, toward the enemies); o.flip (older callers) means facing right
export function drawChibi(c, id, fx, fy, k, pose, frame, wtype, o = {}) {
  const img = chibi(id, pose, frame, wtype, o.dir || (o.flip ? 'right' : 'left'));
  c.save(); c.imageSmoothingEnabled = false;
  if (o.alpha != null) c.globalAlpha = o.alpha;
  c.drawImage(img, Math.round(fx - (CW / 2) * k), Math.round(fy - FOOT * k), CW * k, CH * k);
  c.restore();
}
// a portrait: the little hero close up, head and shoulders (64 x 64 box)
export function portraitChibi(c, id, x, y, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = '#000'; c.fillRect(0, 0, 64, 64);
  const g = c.createRadialGradient(32, 26, 2, 32, 32, 44); g.addColorStop(0, '#2a3a6a'); g.addColorStop(1, '#0a0e22'); c.fillStyle = g; c.fillRect(2, 2, 60, 60);
  c.imageSmoothingEnabled = false;
  c.drawImage(person(lookOf(id), 'down', 0), 0, 0, 16, 14, 0, 8, 64, 56);
  c.restore();
}
