// HD-2D art: detailed pixel sprites (heroes with adult proportions and three-tone shading, monsters shaded and
// outlined) placed in soft, lit dioramas — hazy distance, depth-of-field blur, light shafts, drifting particles,
// colour grading and vignettes. Sprites are drawn at pixel resolution and scaled up crisp; scenery stays smooth.
import { DB } from '../data/index.js';
import { monster as vectorMonster, THEMES } from './art.js';

// ---------------------------------------------------------------- colour helpers
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const hex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
// f > 0: towards a warm light; f < 0: towards a cool shadow
export function tone(h, f) { const c = rgb(h); return hex(f >= 0 ? c.map((v, i) => v + ([255, 244, 220][i] - v) * f) : c.map((v, i) => v * (1 + f) + [10, 8, 30][i] * -f)); }
export const mix = (a, b, k) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * k)); };
const P = (c, x, y, w, h, col) => { if (w <= 0 || h <= 0) return; c.fillStyle = col; c.fillRect(x, y, w, h); };
// a block with light on its left edge and shadow on its right and bottom: the basic shaded pixel shape
function S(c, x, y, w, h, base) { P(c, x, y, w, h, base); P(c, x, y, 1, h, tone(base, 0.22)); P(c, x + w - 1, y, 1, h, tone(base, -0.35)); P(c, x, y + h - 1, w, 1, tone(base, -0.3)); }

// ---------------------------------------------------------------- scratch canvases
function scratch() { const cv = document.createElement('canvas'); return [cv, cv.getContext('2d')]; }
const [sprCv, spr] = scratch(), [silCv, sil] = scratch();
const [rim, rc] = scratch();
let grainPat = null;
// a sparse pattern of light and dark pixels that gives flat shapes the texture of hand-made pixel art
function grain() {
  if (grainPat) return grainPat;
  const [cv, c] = scratch(); cv.width = cv.height = 32;
  for (let i = 0; i < 32 * 32; i++) { const r = (Math.sin(i * 12.9898) * 43758.5453) % 1; const v = Math.abs(r); if (v < 0.12) { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(i % 32, i >> 5, 1, 1); } else if (v > 0.93) { c.fillStyle = 'rgba(255,240,220,.22)'; c.fillRect(i % 32, i >> 5, 1, 1); } }
  grainPat = spr.createPattern(cv, 'repeat'); return grainPat;
}
// draw `fn` into a sprite canvas (w x h pixels, origin at (ox, oy)), outline it, then stamp it scaled `k` on `c`
// with its feet at (x, y)
export function stamp(c, x, y, k, w, h, ox, oy, fn, o = {}) {
  if (sprCv.width < w + 4 || sprCv.height < h + 4) { sprCv.width = silCv.width = Math.max(sprCv.width, w + 4); sprCv.height = silCv.height = Math.max(sprCv.height, h + 4); }
  spr.setTransform(1, 0, 0, 1, 0, 0); spr.clearRect(0, 0, sprCv.width, sprCv.height); spr.imageSmoothingEnabled = false;
  spr.save(); spr.translate(ox + 2, oy + 2); if (o.flip) spr.scale(-1, 1); fn(spr); spr.restore();
  if (o.shade) { // light from the upper left over the whole sprite
    spr.globalCompositeOperation = 'source-atop';
    const g = spr.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(255,236,200,.28)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(6,4,24,.5)');
    spr.fillStyle = g; spr.fillRect(0, 0, w + 4, h + 4);
    spr.fillStyle = grain(); spr.globalAlpha = 0.5; spr.fillRect(0, 0, w + 4, h + 4); spr.globalAlpha = 1;   // pixel grain
    spr.globalCompositeOperation = 'source-over';
    // rim light: pixels whose upper-left neighbour is empty catch the light
    rim.width = sprCv.width; rim.height = sprCv.height; rc.clearRect(0, 0, rim.width, rim.height);
    rc.drawImage(sprCv, 0, 0); rc.globalCompositeOperation = 'source-in'; rc.fillStyle = 'rgba(255,236,196,.55)'; rc.fillRect(0, 0, rim.width, rim.height);
    rc.globalCompositeOperation = 'destination-out'; rc.drawImage(sprCv, 1, 1); rc.globalCompositeOperation = 'source-over';
    spr.drawImage(rim, 0, 0);
  }
  sil.setTransform(1, 0, 0, 1, 0, 0); sil.clearRect(0, 0, silCv.width, silCv.height);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) sil.drawImage(sprCv, dx, dy);
  sil.globalCompositeOperation = 'source-in'; sil.fillStyle = o.outline || '#0a0612'; sil.fillRect(0, 0, silCv.width, silCv.height); sil.globalCompositeOperation = 'source-over';
  if (o.flash) { spr.globalCompositeOperation = 'source-atop'; spr.fillStyle = 'rgba(255,255,255,.75)'; spr.fillRect(0, 0, w + 4, h + 4); spr.globalCompositeOperation = 'source-over'; }
  const dx = Math.round(x - (ox + 2) * k), dy = Math.round(y - (oy + 2) * k);
  c.save(); c.imageSmoothingEnabled = false;
  c.drawImage(silCv, 0, 0, w + 4, h + 4, dx, dy, (w + 4) * k, (h + 4) * k);
  c.drawImage(sprCv, 0, 0, w + 4, h + 4, dx, dy, (w + 4) * k, (h + 4) * k);
  c.restore();
}
// a soft shadow under a sprite
export function shadow(c, x, y, rx, ry, a = 0.45) { const g = c.createRadialGradient(x, y, 0, x, y, rx); g.addColorStop(0, `rgba(0,0,8,${a})`); g.addColorStop(1, 'rgba(0,0,8,0)'); c.save(); c.translate(x, y); c.scale(1, ry / rx); c.translate(-x, -y); c.fillStyle = g; c.beginPath(); c.arc(x, y, rx, 0, 7); c.fill(); c.restore(); }

// ---------------------------------------------------------------- heroes (about 60 px tall, facing left)
const ROBE = new Set(['erin', 'morrow', 'agnes', 'quill', 'hexa']), CAPE = new Set(['gareth', 'morrow', 'chizuru', 'elio', 'rook', 'kaz']);
export const HERO_BOX = { w: 44, h: 72, ox: 22, oy: 68 };
export function heroSprite(c, id, pose = 'idle', t = 0, wtype = 'sword', phase = 0) {
  const d = DB.chars[id], lk = d.look, f = d.gender === 'f', kid = id === 'jasper' ? 0.86 : id === 'josh' ? 0.94 : 1;
  const skin = lk.skin, cl = lk.cloth, c2 = lk.cloth2, hc = lk.hairCol, pants = mix(cl, '#202030', 0.55), boot = '#2e221c';
  if (pose === 'ko') { // fallen on the ground
    S(c, -22, -7, 14, 6, cl); S(c, -9, -6, 16, 5, pants); S(c, 7, -5, 5, 4, boot); S(c, -30, -9, 9, 8, skin); S(c, -31, -10, 9, 4, hc); return;
  }
  c.save(); c.scale(kid, kid);
  const breathe = pose === 'idle' ? Math.round(Math.sin(t * 2.2) * 0.6) : 0, lean = pose === 'hurt' ? 3 : pose === 'atk' ? -3 : 0, crouch = pose === 'def' ? 3 : 0;
  c.translate(lean, crouch);
  // cape behind the body, swaying
  if (CAPE.has(id)) { const sway = Math.round(Math.sin(t * 2 + 1) * 1.5); c.fillStyle = tone(c2, -0.25); c.beginPath(); c.moveTo(-3, -42); c.lineTo(6, -42); c.lineTo(10 + sway, -12); c.lineTo(-1 + sway, -14); c.fill(); P(c, 5, -42, 2, 28, tone(c2, -0.45)); }
  // legs: back leg in shadow, front leg steps out to strike
  const step = pose === 'atk' || pose === 'step' ? 4 : 0;
  if (ROBE.has(id)) { c.fillStyle = cl; c.beginPath(); c.moveTo(-6, -28); c.lineTo(6, -28); c.lineTo(9, -2); c.lineTo(-8 - step, -2); c.fill(); P(c, 6, -26, 3, 24, tone(cl, -0.35)); P(c, -7 - step, -4, 15 + step, 2, tone(cl, -0.3)); S(c, -8 - step, -2, 6, 2, boot); S(c, 3, -2, 6, 2, boot); }
  else {
    S(c, 1, -25, 4, 20, tone(pants, -0.25)); S(c, 0, -6, 6, 6, tone(boot, -0.2));
    S(c, -4 - step, -25, 4, 20, pants); S(c, -6 - step, -6, 7, 6, boot); P(c, -6 - step, -6, 7, 1, tone(boot, 0.3));
  }
  // hips and the torso (shoulders wider than the waist)
  S(c, -6, -29, 12, 5, f && !ROBE.has(id) ? cl : tone(cl, -0.1));
  if (f && !ROBE.has(id) && lk.extra !== 'armor') { c.fillStyle = cl; c.beginPath(); c.moveTo(-7, -27); c.lineTo(7, -27); c.lineTo(9, -15); c.lineTo(-9, -15); c.fill(); P(c, 6, -27, 3, 12, tone(cl, -0.35)); }
  c.translate(0, breathe);
  c.fillStyle = cl; c.beginPath(); c.moveTo(-7, -46); c.lineTo(7, -46); c.lineTo(6, -28); c.lineTo(-6, -28); c.fill();
  P(c, -7, -46, 2, 18, tone(cl, 0.2)); P(c, 4, -46, 3, 18, tone(cl, -0.32));
  P(c, -1, -46, 3, 13, c2); P(c, -1, -46, 1, 13, tone(c2, 0.3));            // tunic opening / collar
  S(c, -7, -30, 14, 2, '#3a2418'); P(c, -2, -30, 3, 2, '#d8b060');            // belt and buckle
  if (lk.extra === 'armor') { S(c, -9, -47, 7, 5, '#b8bcc8'); S(c, 3, -47, 7, 5, '#8a8ea0'); S(c, -6, -44, 12, 8, '#c8ccd8'); }
  // back arm
  S(c, 4, -45, 4, 13, tone(cl, -0.3)); S(c, 4, -33, 4, 3, tone(skin, -0.25));
  // neck and head (a 3/4 face looking left)
  P(c, -2, -49, 4, 4, tone(skin, -0.15));
  S(c, -6, -60, 11, 12, skin); P(c, -7, -55, 1, 3, skin);                     // face with a nose
  P(c, 2, -60, 3, 12, tone(skin, -0.22));                                    // the shaded far side
  P(c, -5, -55, 2, 1, '#241418'); P(c, -1, -55, 2, 1, '#241418');              // eyes
  P(c, -5, -56, 2, 1, tone(hc, -0.2)); P(c, -1, -56, 2, 1, tone(hc, -0.2));    // brows
  P(c, -5, -51, 3, 1, tone(skin, -0.3));                                     // mouth
  if (f) P(c, -6, -53, 2, 1, 'rgba(220,110,110,.55)');
  // hair, with a highlight strand
  const hl = tone(hc, 0.35), hs = tone(hc, -0.3);
  switch (lk.hair) {
    case 'bald': P(c, -6, -61, 11, 2, tone(skin, -0.1)); break;
    case 'spiky': S(c, -7, -63, 13, 5, hc); P(c, -6, -66, 2, 3, hc); P(c, -2, -67, 2, 4, hc); P(c, 2, -66, 3, 3, hc); P(c, 2, -60, 4, 7, hs); P(c, -5, -63, 6, 1, hl); break;
    case 'long': case 'wavy': S(c, -7, -63, 13, 5, hc); P(c, 1, -61, 6, 20, hs); P(c, 0, -61, 2, 18, hc); P(c, -7, -60, 2, 4, hc); P(c, -5, -62, 6, 1, hl); break;
    case 'braid': S(c, -7, -63, 13, 5, hc); P(c, 2, -60, 5, 10, hs); for (let i = 0; i < 4; i++) S(c, 4, -50 + i * 4, 3, 4, hc); P(c, -5, -62, 6, 1, hl); break;
    case 'pony': S(c, -7, -63, 13, 5, hc); P(c, 2, -60, 4, 6, hs); S(c, 6, -62, 3, 3, '#d8b060'); c.fillStyle = hc; c.beginPath(); c.moveTo(8, -61); c.lineTo(12 + Math.sin(t * 3), -42); c.lineTo(8, -44); c.fill(); P(c, -5, -62, 6, 1, hl); break;
    case 'bun': S(c, -7, -63, 13, 5, hc); P(c, 2, -60, 4, 7, hs); S(c, 0, -68, 6, 5, hc); P(c, -6, -60, 2, 6, hc); P(c, -5, -62, 6, 1, hl); break;
    case 'messy': S(c, -8, -63, 14, 5, hc); P(c, -8, -60, 3, 3, hc); P(c, 3, -66, 3, 3, hc); P(c, -3, -65, 3, 2, hc); P(c, 2, -60, 4, 7, hs); P(c, -6, -62, 7, 1, hl); break;
    case 'hood': case 'mask': S(c, -7, -63, 13, 5, hc); P(c, 2, -60, 4, 6, hs); break;
    default: S(c, -7, -63, 13, 5, hc); P(c, 2, -60, 4, 7, hs); P(c, -5, -62, 6, 1, hl);
  }
  switch (lk.extra) {
    case 'cap': S(c, -8, -65, 14, 4, cl); P(c, -12, -62, 5, 1, tone(c2, -0.2)); break;
    case 'hat': S(c, -11, -64, 21, 2, c2); c.fillStyle = c2; c.beginPath(); c.moveTo(-6, -64); c.lineTo(6, -64); c.lineTo(2, -78); c.fill(); P(c, 1, -76, 2, 12, tone(c2, -0.3)); break;
    case 'shades': S(c, -6, -64, 9, 2, '#18141c'); P(c, -5, -64, 2, 1, '#8aa0c0'); break;
    case 'goggles': S(c, -8, -63, 14, 2, '#5a4030'); S(c, -7, -64, 4, 3, '#c8a060'); P(c, -6, -63, 2, 1, '#8ad8f8'); break;
    case 'ribbon': S(c, 4, -68, 5, 4, '#b02a3a'); P(c, 6, -64, 2, 6, '#b02a3a'); break;
    case 'veil': c.fillStyle = 'rgba(150,40,80,.65)'; c.fillRect(-8, -54, 8, 7); break;
    case 'beard': S(c, -7, -53, 9, 5, hc); P(c, -6, -52, 3, 1, tone(skin, -0.3)); break;
    case 'eyepatch': P(c, -6, -56, 3, 3, '#0e0a0c'); P(c, -6, -58, 11, 1, '#0e0a0c'); break;
    case 'mask': S(c, -7, -54, 11, 5, '#1a1a26'); break;
    case 'hood': c.fillStyle = c2; c.beginPath(); c.moveTo(-8, -55); c.lineTo(-6, -66); c.lineTo(5, -66); c.lineTo(9, -46); c.lineTo(4, -46); c.lineTo(3, -60); c.lineTo(-5, -60); c.fill(); P(c, 5, -64, 3, 18, tone(c2, -0.35)); break;
    case 'feather': P(c, 4, -71, 2, 8, '#d84a4a'); P(c, 5, -73, 2, 3, '#f08a8a'); break;
    case 'scar': P(c, -3, -58, 1, 5, '#a05050'); break;
  }
  // the front arm and weapon (raised to swing, raised to cast, or held at rest)
  const ang = pose === 'atk' ? (phase < 0.45 ? -2.4 + phase * 4.6 : -0.3) : pose === 'cast' || pose === 'win' ? -2.6 : pose === 'def' ? -1.2 : -0.35;
  c.save(); c.translate(-5, -44); c.rotate(ang);
  S(c, -2, 0, 4, 12, cl); P(c, -2, 0, 1, 12, tone(cl, 0.25)); S(c, -2, 11, 4, 3, skin);
  c.translate(0, 13); heroWeapon(c, wtype);
  c.restore();
  if (pose === 'def') { S(c, -13, -44, 5, 16, '#9a9eb0'); P(c, -13, -44, 1, 16, '#e0e4f0'); }
  c.restore();
}
function heroWeapon(c, type) {
  const st = '#c8ccd8', sl = '#f4f6ff', sd = '#7a7e90', wood = '#7a4a22', gold = '#d0a848';
  const blade = (x, y, w, h) => { P(c, x, y, w, h, st); P(c, x, y, 1, h, sl); P(c, x + w - 1, y, 1, h, sd); };
  switch (type) {
    case 'sword': S(c, -3, 0, 7, 2, gold); blade(-1, 2, 3, 17); P(c, 0, 19, 1, 2, st); break;
    case 'greatsword': S(c, -4, 0, 9, 2, gold); blade(-2, 2, 5, 24); P(c, -1, 26, 3, 2, st); break;
    case 'katana': S(c, -2, 0, 5, 2, '#1a1a1a'); blade(-1, 2, 2, 20); P(c, 0, 22, 2, 2, st); break;
    case 'rapier': S(c, -3, -1, 7, 3, gold); P(c, 0, 2, 1, 21, sl); break;
    case 'dagger': S(c, -2, 0, 5, 2, gold); blade(-1, 2, 3, 8); break;
    case 'axe': S(c, -1, -6, 2, 24, wood); S(c, -8, 10, 8, 9, st); P(c, -8, 10, 1, 9, sl); break;
    case 'mace': S(c, -1, 0, 2, 14, wood); S(c, -3, 13, 6, 6, '#9a9aa8'); P(c, -1, 19, 2, 2, '#9a9aa8'); break;
    case 'spear': S(c, -1, -14, 2, 34, wood); c.fillStyle = st; c.beginPath(); c.moveTo(-2, 20); c.lineTo(2, 20); c.lineTo(0, 28); c.fill(); break;
    case 'bow': c.strokeStyle = wood; c.lineWidth = 2; c.beginPath(); c.arc(-4, 6, 12, -1.25, 1.25); c.stroke(); P(c, 0, -5, 1, 22, '#e8e0d0'); break;
    case 'staff': S(c, -1, -12, 2, 32, wood); S(c, -2, 18, 4, 4, '#4a8ad0'); P(c, -1, 19, 1, 1, '#d0f0ff'); break;
    case 'whip': c.strokeStyle = '#5a2a10'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(12, 6, -6, 14, 6, 24); c.stroke(); break;
    case 'scythe': S(c, -1, -10, 2, 34, wood); c.fillStyle = st; c.beginPath(); c.moveTo(1, 22); c.quadraticCurveTo(-8, 22, -14, 14); c.lineTo(-10, 20); c.quadraticCurveTo(-4, 26, 1, 25); c.fill(); break;
    case 'thrown': P(c, -3, 0, 7, 1, st); P(c, 0, -3, 1, 7, st); break;
    case 'gun': S(c, -2, 0, 4, 5, wood); S(c, -1, 5, 3, 12, '#4a4a56'); P(c, -1, 5, 1, 12, '#8a8a9a'); break;
  }
}

// ---------------------------------------------------------------- monsters: the vector designs, shaded, outlined and pixelated
export function monsterSprite(c, art, hue, x, y, k, t, o = {}) {
  // drawn at pixel resolution (about a third of screen size) then scaled up crisp
  const px = o.px || 3, kk = k / px, w = Math.ceil(170 * kk), h = Math.ceil(170 * kk);
  stamp(c, x, y, px, w, h, w / 2, h - 6 * kk, (cx) => vectorMonster(cx, art, hue, 0, 0, kk, t, { flip: !!o.flip, hd: 1 }), { shade: 1, flash: o.flash });
}

// ---------------------------------------------------------------- dioramas: battle backgrounds
const DIO = {
  cave: { sky: ['#07060a', '#15111a', '#241c24'], haze: '#3a2e34', kind: 'rocks', light: '#ffb070', part: 'dust', grade: 'rgba(40,24,10,.16)' },
  mine: { sky: ['#08060a', '#1a1210', '#2e2016'], haze: '#3e2e22', kind: 'beams', light: '#ffa850', part: 'dust', grade: 'rgba(60,30,8,.18)' },
  mountain: { sky: ['#1a1e30', '#4a4a60', '#9a8a80'], haze: '#8a8090', kind: 'peaks', light: '#fff0d0', part: 'dust', grade: 'rgba(30,30,60,.1)' },
  ruins: { sky: ['#1a1810', '#4a4030', '#a08a60'], haze: '#8a7a5a', kind: 'pillars', light: '#ffe0a0', part: 'dust', grade: 'rgba(70,50,10,.14)' },
  tomb: { sky: ['#06060a', '#141218', '#22201e'], haze: '#2e2a28', kind: 'pillars', light: '#a0c0ff', part: 'motes', grade: 'rgba(10,20,50,.2)' },
  castle: { sky: ['#0a0a18', '#1e1e34', '#3a3448'], haze: '#4a4458', kind: 'castle', light: '#ffd8a0', part: 'motes', grade: 'rgba(30,20,60,.14)' },
  fort: { sky: ['#101420', '#2e3448', '#6a6070'], haze: '#5a5868', kind: 'castle', light: '#ffe0b0', part: 'dust', grade: 'rgba(30,30,40,.12)' },
  tower: { sky: ['#0a0818', '#24204a', '#4a3e70'], haze: '#5a4e7a', kind: 'castle', light: '#d0c0ff', part: 'motes', grade: 'rgba(40,20,80,.16)' },
  sewer: { sky: ['#040806', '#0e1814', '#1a2a24'], haze: '#22342c', kind: 'pipes', light: '#a0ffd0', part: 'drip', grade: 'rgba(10,40,30,.2)' },
  factory: { sky: ['#0c0a0a', '#262020', '#4a3428'], haze: '#4a3a30', kind: 'pipes', light: '#ffb060', part: 'ember', grade: 'rgba(60,30,10,.18)' },
  forest: { sky: ['#0a140c', '#1e3a22', '#5a7a4a'], haze: '#3a5a3e', kind: 'trees', light: '#f0ffb0', part: 'firefly', grade: 'rgba(20,50,20,.14)' },
  swamp: { sky: ['#0a100a', '#1a2a18', '#3a4a2a'], haze: '#3a4a30', kind: 'trees', light: '#c0ff90', part: 'firefly', grade: 'rgba(30,50,10,.18)' },
  ice: { sky: ['#0e1a30', '#3a5a88', '#a8c8e8'], haze: '#9ab8d8', kind: 'peaks', light: '#e8f4ff', part: 'snow', grade: 'rgba(40,80,140,.14)' },
  desert: { sky: ['#2a1a2a', '#a05a3a', '#f0b070'], haze: '#d8a070', kind: 'dunes', light: '#fff0c0', part: 'dust', grade: 'rgba(120,60,10,.12)' },
  sea: { sky: ['#06121e', '#12364a', '#2a6a7a'], haze: '#3a7a88', kind: 'waves', light: '#b0f0ff', part: 'bubble', grade: 'rgba(10,50,70,.18)' },
  volcano: { sky: ['#140404', '#4a0e08', '#a02a10'], haze: '#7a2a14', kind: 'peaks', light: '#ff8040', part: 'ember', grade: 'rgba(120,20,0,.18)' },
  sky: { sky: ['#3a6ab0', '#88b0e0', '#e8f0ff'], haze: '#c8d8f0', kind: 'clouds', light: '#ffffff', part: 'motes', grade: 'rgba(80,120,200,.08)' },
  void: { sky: ['#030008', '#120424', '#2a0a3a'], haze: '#3a1450', kind: 'void', light: '#d080ff', part: 'motes', grade: 'rgba(60,0,90,.2)' },
};
const rnd = (i) => ((Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1;
const cache = new Map();
// the static diorama for a theme at a size, drawn once and reused
export function diorama(theme, W, H, hz = 0.46) {
  const key = `${theme}:${W}:${H}:${hz}`; if (cache.has(key)) return cache.get(key);
  if (cache.size > 6) cache.clear();
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  const D = DIO[theme] || DIO.cave, T = THEMES[theme] || THEMES.cave, Y = H * hz;
  // sky
  let g = c.createLinearGradient(0, 0, 0, Y); g.addColorStop(0, D.sky[0]); g.addColorStop(0.6, D.sky[1]); g.addColorStop(1, D.sky[2]); c.fillStyle = g; c.fillRect(0, 0, W, Y + 2);
  const sun = c.createRadialGradient(W * 0.72, Y * 0.35, 0, W * 0.72, Y * 0.35, W * 0.45); sun.addColorStop(0, D.light + '55'); sun.addColorStop(1, D.light + '00'); c.fillStyle = sun; c.fillRect(0, 0, W, Y);
  if (['void', 'castle', 'tower', 'mountain', 'ice', 'desert'].includes(theme)) for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(255,255,255,${0.15 + rnd(i) * 0.5})`; c.fillRect(rnd(i + 1) * W, rnd(i + 2) * Y * 0.7, 1.5, 1.5); }
  // far layer (hazy, blurred), then mid layer (sharper)
  const layer = (depth, blur, col, base, scale) => {
    c.save(); c.filter = `blur(${blur}px)`; c.fillStyle = col;
    const kind = D.kind;
    for (let i = 0, x = -60; x < W + 60; i++) {
      const w = (40 + rnd(i * 3 + depth) * 90) * scale, h = (60 + rnd(i * 7 + depth) * 120) * scale;
      c.beginPath();
      if (kind === 'peaks' || kind === 'rocks' || kind === 'void') { c.moveTo(x - w * 0.2, base); c.lineTo(x + w * 0.45, base - h * (kind === 'rocks' ? 0.7 : 1.1)); c.lineTo(x + w * 0.6, base - h * 0.9); c.lineTo(x + w * 1.2, base); }
      else if (kind === 'trees') { c.rect(x + w * 0.45, base - h * 0.5, w * 0.1, h * 0.5); c.moveTo(x, base - h * 0.35); c.lineTo(x + w * 0.5, base - h * 1.25); c.lineTo(x + w, base - h * 0.35); c.moveTo(x + w * 0.1, base - h * 0.65); c.lineTo(x + w * 0.5, base - h * 1.45); c.lineTo(x + w * 0.9, base - h * 0.65); }
      else if (kind === 'pillars') { if (i % 2) { c.rect(x + w * 0.3, base - h * 1.4, w * 0.3, h * 1.4); c.rect(x + w * 0.22, base - h * 1.44, w * 0.46, h * 0.08); } else { c.rect(x, base - h * 0.35, w * 0.9, h * 0.35); } }
      else if (kind === 'castle') { c.rect(x, base - h, w * 0.8, h); for (let k = 0; k < w * 0.8; k += 10 * scale) c.rect(x + k, base - h - 8 * scale, 6 * scale, 8 * scale); if (i % 3 === 0) { c.rect(x + w * 0.2, base - h * 1.7, w * 0.3, h * 0.7); c.moveTo(x + w * 0.15, base - h * 1.7); c.lineTo(x + w * 0.35, base - h * 2.1); c.lineTo(x + w * 0.55, base - h * 1.7); } }
      else if (kind === 'pipes' || kind === 'beams') { c.rect(x, base - h * 1.3, 12 * scale, h * 1.3); c.rect(x - 4 * scale, base - h * 1.3, 20 * scale, 6 * scale); if (i % 2) c.rect(x, base - h * 0.8, w, 8 * scale); }
      else if (kind === 'dunes') { c.ellipse(x + w, base, w * 1.5, h * 0.35, 0, Math.PI, 0); }
      else if (kind === 'waves') { c.ellipse(x + w / 2, base, w * 0.7, h * 0.1, 0, Math.PI, 0); }
      else if (kind === 'clouds') { c.ellipse(x + w / 2, base - h * 0.4, w * 0.9, h * 0.22, 0, 0, 7); }
      c.fill();
      x += w * 0.85;
    }
    c.restore();
  };
  layer(1, 4, mix(D.haze, D.sky[2], 0.45), Y + 4, 1.1);
  layer(2, 1.5, mix(T.wall, D.haze, 0.35), Y + 8, 0.75);
  // light shafts falling across the scene
  c.save(); c.globalCompositeOperation = 'screen';
  for (let i = 0; i < 4; i++) { const x0 = W * (0.15 + i * 0.22 + rnd(i + 40) * 0.08); g = c.createLinearGradient(x0, 0, x0 + W * 0.12, H * 0.75); g.addColorStop(0, D.light + '30'); g.addColorStop(1, D.light + '00');
    c.fillStyle = g; c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 + W * 0.05, 0); c.lineTo(x0 + W * 0.2, H * 0.78); c.lineTo(x0 + W * 0.1, H * 0.78); c.fill(); }
  c.restore();
  // the floor: receding tiles in perspective with a pool of light where the fight happens
  g = c.createLinearGradient(0, Y, 0, H); g.addColorStop(0, mix(T.floor, D.haze, 0.45)); g.addColorStop(0.35, T.floor); g.addColorStop(1, mix(T.wall, '#000000', 0.4)); c.fillStyle = g; c.fillRect(0, Y, W, H - Y);
  c.save(); c.globalAlpha = 0.22; c.strokeStyle = mix(T.wall, '#000000', 0.3); c.lineWidth = 1;
  for (let i = -16; i <= 16; i++) { c.beginPath(); c.moveTo(W / 2 + i * W * 0.03, Y); c.lineTo(W / 2 + i * W * 0.16, H); c.stroke(); }
  for (let r = 1; r < 9; r++) { const yy = Y + (H - Y) * Math.pow(r / 9, 1.8); c.beginPath(); c.moveTo(0, yy); c.lineTo(W, yy); c.stroke(); }
  c.restore();
  for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(0,0,0,${0.08 + rnd(i + 900) * 0.12})`; const yy = Y + rnd(i + 700) * (H - Y); c.fillRect(rnd(i + 800) * W, yy, 2 + (yy - Y) / 40, 1 + (yy - Y) / 90); }
  const pool = c.createRadialGradient(W * 0.5, H * 0.66, 0, W * 0.5, H * 0.66, W * 0.5); pool.addColorStop(0, D.light + '30'); pool.addColorStop(1, D.light + '00'); c.fillStyle = pool; c.fillRect(0, Y, W, H - Y);
  // foreground objects, close to the camera and out of focus
  c.save(); c.filter = `blur(${Math.max(4, W / 160)}px)`; c.fillStyle = mix(T.wall, '#000000', 0.55);
  for (const [sx, sy, r] of [[0.02, 1.02, 0.12], [0.98, 1.04, 0.14], [0.12, 1.08, 0.08], [0.88, 1.1, 0.07]]) { c.beginPath(); c.ellipse(W * sx, H * sy, W * r, H * r * 1.4, 0, 0, 7); c.fill(); }
  if (D.kind === 'trees' || D.kind === 'pillars') for (const sx of [0.015, 0.975]) c.fillRect(W * sx - W * 0.02, 0, W * 0.045, H);
  c.restore();
  // colour grade and vignette
  c.fillStyle = D.grade; c.fillRect(0, 0, W, H);
  const v = c.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.3, W / 2, H * 0.55, Math.max(W, H) * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.62)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
  cache.set(key, cv); return cv;
}
// drifting particles over a scene: dust, embers, snow, fireflies, bubbles, motes, drips
export function particles(c, theme, W, H, t, n = 46) {
  const D = DIO[theme] || DIO.cave, kind = D.part;
  c.save(); c.globalCompositeOperation = kind === 'dust' || kind === 'drip' ? 'source-over' : 'lighter';
  for (let i = 0; i < n; i++) {
    const sp = 0.3 + rnd(i) * 0.7, ph = rnd(i + 50) * 100;
    let x = rnd(i + 3) * W, y;
    if (kind === 'snow') { y = ((t * 30 * sp + ph * 10) % (H + 20)) - 10; x += Math.sin(t * sp + ph) * 20; }
    else if (kind === 'ember' || kind === 'bubble') { y = H - ((t * 40 * sp + ph * 10) % (H + 20)); x += Math.sin(t * 2 * sp + ph) * 12; }
    else if (kind === 'drip') { y = ((t * 120 * sp + ph * 20) % (H + 20)); }
    else { y = rnd(i + 7) * H * 0.9 + Math.sin(t * 0.6 * sp + ph) * 14; x += Math.cos(t * 0.4 * sp + ph) * 18; }
    const a = kind === 'firefly' ? 0.4 + 0.6 * Math.max(0, Math.sin(t * 2 + ph)) : 0.35 + 0.35 * Math.sin(t + ph);
    const r = kind === 'snow' ? 1.6 + sp : kind === 'firefly' || kind === 'motes' ? 1.6 : kind === 'bubble' ? 2.2 : 1.2;
    const col = kind === 'ember' ? `rgba(255,${120 + sp * 80},40,${a})` : kind === 'firefly' ? `rgba(200,255,120,${a})` : kind === 'snow' ? `rgba(240,248,255,${a})` : kind === 'bubble' ? `rgba(180,240,255,${a * 0.7})` : kind === 'drip' ? `rgba(160,220,200,${a * 0.6})` : kind === 'motes' ? `rgba(${rgb(D.light).join(',')},${a})` : `rgba(230,210,180,${a * 0.5})`;
    if (kind === 'firefly' || kind === 'motes' || kind === 'ember') { const g = c.createRadialGradient(x, y, 0, x, y, r * 4); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r * 4, y - r * 4, r * 8, r * 8); }
    else { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
  }
  c.restore();
}
export const lightOf = (theme) => (DIO[theme] || DIO.cave).light;
// soft bloom for a bright effect at (x, y)
export function bloom(c, x, y, r, col, a = 0.6) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = a; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore(); }

// ---------------------------------------------------------------- town scenery: a misty painted skyline with glowing windows
const TOWN = { castle: ['#0c1028', '#2a3462', '#ffd890'], village: ['#0e1420', '#3a3a4a', '#ffc070'], forest: ['#08140c', '#1e3a26', '#d0ff90'], port: ['#081424', '#24486a', '#ffd8a0'],
  industrial: ['#0e0c0c', '#3a2a24', '#ff9a50'], snow: ['#101a30', '#4a6a90', '#fff0d0'], desert: ['#1a0e20', '#a0503a', '#ffe0a0'], mountain: ['#0c0c10', '#3a3634', '#ffc080'],
  eastern: ['#10081a', '#4a2a4a', '#ff9a80'], holy: ['#1a2a5a', '#8ab0e8', '#fffbe0'] };
export function townScene(style, W, H) {
  const key = `town:${style}:${W}:${H}`; if (cache.has(key)) return cache.get(key);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  const [top, bot, glow] = TOWN[style] || TOWN.village, base = H * 0.8;
  let g = c.createLinearGradient(0, 0, 0, base); g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 140; i++) { c.fillStyle = `rgba(255,255,255,${rnd(i) * 0.6})`; c.fillRect(rnd(i + 1) * W, rnd(i + 2) * H * 0.5, 1.4, 1.4); }
  const moon = c.createRadialGradient(W * 0.78, H * 0.18, 0, W * 0.78, H * 0.18, H * 0.35); moon.addColorStop(0, 'rgba(255,250,230,.9)'); moon.addColorStop(0.08, 'rgba(255,250,230,.6)'); moon.addColorStop(0.1, 'rgba(255,250,230,.15)'); moon.addColorStop(1, 'rgba(255,250,230,0)');
  c.fillStyle = moon; c.fillRect(0, 0, W, H);
  // three rows of buildings: far (hazy, blurred), middle, near (dark and out of focus)
  const row = (depth, blur, col, y, sc, lit) => {
    c.save(); c.filter = `blur(${blur}px)`;
    for (let i = 0, x = -30; x < W + 30; i++) {
      const w = (50 + rnd(i * 5 + depth) * 70) * sc, h = (60 + rnd(i * 11 + depth) * 110) * sc;
      c.fillStyle = col; c.fillRect(x, y - h, w, h);
      c.beginPath();
      if (style === 'eastern') { c.moveTo(x - 10 * sc, y - h); c.quadraticCurveTo(x + w / 2, y - h - 30 * sc, x + w + 10 * sc, y - h); }
      else if (style === 'desert') c.ellipse(x + w / 2, y - h, w / 2, 20 * sc, 0, Math.PI, 0);
      else { c.moveTo(x - 6 * sc, y - h); c.lineTo(x + w / 2, y - h - 34 * sc); c.lineTo(x + w + 6 * sc, y - h); }
      c.fill();
      if (i % 4 === 1 && depth === 1) { c.fillRect(x + w * 0.4, y - h * 1.8, w * 0.22, h * 0.8); c.beginPath(); c.moveTo(x + w * 0.35, y - h * 1.8); c.lineTo(x + w * 0.51, y - h * 2.15); c.lineTo(x + w * 0.67, y - h * 1.8); c.fill(); }
      if (lit) for (let wy = y - h + 14 * sc; wy < y - 12 * sc; wy += 22 * sc) for (let wx = x + 10 * sc; wx < x + w - 10 * sc; wx += 18 * sc) if (rnd(wx * 3 + wy) > 0.45) {
        const gl = c.createRadialGradient(wx + 3 * sc, wy + 5 * sc, 0, wx + 3 * sc, wy + 5 * sc, 14 * sc); gl.addColorStop(0, glow + 'aa'); gl.addColorStop(1, glow + '00'); c.fillStyle = gl; c.fillRect(wx - 12 * sc, wy - 10 * sc, 30 * sc, 30 * sc);
        c.fillStyle = glow; c.fillRect(wx, wy, 6 * sc, 9 * sc); }
      x += w + 8 * sc;
    }
    c.restore();
  };
  row(1, 3, mix(bot, top, 0.4), base - H * 0.08, 0.8, true);
  // mist between the rows
  g = c.createLinearGradient(0, base - H * 0.2, 0, base); g.addColorStop(0, 'rgba(200,210,230,0)'); g.addColorStop(1, 'rgba(200,210,230,.16)'); c.fillStyle = g; c.fillRect(0, base - H * 0.2, W, H * 0.2);
  row(2, 0.8, mix(top, '#000000', 0.35), base, 1.15, true);
  c.fillStyle = mix(top, '#000000', 0.6); c.fillRect(0, base, W, H - base);
  g = c.createLinearGradient(0, base, 0, H); g.addColorStop(0, glow + '30'); g.addColorStop(1, glow + '00'); c.fillStyle = g; c.fillRect(0, base, W, H - base);
  c.save(); c.filter = 'blur(8px)'; c.fillStyle = '#05050a'; c.beginPath(); c.ellipse(W * 0.05, H, W * 0.16, H * 0.3, 0, 0, 7); c.ellipse(W * 0.96, H * 1.02, W * 0.18, H * 0.34, 0, 0, 7); c.fill(); c.restore();
  const v = c.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
  cache.set(key, cv); return cv;
}
export const themeParticles = (style) => ({ snow: 'ice', forest: 'forest', industrial: 'factory', desert: 'desert', port: 'sea', holy: 'sky', eastern: 'forest' }[style] || 'castle');

// ---------------------------------------------------------------- portraits: painted, adult faces (64 x 64 box)
export function portraitHD(c, id, x, y, s = 1) {
  const d = DB.chars[id], lk = d.look, f = d.gender === 'f', kid = ['jasper', 'josh'].includes(id);
  c.save(); c.translate(x, y); c.scale(s, s);
  let g = c.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, '#2a2836'); g.addColorStop(1, '#0e0c16'); c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  const rim = c.createRadialGradient(46, 14, 0, 46, 14, 50); rim.addColorStop(0, 'rgba(255,220,170,.25)'); rim.addColorStop(1, 'rgba(255,220,170,0)'); c.fillStyle = rim; c.fillRect(0, 0, 64, 64);
  const hc = lk.hairCol, skin = lk.skin, cl = lk.cloth, c2 = lk.cloth2, shadeSkin = tone(skin, -0.25);
  const blob = (cx, cy, rx, ry, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, 7); c.fill(); };
  // shoulders and clothes
  g = c.createLinearGradient(10, 46, 54, 64); g.addColorStop(0, tone(cl, 0.2)); g.addColorStop(1, tone(cl, -0.35)); c.fillStyle = g; c.beginPath(); c.moveTo(6, 64); c.quadraticCurveTo(10, 46, 32, 45); c.quadraticCurveTo(54, 46, 58, 64); c.fill();
  c.fillStyle = c2; c.beginPath(); c.moveTo(27, 46); c.lineTo(37, 46); c.lineTo(34, 58); c.lineTo(30, 58); c.fill();
  if (lk.extra === 'armor') { blob(15, 52, 9, 6, '#b8bcc8'); blob(49, 52, 9, 6, '#9a9eb0'); }
  if (CAPE.has(id) || lk.extra === 'hood') { c.fillStyle = tone(c2, -0.2); c.beginPath(); c.moveTo(6, 64); c.quadraticCurveTo(8, 48, 20, 46); c.lineTo(16, 64); c.fill(); }
  // back hair
  if (['long', 'wavy', 'braid', 'pony'].includes(lk.hair)) { g = c.createLinearGradient(16, 14, 48, 58); g.addColorStop(0, tone(hc, 0.15)); g.addColorStop(1, tone(hc, -0.35)); c.fillStyle = g; c.beginPath(); c.ellipse(32, 34, 16, lk.hair === 'pony' ? 16 : 22, 0, 0, 7); c.fill(); }
  if (lk.extra === 'hood') { c.fillStyle = tone(c2, -0.1); c.beginPath(); c.ellipse(32, 28, 19, 22, 0, 0, 7); c.fill(); }
  // neck and face: an oval jaw, shaded on the right
  c.fillStyle = shadeSkin; c.fillRect(28, 38, 8, 9);
  g = c.createLinearGradient(20, 0, 44, 0); g.addColorStop(0, tone(skin, 0.12)); g.addColorStop(0.6, skin); g.addColorStop(1, shadeSkin);
  c.fillStyle = g; c.beginPath(); c.moveTo(21, 22); c.quadraticCurveTo(21, 38, 32, 43 - (kid ? 2 : 0)); c.quadraticCurveTo(43, 38, 43, 22); c.quadraticCurveTo(32, 10, 21, 22); c.fill();
  blob(21, 29, 2, 3, shadeSkin); blob(43, 29, 2, 3, shadeSkin);
  // eyes: almond shaped with coloured irises; brows; nose; mouth
  const iris = { jeff: '#4a3020', erin: '#3a5a3a', josh: '#3a5a8a', jasper: '#4a7aa0', lyra: '#8a5a20', gareth: '#4a6aa0', chizuru: '#2a1a1a', morrow: '#7a6ab0' }[id] || '#3a3040';
  for (const ex of [26.5, 37.5]) { c.fillStyle = '#f4ece4'; c.beginPath(); c.ellipse(ex, 28.5, kid ? 3.2 : 3, kid ? 2.2 : 1.8, 0, 0, 7); c.fill(); blob(ex, 28.6, 1.6, 1.7, iris); blob(ex, 28.6, 0.8, 0.9, '#100c10'); blob(ex - 0.6, 28, 0.5, 0.5, '#fff');
    c.strokeStyle = '#2a1a1a'; c.lineWidth = 0.9; c.beginPath(); c.ellipse(ex, 28.5, 3.1, 1.9, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); }
  c.strokeStyle = tone(hc, -0.15); c.lineWidth = f ? 1 : 1.5; c.beginPath(); c.moveTo(23, 25); c.quadraticCurveTo(26.5, 23.6, 30, 24.8); c.moveTo(34, 24.8); c.quadraticCurveTo(37.5, 23.6, 41, 25); c.stroke();
  c.strokeStyle = shadeSkin; c.lineWidth = 1; c.beginPath(); c.moveTo(32.5, 29); c.lineTo(33.5, 34); c.lineTo(31.5, 34.5); c.stroke();
  c.strokeStyle = f ? '#a04a50' : '#8a5048'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(29, 38); c.quadraticCurveTo(32, 39.2, 35, 38); c.stroke();
  if (f) { blob(24, 34, 2.6, 1.4, 'rgba(230,120,120,.25)'); blob(40, 34, 2.6, 1.4, 'rgba(230,120,120,.25)'); }
  // front hair with a sheen
  g = c.createLinearGradient(18, 8, 46, 30); g.addColorStop(0, tone(hc, 0.3)); g.addColorStop(0.5, hc); g.addColorStop(1, tone(hc, -0.3)); c.fillStyle = g; c.beginPath();
  switch (lk.hair) {
    case 'bald': break;
    case 'spiky': c.moveTo(18, 26); c.lineTo(20, 12); c.lineTo(24, 16); c.lineTo(27, 6); c.lineTo(31, 14); c.lineTo(36, 5); c.lineTo(38, 14); c.lineTo(44, 9); c.lineTo(46, 26); c.quadraticCurveTo(40, 18, 32, 19); c.quadraticCurveTo(24, 18, 18, 26); break;
    case 'messy': c.moveTo(17, 28); c.quadraticCurveTo(16, 8, 32, 9); c.quadraticCurveTo(48, 8, 47, 28); c.lineTo(43, 20); c.lineTo(39, 24); c.lineTo(35, 19); c.lineTo(30, 23); c.lineTo(26, 19); c.lineTo(21, 24); c.closePath(); break;
    case 'bun': c.moveTo(19, 30); c.quadraticCurveTo(18, 10, 32, 11); c.quadraticCurveTo(46, 10, 45, 30); c.quadraticCurveTo(40, 17, 32, 18); c.quadraticCurveTo(24, 17, 19, 30); c.ellipse(32, 8, 7, 5.5, 0, 0, 7); break;
    default: c.moveTo(19, 30); c.quadraticCurveTo(17, 9, 32, 10); c.quadraticCurveTo(47, 9, 45, 32); c.quadraticCurveTo(42, 19, 34, 18); c.quadraticCurveTo(26, 22, 19, 30);
  }
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1; c.beginPath(); c.moveTo(24, 15); c.quadraticCurveTo(30, 12, 38, 14); c.stroke();
  switch (lk.extra) {
    case 'goggles': c.fillStyle = '#4a3020'; c.fillRect(20, 16, 24, 3); blob(26, 17, 4, 3, '#b08a50'); blob(38, 17, 4, 3, '#b08a50'); blob(26, 17, 2.5, 2, '#7ac0e0'); blob(38, 17, 2.5, 2, '#7ac0e0'); break;
    case 'shades': c.fillStyle = '#14121a'; c.beginPath(); c.ellipse(26, 15, 5, 3, -0.1, 0, 7); c.ellipse(38, 15, 5, 3, 0.1, 0, 7); c.fill(); c.fillRect(30, 14, 4, 1.4); c.fillStyle = 'rgba(160,190,230,.5)'; c.fillRect(24, 13.5, 2, 1); c.fillRect(36, 13.5, 2, 1); break;
    case 'cap': c.fillStyle = cl; c.beginPath(); c.ellipse(32, 14, 16, 7, 0, Math.PI, 0); c.fill(); c.fillStyle = tone(c2, -0.1); c.fillRect(14, 13, 18, 3); break;
    case 'hat': c.fillStyle = c2; c.beginPath(); c.moveTo(12, 16); c.lineTo(52, 16); c.lineTo(40, 13); c.lineTo(36, -4); c.lineTo(26, 13); c.closePath(); c.fill(); break;
    case 'veil': c.fillStyle = 'rgba(150,40,80,.6)'; c.beginPath(); c.moveTo(20, 33); c.lineTo(44, 33); c.lineTo(41, 46); c.lineTo(23, 46); c.fill(); blob(32, 12, 5, 2.4, '#e0c050'); break;
    case 'ribbon': c.fillStyle = '#b02a3a'; c.beginPath(); c.moveTo(38, 6); c.lineTo(47, 1); c.lineTo(45, 10); c.moveTo(38, 6); c.lineTo(30, 0); c.lineTo(31, 10); c.fill(); break;
    case 'beard': c.fillStyle = hc; c.beginPath(); c.moveTo(22, 33); c.quadraticCurveTo(32, 52, 42, 33); c.quadraticCurveTo(32, 40, 22, 33); c.fill(); break;
    case 'eyepatch': blob(37.5, 28.5, 4, 3.4, '#0e0a0c'); c.strokeStyle = '#0e0a0c'; c.lineWidth = 1; c.beginPath(); c.moveTo(20, 23); c.lineTo(45, 31); c.stroke(); break;
    case 'feather': c.fillStyle = '#d84a4a'; c.beginPath(); c.moveTo(44, 16); c.quadraticCurveTo(56, 6, 54, -2); c.quadraticCurveTo(50, 8, 42, 16); c.fill(); break;
    case 'scar': c.strokeStyle = '#a05050'; c.lineWidth = 1; c.beginPath(); c.moveTo(37, 22); c.lineTo(41, 33); c.stroke(); break;
    case 'mask': c.fillStyle = '#1a1a26'; c.beginPath(); c.moveTo(20, 32); c.lineTo(44, 32); c.lineTo(42, 42); c.quadraticCurveTo(32, 46, 22, 42); c.fill(); break;
  }
  const v = c.createRadialGradient(32, 30, 18, 32, 32, 46); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); c.fillStyle = v; c.fillRect(0, 0, 64, 64);
  c.restore();
}
