// Painted monster sprites: every family is built from shaded shapes on a 64x64 pixel grid, then cropped and outlined.
//
//   ball(cx, cy, rx, ry, ramp, o)   a round 3D shape lit from the upper left (o.rot rotates it, o.facet makes it chunky stone)
//   limb(x0, y0, x1, y1, r0, r1, ramp)   a tapered tube (legs, arms, tails, handles)
//   poly(points, ramp, o)           a flat shape with a lit top edge and a shadowed bottom edge (wings, petals, blades)
//   eye(x, y, r, o)                 a shiny cartoon eye; o.glow makes it a glowing eye (gets bloom in battle)
//
// A ramp is five tones: deep, shadow, base, light, highlight. Shadows lean violet and highlights lean warm, the way
// painted pixel art does it. Where a shape sits in front of another, its edge gets a darker line so parts read clearly,
// and the finished sprite gets a coloured outline (the darkest tone of whatever it surrounds), not a flat black one.
// Ranks recolour a family through `hue`. Sprites face right, toward the party.

function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(100, s)) / 100; l = Math.max(0, Math.min(100, l)) / 100;
  const k = (n) => (n + h / 30) % 12, f = (n) => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}
export const ramp = (h, s, l) => [hsl(h + 26, s * 1.05, l * 0.36), hsl(h + 12, s, l * 0.66), hsl(h, s, l), hsl(h - 10, s * 0.92, Math.min(93, l * 1.2 + 7)), hsl(h - 22, s * 0.5, Math.min(98, l * 1.42 + 22))];
const LX = -0.5, LY = -0.68, LZ = 0.54, LN = Math.hypot(LX, LY, LZ);
const lit = (nx, ny, nz) => (nx * LX + ny * LY + nz * LZ) / LN;
const toneOf = (i, spec) => (spec && i > 0.9 ? 4 : i > 0.5 ? 3 : i > 0.05 ? 2 : 1);

class Painter {
  constructor(W = 64, H = 64) {
    this.W = W; this.H = H; this.n = 0;
    this.rgb = new Array(W * H).fill(null); this.alpha = new Uint8Array(W * H); this.ramp = new Array(W * H).fill(null);
    this.tone = new Int8Array(W * H); this.pid = new Int16Array(W * H).fill(-1); this.eyes = [];
  }
  in(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.H; }
  put(x, y, R, t, a = 255, id = this.n) {
    x = Math.round(x); y = Math.round(y); if (!this.in(x, y)) return;
    const i = y * this.W + x; this.rgb[i] = Array.isArray(R[0]) ? R[t] : R; this.ramp[i] = Array.isArray(R[0]) ? R : null; this.tone[i] = t; this.alpha[i] = a; this.pid[i] = id;
  }
  // after a shape is drawn: its edge pixels that sit over an earlier shape get the shadow tone (a soft inner line)
  seam(id, sep) {
    if (sep === false) return;
    const { W, H } = this;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (this.pid[i] !== id || !this.ramp[i]) continue;
      const over = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const xx = x + dx, yy = y + dy; if (!this.in(xx, yy)) return false; const j = yy * W + xx; return this.pid[j] !== id && this.pid[j] >= 0 && this.alpha[j]; });
      if (over) { const t = Math.max(0, Math.min(this.tone[i], 2) - 1); this.tone[i] = t; this.rgb[i] = this.ramp[i][t]; }
    }
  }
  ball(cx, cy, rx, ry, R, o = {}) {
    const id = ++this.n, c = Math.cos(o.rot || 0), s = Math.sin(o.rot || 0), m = Math.max(rx, ry) + 1;
    for (let y = Math.floor(cy - m); y <= cy + m; y++) for (let x = Math.floor(cx - m); x <= cx + m; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, lx = dx * c + dy * s, ly = -dx * s + dy * c;
      let nx = lx / rx, ny = ly / ry; const d = nx * nx + ny * ny; if (d > 1) continue;
      if (o.clip && !o.clip(x, y)) continue;
      // back to screen space for lighting
      let sx = nx * c - ny * s, sy = nx * s + ny * c, nz = Math.sqrt(1 - Math.min(1, d));
      if (o.facet) { sx = Math.round(sx * 2.2) / 2.2; sy = Math.round(sy * 2.2) / 2.2; nz = Math.sqrt(Math.max(0, 1 - sx * sx - sy * sy)); }
      if (o.flat) nz = nz * (1 - o.flat) + o.flat;
      const t = o.tone != null ? o.tone : toneOf(lit(sx, sy, nz), o.spec !== false);
      this.put(x, y, R, t, o.alpha || 255, id);
    }
    this.seam(id, o.sep);
    if (o.shine) this.put(cx - rx * 0.45, cy - ry * 0.5, [255, 255, 250], 0, o.alpha || 255, id);
    return id;
  }
  limb(x0, y0, x1, y1, r0, r1, R, o = {}) {
    const id = ++this.n, vx = x1 - x0, vy = y1 - y0, L2 = vx * vx + vy * vy || 1, m = Math.max(r0, r1) + 1;
    for (let y = Math.floor(Math.min(y0, y1) - m); y <= Math.max(y0, y1) + m; y++) for (let x = Math.floor(Math.min(x0, x1) - m); x <= Math.max(x0, x1) + m; x++) {
      const px = x + 0.5 - x0, py = y + 0.5 - y0, t = Math.max(0, Math.min(1, (px * vx + py * vy) / L2));
      const r = r0 + (r1 - r0) * t, ex = px - vx * t, ey = py - vy * t, d = Math.hypot(ex, ey) / r; if (d > 1) continue;
      const nx = ex / r, ny = ey / r, nz = Math.sqrt(Math.max(0, 1 - d * d));
      this.put(x, y, R, o.tone != null ? o.tone : toneOf(lit(nx, ny, nz), false), o.alpha || 255, id);
    }
    this.seam(id, o.sep);
    return id;
  }
  poly(pts, R, o = {}) {
    const id = ++this.n, xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), inside = (px, py) => {
      let r = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) r = !r; } return r; };
    const cells = [];
    for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) if (inside(x + 0.5, y + 0.5) && (!o.clip || o.clip(x, y))) cells.push([x, y]);
    const set = new Set(cells.map(([x, y]) => x + ',' + y)), has = (x, y) => set.has(x + ',' + y);
    for (const [x, y] of cells) {
      let t = o.tone != null ? o.tone : 2;
      if (o.tone == null) { if (!has(x, y - 1) || !has(x - 1, y)) t = 3; else if (!has(x, y + 1) || !has(x + 1, y) || !has(x, y + 2)) t = 1; }
      this.put(x, y, R, t, o.alpha || 255, id);
    }
    this.seam(id, o.sep);
    return id;
  }
  dot(x, y, color, a = 255) { this.put(x, y, color, 0, a, -2); }
  line(x0, y0, x1, y1, color, a = 255) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.dot(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, color, a);
  }
  // recolour the pixels of shape `id` where test(x, y) is true with another ramp, keeping their tone (stripes, spots)
  band(id, R, test) {
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) { const i = y * this.W + x; if (this.pid[i] === id && test(x, y)) { this.ramp[i] = R; this.rgb[i] = R[this.tone[i]]; } }
  }
  eye(x, y, r, o = {}) {
    if (o.glow) {
      this.ball(x, y, r, r * (o.tall || 1.1), RAMPS.socket, { sep: false });
      this.ball(x + r * 0.15, y, r * 0.55, r * 0.6, o.glow, { tone: 3, sep: false }); this.dot(x + r * 0.05, y - r * 0.2, [255, 255, 240]);
      this.eyes.push([x + 0.5, y + 0.5]); return;
    }
    this.ball(x, y, r, r * (o.tall || 1.15), RAMPS.white, { sep: false, spec: false });
    const ix = x + r * (o.look ?? 0.3), iy = y + r * 0.1;
    this.ball(ix, iy, r * 0.62, r * 0.7 * (o.tall || 1.15), o.iris || RAMPS.iris, { sep: false, spec: false });
    if (o.slit) this.limb(ix, iy - r * 0.6, ix, iy + r * 0.6, 0.6, 0.6, RAMPS.black, { tone: 1, sep: false });
    else this.ball(ix + r * 0.08, iy + r * 0.05, r * 0.34, r * 0.42, RAMPS.black, { tone: 1, sep: false, spec: false });
    this.dot(ix - r * 0.28, iy - r * 0.38, [255, 255, 255]); if (r > 3) this.dot(ix - r * 0.28 + 1, iy - r * 0.38, [255, 255, 255]);
    this.dot(ix + r * 0.3, iy + r * 0.35, [230, 240, 255]);
    if (o.lid) this.limb(x - r, y - r * 0.9, x + r, y - r * 1.1, 0.9, 0.9, o.lid, { tone: 0, sep: false });
  }
  blush(x, y, w = 3) { for (let i = 0; i < w; i++) this.dot(x + i, y, [255, 140, 160], 200); }
  // crop, outline and turn into a canvas
  finish() {
    const { W, H } = this; let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (this.alpha[y * W + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const w = x1 - x0 + 3, h = y1 - y0 + 3, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d'), img = c.createImageData(w, h), d = img.data, at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? y * W + x : -1);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sx = x + x0 - 1, sy = y + y0 - 1, i = at(sx, sy), o = (y * w + x) * 4;
      if (i >= 0 && this.alpha[i]) { const [r, g, b] = this.rgb[i]; d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = this.alpha[i]; continue; }
      // outline: the darkest tone of a neighbouring shape, pushed toward ink
      let best = null;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = at(sx + dx, sy + dy); if (j >= 0 && this.alpha[j] > 120) { best = this.ramp[j] ? this.ramp[j][0] : [30, 20, 34]; break; } }
      if (best) { d[o] = Math.round(best[0] * 0.55 + 10); d[o + 1] = Math.round(best[1] * 0.55 + 6); d[o + 2] = Math.round(best[2] * 0.55 + 14); d[o + 3] = 255; }
    }
    c.putImageData(img, 0, 0);
    const white = document.createElement('canvas'); white.width = w; white.height = h; const wc = white.getContext('2d');
    wc.drawImage(cv, 0, 0); wc.globalCompositeOperation = 'source-in'; wc.fillStyle = 'rgba(255,250,240,.9)'; wc.fillRect(0, 0, w, h);
    return { cv, white, w, h, eyes: this.eyes.map(([x, y]) => [x - x0 + 1, y - y0 + 1]), painted: true };
  }
}

const RAMPS = {
  white: [[150, 150, 170], [214, 214, 228], [250, 250, 252], [255, 255, 255], [255, 255, 255]],
  black: ramp(260, 30, 12), iris: ramp(220, 40, 30), socket: ramp(270, 30, 10),
  cream: ramp(40, 50, 82), bone: ramp(44, 30, 80), gold: ramp(44, 82, 56), wood: ramp(26, 45, 38), steel: ramp(215, 14, 66),
  pink: ramp(350, 75, 70), mouth: ramp(345, 60, 30), tongue: ramp(352, 78, 66), leaf: ramp(115, 52, 40), moss: ramp(95, 45, 40),
  wing: [[150, 190, 230], [190, 222, 250], [222, 240, 255], [240, 250, 255], [255, 255, 255]], yellow: ramp(46, 92, 56), skin: ramp(28, 55, 72), boot: ramp(25, 30, 24), stone: ramp(30, 8, 52),
};
const smile = (P, x, y, w, o = {}) => {        // an open smile with a tongue
  P.ball(x, y, w, w * 0.62, RAMPS.mouth, { clip: (px, py) => py >= y - 0.5, sep: false, tone: 1 });
  if (o.teeth) for (let i = 0; i < o.teeth; i++) P.poly([[x - w + 1 + i * 2.6, y], [x - w + 3 + i * 2.6, y], [x - w + 2 + i * 2.6, y + 2]], RAMPS.white, { tone: 2, sep: false });
  if (o.tongue !== false) P.ball(x + w * 0.2, y + w * 0.4, w * 0.5, w * 0.28, RAMPS.tongue, { sep: false });
};

// ---------------------------------------------------------------- the families
const FAM = {
  ooze(P, C) {
    const id = P.ball(32, 47, 24, 14, C.main, { sep: false });
    P.ball(32, 38, 17, 16, C.main, { sep: false, clip: (x, y) => y < 46 });
    P.poly([[27, 26], [37, 26], [36, 18], [40, 13], [33, 16], [29, 21]], C.main, { sep: false });
    void id;
    P.ball(21, 30, 3.5, 5.5, RAMPS.white, { tone: 3, sep: false, rot: 0.5, alpha: 170 }); P.dot(26, 24, [255, 255, 255]); P.dot(25, 25, [255, 255, 255]);
    P.ball(30, 59, 18, 2.2, C.main, { tone: 1, sep: false, clip: (x, y) => y > 57 });
    P.eye(31, 39, 5, { look: 0.35 }); P.eye(43, 39, 5, { look: 0.35 });
    smile(P, 38, 48, 5);
    P.blush(24, 46); P.blush(47, 46);
  },
  beast(P, C) {
    P.limb(13, 37, 6, 26, 5, 3.5, C.main); P.ball(5, 24, 4, 4.5, RAMPS.cream);                       // bushy tail
    P.limb(20, 44, 18, 58, 3.6, 3.2, C.dark); P.limb(27, 46, 27, 58, 3.6, 3.2, C.dark);               // back legs
    P.ball(29, 42, 16, 11, C.main);
    P.ball(39, 46, 8, 7, RAMPS.cream, { sep: false, clip: (x, y) => y > 41 });
    P.limb(38, 46, 37, 58, 3.8, 3.4, C.main); P.limb(45, 45, 46, 58, 3.8, 3.4, C.main);
    P.ball(37, 58, 4, 2.2, RAMPS.cream); P.ball(46, 58, 4, 2.2, RAMPS.cream);
    P.poly([[38, 24], [39, 9], [47, 20]], C.main); P.poly([[40, 21], [41, 13], [45, 20]], RAMPS.pink, { sep: false });   // ears
    P.ball(46, 29, 11, 10, C.main);
    P.poly([[48, 21], [53, 8], [56, 22]], C.main); P.poly([[50, 20], [53, 12], [55, 21]], RAMPS.pink, { sep: false });
    P.ball(56, 34, 7.5, 5.5, RAMPS.cream); P.ball(62, 31.5, 2.4, 2, RAMPS.black, { sep: false });
    P.ball(41, 36, 6, 5, RAMPS.cream, { sep: false });                                             // cheek fluff
    P.eye(51, 27, 3.4, { look: 0.4 }); P.line(47, 22, 54, 23, C.main[0]);
    P.line(55, 38, 61, 37, C.main[0]); P.dot(57, 39, [255, 255, 255]); P.dot(60, 39, [255, 255, 255]);
  },
  insect(P, C) {      // a big fluffy bumblebee
    P.ball(24, 15, 11, 6, RAMPS.wing, { rot: -0.75, alpha: 190, sep: false, flat: 0.5 });           // back wing
    P.line(18, 21, 30, 9, [255, 255, 255], 150);
    P.limb(32, 44, 28, 54, 1.6, 1.3, RAMPS.black); P.limb(37, 45, 37, 55, 1.6, 1.3, RAMPS.black); P.limb(42, 42, 46, 52, 1.6, 1.3, RAMPS.black);
    P.poly([[9, 45], [1, 49], [9, 51]], RAMPS.black);                                               // stinger
    const ab = P.ball(21, 42, 15, 13, RAMPS.yellow);
    P.band(ab, C.main, (x, y) => ((x * 0.95 + y * 0.42) % 10 + 10) % 10 < 3.6);                       // stripes
    P.ball(37, 35, 9.5, 9.5, C.fur);
    for (let a = 0; a < 14; a++) { const t = a / 14 * Math.PI * 2; P.dot(37 + Math.cos(t) * 9.6, 35 + Math.sin(t) * 9.6, C.fur[3]); }
    P.ball(49, 30, 10.5, 10, RAMPS.yellow);
    P.limb(46, 22, 41, 11, 1, 1, RAMPS.black, { sep: false }); P.ball(40, 10, 2.4, 2.4, C.main);
    P.limb(52, 21, 56, 10, 1, 1, RAMPS.black, { sep: false }); P.ball(57, 9, 2.4, 2.4, C.main);
    P.eye(46, 29, 3.8, { look: 0.4 }); P.eye(54, 29, 4.2, { look: 0.4 });
    P.blush(43, 35); P.blush(56, 35, 2);
    smile(P, 51, 36, 2.6, { tongue: false });
    P.ball(30, 18, 12, 6.5, RAMPS.wing, { rot: -1.05, alpha: 215, sep: false, flat: 0.5 });           // front wing
    P.line(26, 26, 34, 10, [255, 255, 255], 170); P.line(29, 24, 37, 14, [190, 220, 255], 150);
  },
  plant(P, C) {
    P.ball(19, 50, 13, 4.5, RAMPS.leaf, { rot: -0.45 }); P.ball(46, 52, 12, 4.2, RAMPS.leaf, { rot: 0.4 });
    P.limb(31, 60, 33, 36, 3.5, 2.6, RAMPS.leaf);
    P.ball(31, 60, 9, 2.5, RAMPS.wood);
    for (let i = 0; i < 7; i++) { const t = i / 7 * Math.PI * 2 + 0.3; P.ball(38 + Math.cos(t) * 15, 25 + Math.sin(t) * 13, 6.5, 4.5, C.petal, { rot: t }); }
    const head = P.ball(38, 25, 14, 12.5, C.main);
    P.band(head, C.spot, (x, y) => ((x - 30) ** 2 + (y - 18) ** 2 < 5) || ((x - 31) ** 2 + (y - 31) ** 2 < 4) || ((x - 44) ** 2 + (y - 14) ** 2 < 3));
    P.ball(44, 29, 8, 6, RAMPS.mouth, { tone: 1, sep: false });
    for (let i = 0; i < 4; i++) { P.poly([[38 + i * 3.4, 23], [40.6 + i * 3.4, 23], [39.3 + i * 3.4, 26.5]], RAMPS.white, { sep: false }); P.poly([[38.5 + i * 3.4, 35], [41 + i * 3.4, 35], [39.8 + i * 3.4, 31.5]], RAMPS.white, { sep: false }); }
    P.ball(45, 32, 3.5, 2, RAMPS.tongue, { sep: false });
    P.eye(34, 17, 3.6, { look: 0.4 }); P.eye(43, 15.5, 3.4, { look: 0.4 });
  },
  undead(P, C) {
    P.poly([[26, 26], [44, 26], [48, 52], [42, 49], [38, 54], [32, 49], [26, 55], [22, 48]], C.main);   // tattered cloak
    P.limb(31, 48, 29, 59, 2, 2, RAMPS.bone); P.limb(37, 48, 39, 59, 2, 2, RAMPS.bone);
    P.ball(28, 59, 3.5, 1.6, RAMPS.bone); P.ball(40, 59, 3.5, 1.6, RAMPS.bone);
    P.ball(34, 47, 6, 3.2, RAMPS.bone);
    P.limb(34, 30, 34, 46, 1.6, 1.6, RAMPS.bone);
    P.ball(34, 36, 8, 7, RAMPS.bone);
    for (let i = 0; i < 3; i++) P.line(28, 33 + i * 3, 40, 33 + i * 3, RAMPS.bone[0]);
    P.limb(29, 31, 24, 42, 1.6, 1.6, RAMPS.bone);
    P.limb(52, 42, 59, 18, 2, 4.2, RAMPS.wood); P.ball(59.5, 16, 4.6, 4.6, RAMPS.wood, { facet: true });   // bone club
    P.limb(39, 31, 51, 38, 1.7, 1.7, RAMPS.bone); P.ball(52, 40, 2.6, 2.6, RAMPS.bone);
    P.ball(40, 18, 11.5, 10.5, RAMPS.bone);
    P.ball(43, 27, 7.5, 4, RAMPS.bone);
    for (let i = 0; i < 4; i++) P.line(38 + i * 2.4, 26, 38 + i * 2.4, 29, RAMPS.bone[0]);
    P.eye(37, 18, 3.4, { glow: C.glow, tall: 1.2 }); P.eye(46, 18, 3.4, { glow: C.glow, tall: 1.2 });
    P.ball(42.5, 23, 1.4, 1.6, RAMPS.socket, { sep: false });
    P.line(34, 10, 37, 14, RAMPS.bone[0]);
  },
  ghost(P, C) {
    const A = 228;
    P.ball(32, 28, 17, 16, C.main, { alpha: A, sep: false });
    P.poly([[15, 30], [49, 30], [50, 46], [46, 44], [43, 49], [38, 45], [34, 51], [29, 46], [25, 50], [21, 45], [16, 47]], C.main, { alpha: A, sep: false });
    P.limb(16, 34, 9, 30, 4, 3, C.main, { alpha: A }); P.limb(48, 33, 55, 28, 4, 3, C.main, { alpha: A });
    P.ball(24, 20, 3, 4.5, RAMPS.white, { tone: 3, alpha: 200, sep: false, rot: 0.4 });
    P.eye(31, 27, 4.5, { look: 0.3, iris: C.iris }); P.eye(42, 27, 4.5, { look: 0.3, iris: C.iris });
    P.ball(37, 37, 3.2, 3.6, RAMPS.mouth, { tone: 1, sep: false }); P.ball(37.5, 38.5, 1.8, 1.2, RAMPS.tongue, { sep: false });
    P.blush(25, 33); P.blush(46, 33);
  },
  human(P, C) {     // a bandana bandit
    P.poly([[22, 12], [14, 8], [16, 16], [12, 20], [22, 18]], C.main);                         // bandana tails
    P.limb(31, 48, 29, 58, 3.6, 3.4, RAMPS.boot); P.limb(39, 48, 41, 58, 3.6, 3.4, RAMPS.boot);
    P.ball(28, 59, 5, 2.6, RAMPS.boot); P.ball(42, 59, 5, 2.6, RAMPS.boot);
    P.limb(28, 34, 23, 46, 3, 3, C.cloth); P.ball(23, 47, 3, 3, RAMPS.skin);
    P.ball(35, 41, 11, 10, C.cloth);
    P.ball(35, 46, 11.5, 2.4, RAMPS.wood, { clip: (x, y) => Math.abs(y - 46) < 2, sep: false }); P.ball(39, 46, 2, 1.8, RAMPS.gold, { sep: false });
    P.ball(36, 19, 12, 11.5, RAMPS.skin);
    P.ball(36, 14, 12.6, 8, C.main, { clip: (x, y) => y < 15 });                                       // bandana
    P.ball(39, 27, 9, 5, C.scarf, { clip: (x, y) => y > 22 });                                            // face scarf
    P.eye(36, 18.5, 3, { look: 0.45, lid: C.main }); P.eye(44, 18.5, 3.2, { look: 0.45, lid: C.main });
    P.line(33, 14, 39, 15, RAMPS.boot[0]); P.line(42, 15, 47, 13, RAMPS.boot[0]);
    P.poly([[48, 30], [60, 26], [49, 34]], RAMPS.steel); P.limb(45, 34, 49, 32, 2, 2, RAMPS.wood);           // dagger
    P.limb(42, 34, 46, 36, 3, 3, C.cloth); P.ball(47, 34, 3, 3, RAMPS.skin);
  },
  reptile(P, C) {
    P.limb(25, 48, 14, 56, 5, 3, C.main); P.limb(14, 56, 5, 52, 3, 1.4, C.main);                        // tail
    P.limb(53, 58, 56, 4, 1.4, 1.4, RAMPS.wood); P.poly([[53, 6], [56.5, -2], [60, 6], [56.5, 10]], RAMPS.steel);   // spear
    P.ball(24, 37, 7, 9, RAMPS.wood, { facet: true }); P.ball(24, 37, 3, 3.5, RAMPS.gold, { sep: false });       // shield
    P.limb(29, 47, 27, 58, 3.6, 3.3, C.main); P.limb(37, 48, 39, 58, 3.6, 3.3, C.main);
    P.ball(26, 59, 4.6, 2.2, C.dark); P.ball(41, 59, 4.6, 2.2, C.dark);
    P.ball(33, 38, 10, 12.5, C.main);
    P.ball(36, 41, 6, 9, RAMPS.cream, { sep: false });
    for (let i = 0; i < 4; i++) P.line(32, 36 + i * 3, 40, 36 + i * 3, RAMPS.cream[1]);
    for (let i = 0; i < 4; i++) P.poly([[30 - i * 1.5, 17 + i * 5], [24 - i * 1.5, 19 + i * 5], [29 - i * 1.5, 22 + i * 5]], C.crest);
    P.ball(39, 21, 9.5, 8.5, C.main);
    P.ball(49, 24, 8.5, 5.2, C.main);
    P.line(44, 27, 56, 26, C.main[0]); P.dot(55, 21, C.main[0]);
    P.eye(42, 18, 3.6, { iris: RAMPS.gold, slit: true, look: 0.25 });
    P.limb(41, 31, 52, 33, 3, 3, C.main); P.ball(53, 33, 3, 3, C.main);
  },
  aquatic(P, C) {
    P.poly([[20, 50], [8, 44], [11, 52], [6, 60], [20, 56]], C.fin);                                   // tail fin
    P.limb(55, 60, 58, 8, 1.4, 1.4, RAMPS.steel);
    P.poly([[52, 12], [53, 2], [55, 12]], RAMPS.steel); P.poly([[56.5, 9], [58, -1], [59.5, 9]], RAMPS.steel); P.poly([[61, 12], [63, 2], [64, 12]], RAMPS.steel);
    P.limb(53, 12, 63, 12, 1.2, 1.2, RAMPS.steel);
    P.limb(29, 49, 27, 58, 3.6, 3.3, C.main); P.limb(37, 50, 39, 58, 3.6, 3.3, C.main);
    P.poly([[22, 59], [32, 59], [28, 56]], C.fin); P.poly([[35, 59], [45, 59], [40, 56]], C.fin);
    P.ball(32, 40, 13, 13, C.main);
    P.ball(35, 44, 8, 8.5, RAMPS.cream, { sep: false });
    P.poly([[28, 16], [32, 5], [36, 12], [40, 4], [43, 12], [47, 8], [47, 18]], C.fin);                    // head crest
    P.ball(38, 24, 13, 11, C.main);
    for (let i = 0; i < 3; i++) P.line(29 + i * 2.5, 26, 30 + i * 2.5, 31, C.main[0]);
    P.ball(45, 30, 8, 3.4, RAMPS.mouth, { tone: 1, sep: false, clip: (x, y) => y >= 29 });
    for (let i = 0; i < 4; i++) P.poly([[40 + i * 3, 29], [42.4 + i * 3, 29], [41.2 + i * 3, 31.5]], RAMPS.white, { sep: false });
    P.eye(44, 21, 4.4, { look: 0.4 });
    P.limb(42, 38, 52, 34, 3, 3, C.main); P.ball(54, 33, 3.2, 3.2, C.main);
    P.poly([[22, 34], [14, 30], [20, 40]], C.fin);
  },
  bird(P, C) {
    P.poly([[16, 34], [2, 26], [6, 34], [0, 40], [8, 42], [4, 48], [18, 44]], C.wing);                     // tail feathers
    P.limb(29, 50, 27, 59, 1.4, 1.4, RAMPS.gold); P.limb(37, 50, 39, 59, 1.4, 1.4, RAMPS.gold);
    P.poly([[22, 60], [32, 60], [27, 57]], RAMPS.gold); P.poly([[34, 60], [44, 60], [39, 57]], RAMPS.gold);
    P.ball(31, 39, 16, 14, C.main);
    P.ball(36, 43, 9, 9, RAMPS.cream, { sep: false });
    P.poly([[36, 12], [38, 2], [42, 10], [46, 3], [47, 13]], C.crest);
    P.ball(42, 24, 11.5, 10.5, C.main);
    P.poly([[51, 22], [62, 25], [51, 29]], RAMPS.gold); P.line(52, 25.5, 60, 25.5, RAMPS.gold[0]);
    P.eye(45, 21, 3.8, { look: 0.4 }); P.blush(40, 28);
    P.ball(25, 38, 11, 7.5, C.wing, { rot: 0.45 });
    for (let i = 0; i < 3; i++) P.line(17 + i * 4, 39 + i * 1.5, 23 + i * 4, 43 + i * 1.5, C.wing[0]);
  },
  demon(P, C) {
    P.poly([[26, 30], [8, 14], [10, 22], [2, 22], [8, 30], [2, 34], [12, 38], [26, 40]], C.wing);           // bat wing
    P.line(25, 31, 9, 16, C.wing[0]); P.line(25, 34, 4, 23, C.wing[0]); P.line(25, 37, 4, 34, C.wing[0]);
    P.limb(26, 50, 12, 56, 1.6, 1.2, C.main); P.poly([[9, 53], [12, 58], [6, 59]], C.main);                   // tail
    P.limb(53, 60, 57, 10, 1.4, 1.4, RAMPS.steel);
    P.poly([[52, 12], [53, 3], [55, 12]], RAMPS.steel); P.poly([[56.5, 9], [57.5, 0], [59, 9]], RAMPS.steel); P.poly([[60, 12], [62, 4], [63, 13]], RAMPS.steel);
    P.limb(53, 12, 62, 11, 1.2, 1.2, RAMPS.steel);
    P.limb(29, 48, 27, 58, 3.4, 3, C.main); P.limb(37, 48, 39, 58, 3.4, 3, C.main);
    P.poly([[22, 60], [31, 60], [30, 56]], RAMPS.boot); P.poly([[36, 60], [45, 60], [37, 56]], RAMPS.boot);
    P.ball(33, 41, 10.5, 10, C.main);
    P.ball(35, 43, 6, 6.5, C.belly, { sep: false });
    P.limb(31, 14, 26, 4, 2.4, 1, RAMPS.gold); P.limb(41, 13, 45, 3, 2.4, 1, RAMPS.gold);                    // horns
    P.ball(36, 22, 12, 10.5, C.main);
    P.ball(28, 21, 3, 4.5, C.main, { rot: -0.6 }); P.ball(49, 19, 3.5, 2.5, C.main, { rot: 0.5 });              // pointy ears
    P.eye(36, 20, 3.2, { iris: RAMPS.gold, look: 0.4 }); P.eye(44, 20, 3.4, { iris: RAMPS.gold, look: 0.4 });
    P.line(32, 15, 38, 17, C.main[0]); P.line(42, 17, 48, 15, C.main[0]);
    smile(P, 41, 27, 4.2, { teeth: 3, tongue: false });
    P.limb(42, 36, 53, 33, 3, 3, C.main); P.ball(54, 32, 3, 3, C.main);
  },
  dragon(P, C) {
    P.poly([[22, 32], [6, 10], [8, 20], [0, 22], [8, 28], [2, 32], [12, 36], [26, 38]], C.wing);
    P.line(21, 32, 7, 12, C.wing[0]); P.line(22, 35, 2, 23, C.wing[0]);
    P.limb(18, 48, 6, 42, 5, 2.5, C.main); P.poly([[4, 38], [0, 42], [6, 45]], C.main);                           // tail + spade
    P.limb(25, 48, 24, 59, 4, 3.6, C.main); P.limb(37, 50, 38, 59, 4, 3.6, C.main);
    P.ball(24, 59, 5, 2.4, C.main); P.ball(39, 59, 5, 2.4, C.main);
    for (const [x, y] of [[23, 59], [26, 59], [37, 59], [40, 59]]) P.dot(x, y + 1, [255, 255, 255]);
    const body = P.ball(31, 44, 15, 12, C.main);
    void body;
    P.ball(35, 47, 8, 8.5, RAMPS.cream, { sep: false }); for (let i = 0; i < 4; i++) P.line(29, 42 + i * 3, 41, 42 + i * 3, RAMPS.cream[1]);
    for (let i = 0; i < 4; i++) P.poly([[20 + i * 5, 33 - i * 1.5], [23 + i * 5, 27 - i * 1.5], [25 + i * 5, 33 - i * 1.5]], C.spike);
    P.limb(43, 24, 39, 11, 2.4, 1, RAMPS.gold); P.limb(49, 23, 52, 10, 2.4, 1, RAMPS.gold);
    P.ball(46, 27, 11, 10, C.main);
    P.ball(56, 31, 7.5, 6, C.main);
    P.dot(61, 28, C.main[0]); P.line(51, 35, 62, 34, C.main[0]); P.dot(58, 36, [255, 255, 255]);
    P.eye(49, 24, 3.8, { look: 0.4, iris: RAMPS.gold }); P.blush(45, 31);
    P.limb(42, 40, 50, 42, 3, 3, C.main); P.ball(51, 42, 2.8, 2.8, C.main);
  },
  construct(P, C) {    // a mossy stone golem with a glowing rune heart
    P.ball(23, 55, 7, 6, C.stone, { facet: true }); P.ball(41, 55, 7.5, 6, C.stone, { facet: true });          // legs
    P.ball(14, 32, 8.5, 8, C.stone, { facet: true });                                                          // back shoulder + arm
    P.ball(11, 43, 6, 8, C.stone, { facet: true }); P.ball(11, 54, 7.5, 6.5, C.stone, { facet: true });
    const body = P.ball(32, 39, 17, 15, C.stone, { facet: true });
    P.band(body, C.dark, (x, y) => (x + y * 2) % 13 === 0 && y > 30);                                             // seams in the stone
    P.ball(33, 21, 9, 8, C.stone, { facet: true });                                                             // head
    P.ball(33, 15, 9, 4, RAMPS.moss, { clip: (x, y) => y < 16, sep: false });
    P.ball(35.5, 21, 6, 2, RAMPS.socket, { sep: false });                                                     // visor slit
    P.eye(37, 21, 1.8, { glow: C.glow, tall: 0.8 });
    P.ball(51, 29, 9.5, 8.5, C.stone, { facet: true });                                                       // front shoulder
    P.ball(50, 23, 8, 3.5, RAMPS.moss, { clip: (x, y) => y < 25, sep: false });
    P.ball(53, 41, 6.5, 8, C.stone, { facet: true }); P.ball(55, 53, 9, 7.5, C.stone, { facet: true });        // front arm + big fist
    for (const [x0, y0, x1, y1] of [[48, 51, 49, 56], [53, 50, 54, 56], [58, 50, 59, 55]]) P.line(x0, y0, x1, y1, C.stone[0]);
    // glowing rune heart and crack lines
    P.ball(31, 39, 4.2, 4.2, C.rune, { tone: 3, sep: false }); P.ball(31, 39, 2, 2, C.rune, { tone: 4, sep: false });
    P.eyes.push([31.5, 39.5]);
    for (const [x0, y0, x1, y1] of [[27, 39, 21, 35], [35, 39, 41, 34], [31, 43, 29, 50], [31, 35, 33, 29]]) P.line(x0, y0, x1, y1, C.rune[3]);
  },
  elemental(P, C) {
    P.poly([[16, 52], [10, 36], [16, 40], [15, 24], [22, 32], [26, 10], [32, 26], [38, 4], [42, 24], [48, 14], [48, 30], [55, 26], [50, 52]], C.outer, { tone: 2, sep: false });
    P.poly([[20, 52], [17, 40], [23, 42], [26, 24], [31, 34], [37, 16], [41, 32], [45, 26], [46, 52]], C.outer, { tone: 3, sep: false });
    P.ball(33, 42, 13, 11, C.core, { tone: 3, sep: false });
    P.ball(33, 45, 9, 7, C.core, { tone: 4, sep: false });
    P.eye(29, 40, 3.6, { look: 0.35 }); P.eye(39, 40, 3.6, { look: 0.35 });
    P.ball(35, 48, 2.6, 2.2, RAMPS.mouth, { tone: 1, sep: false }); P.blush(24, 45); P.blush(42, 45);
    for (const [x, y, r] of [[10, 22, 1.6], [56, 18, 1.4], [8, 46, 1.2], [58, 40, 1.6]]) P.ball(x, y, r, r, C.outer, { tone: 4, sep: false });
    P.eyes.push([33, 30]);
  },
  fae(P, C) {     // a goblin with huge ears
    P.limb(30, 47, 28, 58, 3, 2.8, C.skin); P.limb(37, 47, 39, 58, 3, 2.8, C.skin);
    P.ball(27, 59, 4.5, 2.3, RAMPS.boot); P.ball(40, 59, 4.5, 2.3, RAMPS.boot);
    P.limb(52, 44, 58, 26, 1.2, 1.2, RAMPS.wood); P.poly([[56, 27], [59, 16], [62, 27]], RAMPS.steel);          // a little spear
    P.ball(33, 40, 10, 9.5, C.cloth);
    P.ball(33, 46, 10.5, 2, RAMPS.wood, { clip: (x, y) => Math.abs(y - 46) < 1.6, sep: false });
    P.poly([[24, 20], [6, 10], [14, 22], [8, 26], [24, 27]], C.skin); P.poly([[22, 21], [11, 14], [15, 21], [22, 24]], RAMPS.pink, { sep: false });   // back ear
    P.ball(35, 22, 12.5, 11, C.skin);
    P.poly([[44, 17], [62, 6], [56, 18], [62, 22], [46, 25]], C.skin); P.poly([[46, 18], [57, 11], [53, 18], [46, 22]], RAMPS.pink, { sep: false });
    P.ball(35, 14, 13, 6.5, C.cloth, { clip: (x, y) => y < 15 });                                                // hood cap
    P.eye(33, 21, 4, { iris: RAMPS.gold, look: 0.4 }); P.eye(42, 21, 4.2, { iris: RAMPS.gold, look: 0.4 });
    P.ball(42, 27, 2.4, 2, C.skin, { sep: false });
    P.ball(39, 31, 5, 2.6, RAMPS.mouth, { tone: 1, sep: false, clip: (x, y) => y >= 30 }); P.poly([[40, 30], [42, 30], [41, 32.5]], RAMPS.white, { sep: false });
    P.limb(40, 37, 50, 41, 2.8, 2.8, C.cloth); P.ball(51, 42, 2.8, 2.8, C.skin);
  },
};

// family colours from the rank hue: main body colour and helpers
function colours(art, hue) {
  const M = (dh, s, l) => ramp(hue + dh, s, l);
  const base = { main: M(0, 58, 52), dark: M(6, 50, 36), glow: ramp(hue + 180, 95, 66) };
  switch (art) {
    case 'ooze': return { ...base, main: M(0, 72, 56) };
    case 'beast': return { ...base, main: M(0, 38, 52), dark: M(6, 34, 38) };
    case 'insect': return { ...base, main: M(0, 45, 24), fur: ramp(28, 62, 46) };
    case 'plant': return { ...base, main: M(0, 70, 54), spot: M(-10, 60, 80), petal: ramp(48, 88, 62) };
    case 'undead': return { ...base, main: M(0, 30, 30), glow: ramp(hue + 180, 95, 64) };
    case 'ghost': return { ...base, main: M(0, 34, 86), iris: M(0, 60, 40) };
    case 'human': return { ...base, main: M(0, 64, 46), cloth: M(160, 28, 40), scarf: M(0, 22, 30) };
    case 'reptile': return { ...base, main: M(0, 52, 46), dark: M(8, 46, 32), crest: M(150, 70, 52) };
    case 'aquatic': return { ...base, main: M(0, 58, 52), fin: M(30, 70, 62) };
    case 'bird': return { ...base, main: M(0, 60, 58), wing: M(18, 52, 44), crest: ramp(355, 75, 55) };
    case 'demon': return { ...base, main: M(0, 58, 46), belly: M(30, 40, 66), wing: M(20, 34, 26) };
    case 'dragon': return { ...base, main: M(0, 60, 48), wing: M(20, 52, 36), spike: M(40, 60, 64) };
    case 'construct': return { ...base, stone: ramp(hue + 20, 9, 56), dark: ramp(hue + 20, 9, 44), rune: ramp(hue + 180, 95, 62), glow: ramp(hue + 180, 95, 66) };
    case 'elemental': return { ...base, outer: M(0, 95, 56), core: M(-12, 95, 74) };
    case 'fae': return { ...base, skin: ramp(100, 40, 52), cloth: M(0, 50, 42) };
    default: return base;
  }
}

const cache = new Map();
export function paintSprite(art, hue) {
  const f = FAM[art]; if (!f || typeof document === 'undefined') return null;
  const key = art + ':' + hue; let s = cache.get(key); if (s) return s;
  const P = new Painter(64, 64); f(P, colours(art, hue)); s = P.finish(); cache.set(key, s); return s;
}
export const hasPainted = (art) => !!FAM[art];
