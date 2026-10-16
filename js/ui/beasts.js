// Monster pixel art. Each family is built from small 3D forms — ellipsoids and limb capsules — lit per pixel from the
// upper left, coloured from a 5-step ramp that shifts hue (cool shadows, warm highlights) and blended with ordered
// dithering, like hand-shaded 16-bit sprites. Sprites face right, are outlined, cached, and drawn crisp.
// Canonical units: feet at (0, 0), up is negative y; a normal monster is about 70-80 units tall.

// ---------------------------------------------------------------- colours
function hsl(h, s, l, a = 255) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, f = (n) => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return ((a & 255) << 24) | (Math.round(f(4) * 255) << 16) | (Math.round(f(8) * 255) << 8) | Math.round(f(0) * 255);
}
// darkest -> lightest; shadows lean towards blue-violet, highlights towards gold
export function ramp(h, s, l, a = 255) {
  return [hsl(h + 24, s * 0.9, l * 0.32, a), hsl(h + 12, s, l * 0.62, a), hsl(h, s, l, a), hsl(h - 10, s * 0.9, Math.min(90, l * 1.32), a), hsl(h - 22, s * 0.65, Math.min(95, l * 1.65 + 8), a)];
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const L = (() => { const v = [-0.55, -0.68, 0.48], m = Math.hypot(...v); return v.map((x) => x / m); })();
const pick = (R, v, x, y) => R[Math.max(0, Math.min(R.length - 1, Math.round(v * (R.length - 1) + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.45)))];

// ---------------------------------------------------------------- a pixel buffer with 3D-ish primitives
class Buf {
  constructor(w, h, u, ox, oy) { this.w = w; this.h = h; this.u = u; this.ox = ox; this.oy = oy; this.d = new Uint32Array(w * h); this.eyes = []; }
  X(x) { return this.ox + x * this.u; } Y(y) { return this.oy + y * this.u; }
  set(x, y, c) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const a = c >>> 24; if (a === 255 || !this.d[y * this.w + x]) this.d[y * this.w + x] = c; else this.d[y * this.w + x] = blend(this.d[y * this.w + x], c); }
  // an ellipsoid lit from the upper left (o.mask(x, y) in units can cut it)
  e(cx, cy, rx, ry, R, o = {}) {
    const X = this.X(cx), Y = this.Y(cy), RX = rx * this.u, RY = ry * this.u, amb = o.amb ?? 0.16;
    for (let y = Math.floor(Y - RY); y <= Math.ceil(Y + RY); y++) for (let x = Math.floor(X - RX); x <= Math.ceil(X + RX); x++) {
      const dx = (x + 0.5 - X) / RX, dy = (y + 0.5 - Y) / RY, d = dx * dx + dy * dy; if (d > 1) continue;
      if (o.mask && !o.mask((x - this.ox) / this.u, (y - this.oy) / this.u)) continue;
      const nz = Math.sqrt(1 - d), lit = Math.max(0, dx * L[0] + dy * L[1] + nz * L[2]), v = amb + (1 - amb) * lit * (o.k ?? 1);
      this.set(x, y, lit > 0.97 && !o.matte ? R[R.length - 1] : pick(R, Math.min(1, v), x, y));
    }
  }
  // a limb: a tapered capsule from (x1, y1) radius r1 to (x2, y2) radius r2, shaded like a cylinder
  c(x1, y1, x2, y2, r1, r2, R, o = {}) {
    const A = [this.X(x1), this.Y(y1)], B2 = [this.X(x2), this.Y(y2)], R1 = r1 * this.u, R2 = r2 * this.u, amb = o.amb ?? 0.16;
    const vx = B2[0] - A[0], vy = B2[1] - A[1], len2 = vx * vx + vy * vy || 1, pad = Math.max(R1, R2) + 1;
    for (let y = Math.floor(Math.min(A[1], B2[1]) - pad); y <= Math.ceil(Math.max(A[1], B2[1]) + pad); y++) for (let x = Math.floor(Math.min(A[0], B2[0]) - pad); x <= Math.ceil(Math.max(A[0], B2[0]) + pad); x++) {
      const px = x + 0.5, py = y + 0.5, t = Math.max(0, Math.min(1, ((px - A[0]) * vx + (py - A[1]) * vy) / len2));
      const qx = A[0] + vx * t, qy = A[1] + vy * t, r = R1 + (R2 - R1) * t, dx = (px - qx) / r, dy = (py - qy) / r, d = dx * dx + dy * dy; if (d > 1) continue;
      const nz = Math.sqrt(1 - d), v = amb + (1 - amb) * Math.max(0, dx * L[0] + dy * L[1] + nz * L[2]);
      this.set(x, y, pick(R, Math.min(1, v), x, y));
    }
  }
  // a flat shape (wings, blades, cloth): ramp step `i` at the top fading one step darker at the bottom, lit top edge
  p(pts, R, i = 2, o = {}) {
    const P = []; for (let k = 0; k < pts.length; k += 2) P.push([this.X(pts[k]), this.Y(pts[k + 1])]);
    const ys = P.map((q) => q[1]), xs = P.map((q) => q[0]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys)), x0 = Math.floor(Math.min(...xs)), x1 = Math.ceil(Math.max(...xs));
    const inside = (x, y) => { let c = false; for (let a = 0, b = P.length - 1; a < P.length; b = a++) { const [xa, ya] = P[a], [xb, yb] = P[b]; if ((ya > y) !== (yb > y) && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) c = !c; } return c; };
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!inside(x + 0.5, y + 0.5)) continue;
      const g = (y - y0) / Math.max(1, y1 - y0), edge = !inside(x - 0.5, y - 0.5);
      const v = Math.max(0, Math.min(R.length - 1, i + (edge && !o.noEdge ? 1 : 0) - (o.fade ?? 1) * g + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.9));
      this.set(x, y, R[Math.round(v)]);
    }
  }
  l(x1, y1, x2, y2, col, w = 1) { const a = [this.X(x1), this.Y(y1)], b = [this.X(x2), this.Y(y2)], n = Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))) || 1;
    for (let k = 0; k <= n; k++) { const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n; for (let q = 0; q < w; q++) this.set(x + (q % 2), y + (q >> 1), col); } }
  dot(x, y, col) { this.set(this.X(x), this.Y(y), col); }
  // glowing eyes: bright pixels, remembered so the scene can add bloom
  eye(x, y, col, w = 2) { const X = this.X(x), Y = this.Y(y), s = Math.max(1, Math.round(w * this.u * 0.6)); for (let a = 0; a < s; a++) for (let b = 0; b < Math.max(1, s >> 1); b++) this.set(X + a, Y + b, col); this.eyes.push([X + s / 2, Y]); }
}
function blend(dst, src) { const a = (src >>> 24) / 255, b = 1 - a; const ch = (v, s) => ((v >>> s) & 255); return (255 << 24) | (Math.round(ch(src, 16) * a + ch(dst, 16) * b) << 16) | (Math.round(ch(src, 8) * a + ch(dst, 8) * b) << 8) | Math.round(ch(src, 0) * a + ch(dst, 0) * b); }

// ---------------------------------------------------------------- the families (facing right)
const STEEL = ramp(220, 10, 62), BONE = ramp(42, 30, 72), DARK = ramp(260, 20, 16), HORN = ramp(40, 25, 70), CLAW = ramp(40, 15, 80);
const glow = (h) => hsl(h, 95, 68);
const F = {
  ooze(B, h, f) {
    const R = ramp(h, 55, 46, 225), core = ramp(h + 25, 60, 28, 210);
    B.e(-24, -3, 7, 3, R); B.e(22, -2, 8, 3, R); B.e(-6, -2, 10, 3, R);
    B.e(0, -26 + f, 34 - f * 2, 26 + f, R, { amb: 0.25 });
    B.e(-6, -22 + f, 13, 10, core); for (const [x, y, r] of [[10, -14, 3], [-16, -32, 2], [16, -30, 2], [-2, -40, 1.6]]) B.e(x, y + f, r, r, ramp(h - 10, 40, 75, 200));
    B.e(-14, -40 + f, 7, 4, ramp(h - 20, 30, 85, 160));
    B.eye(10, -33 + f, 0xff1c1410, 3); B.eye(20, -32 + f, 0xff1c1410, 3);
  },
  beast(B, h, f) {
    const R = ramp(h, 24, 40), D = ramp(h + 8, 26, 26), belly = ramp(h - 6, 18, 58);
    B.c(-36, -38, -50, -54 - f * 4, 5, 3, R); B.c(-50, -54 - f * 4, -54, -62 - f * 5, 3, 2, D);                       // tail
    B.c(-22, -32, -28, -14, 6, 4, D); B.c(-28, -14, -24, 0, 4, 3, D); B.c(16, -30, 20, 0, 5, 3, D);                    // far legs
    B.e(-4, -38, 30, 13, R); B.e(-2, -32, 22, 6, belly, { mask: (x, y) => y > -34 }); B.e(18, -38, 14, 15, R);          // body, belly, chest
    for (let x = -28; x < 14; x += 3) B.l(x, -50 + Math.abs(x % 6) * 0.3, x + 2, -47, D[1]);                          // fur ridge
    B.c(-16, -32, -22, -14, 7, 4, R); B.c(-22, -14, -15, 0, 4, 3, R); B.c(24, -30, 26, 0, 6, 3, R);                    // near legs
    for (const x of [-16, -24, 20, 26]) B.e(x, -1, 4, 2, D);                                                           // paws
    B.e(30, -50, 11, 10, R); B.c(34, -49, 52, -45 + f, 7, 4, R); B.c(36, -43, 50, -40 + f * 2, 3, 2, D);              // head, snout, jaw
    B.p([26, -57, 28, -72, 34, -58], D, 2); B.p([33, -57, 38, -70, 40, -56], R, 2);                                    // ears
    for (let x = 40; x < 50; x += 3) B.dot(x, -42 + f, 0xfff0f0f0); B.e(52, -46 + f, 2, 2, DARK);                     // teeth, nose
    B.eye(39, -52, glow(48), 3);
  },
  insect(B, h, f) {
    const R = ramp(h, 48, 40), D = ramp(h + 10, 40, 24);
    for (const [x, k] of [[-14, -1], [-2, 0], [10, 1]]) { B.c(x, -28, x - 10 + k * 4, -14, 2, 1.6, D); B.c(x - 10 + k * 4, -14, x - 6 + k * 8, 0, 1.6, 1, D); }
    B.p([-30, -44 - f * 6, -6, -40, -40, -34 - f * 3], ramp(h - 30, 30, 80, 110), 3, { noEdge: 1 });                     // wing
    B.e(-26, -28, 22, 13, R); for (let x = -40; x < -8; x += 6) B.l(x, -38, x + 2, -18, R[0]);                           // segmented abdomen
    B.e(0, -32, 12, 10, R); B.e(16, -38, 9, 8, R);
    B.c(23, -36, 30, -28, 2, 1, D); B.c(21, -33, 26, -26, 2, 1, D);                                                    // mandibles
    B.l(19, -45, 30, -64 + f * 2, D[2]); B.l(15, -46, 20, -66 + f, D[2]);
    for (const [x, k] of [[-12, -1], [0, 0], [12, 1]]) { B.c(x, -26, x - 6 + k * 6, -12, 2.4, 2, R); B.c(x - 6 + k * 6, -12, x + k * 10, 0, 2, 1.2, R); }
    B.eye(19, -41, glow(0), 4);
  },
  plant(B, h, f) {
    const G = ramp(105, 42, 32), FL = ramp(h === 140 ? 330 : h, 55, 52);
    for (const [x, y] of [[-20, 0], [-8, 2], [10, 1], [22, 0]]) B.c(0, -6, x, y, 4, 2, ramp(30, 30, 28));          // roots
    B.c(0, -4, -2, -30, 7, 5, G); B.c(-2, -30, 6, -46 + f, 5, 4, G);
    B.p([-2, -22, -30, -34, -22, -24, -4, -18], G, 3); B.l(-4, -20, -26, -30, G[1]);
    B.p([2, -32, 30, -40, 22, -30, 4, -28], G, 3); B.l(4, -30, 26, -37, G[1]);
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 + f * 0.1; B.e(8 + Math.cos(a) * 18, -58 + Math.sin(a) * 16, 9, 7, FL); }
    B.e(8, -58, 16, 14, FL); B.e(16, -56, 9, 7, ramp(350, 55, 26), { matte: 1 }); B.e(17, -55, 5, 4, ramp(345, 60, 14), { matte: 1 });
    for (let x = 9; x < 24; x += 3) { B.dot(x, -62, 0xffe8e8e0); B.dot(x + 1, -50, 0xffe8e8e0); }
    B.eye(4, -66, glow(60), 2);
  },
  undead(B, h, f) {
    const D = ramp(h, 30, 22), RUST = ramp(25, 35, 36), CL = ramp(h + 20, 20, 24);
    B.c(-4, -32, -8, -16, 2.6, 2, BONE, { amb: 0.1 }); B.c(-8, -16, -6, 0, 2, 2, BONE, { amb: 0.1 });                 // far leg
    B.p([-9, -36, 9, -36, 12, -18, 2, -22, -4, -16, -11, -20], CL, 2);                                                 // torn loincloth
    B.e(0, -35, 8, 4, BONE); B.c(0, -36, -1, -58, 2, 2, BONE);
    for (let k = 0; k < 4; k++) { const y = -42 - k * 4.5; B.c(-8, y, 0, y - 2, 1.6, 1.6, BONE); B.c(0, y - 2, 8, y, 1.6, 1.6, BONE); }
    B.c(-6, -56, -16, -42, 2, 1.6, BONE); B.p([-26, -50, -10, -54, -8, -32, -18, -26, -26, -34], RUST, 2); B.l(-17, -52, -17, -28, RUST[4]);   // shield arm
    B.c(4, -32, 8, -16, 2.6, 2, BONE); B.c(8, -16, 6, 0, 2, 2, BONE);                                                  // near leg
    B.e(2, -66, 9, 9, BONE); B.c(3, -58, 6, -56, 4, 3, BONE); B.e(-1, -66, 3, 3, DARK); B.e(6, -66, 3, 3, DARK); B.dot(2, -61, BONE[0]);
    B.c(6, -55, 14, -44, 2, 1.6, BONE); B.c(14, -44, 22, -50 - f * 2, 1.6, 1.4, BONE);                                 // sword arm
    B.p([21, -50 - f * 2, 24, -52 - f * 2, 40, -84 - f * 2, 37, -84 - f * 2], STEEL, 3); B.l(18, -47 - f * 2, 27, -55 - f * 2, ramp(40, 50, 45)[2], 2);
    B.eye(-2, -67, glow(h), 2); B.eye(5, -67, glow(h), 2);
  },
  ghost(B, h, f) {
    const R = ramp(h, 40, 62, 170), D = ramp(h + 30, 40, 18, 230);
    B.c(-4, -30, -16, -12 + f * 2, 12, 6, R, { amb: 0.3 }); B.c(-16, -12 + f * 2, -26, -4, 6, 2, R, { amb: 0.3 });
    B.e(0, -50, 20, 24, R, { amb: 0.32 });
    B.c(12, -46, 28, -40 + f * 2, 4, 2.4, R, { amb: 0.3 }); for (let k = 0; k < 3; k++) B.l(28, -40 + f * 2, 34, -44 + k * 3 + f * 2, R[4]);
    B.e(4, -54, 12, 13, D); B.e(-2, -66, 16, 10, ramp(h + 10, 30, 30, 200), { mask: (x, y) => y < -62 });
    B.eye(0, -56, glow(h + 180), 3); B.eye(9, -56, glow(h + 180), 3); B.e(5, -46, 3, 4, ramp(0, 0, 4));
  },
  human(B, h, f) {
    const CL = ramp(h, 28, 30), LE = ramp(25, 30, 24), SK = ramp(25, 40, 62);
    B.p([-12, -54, 6, -54, 10, -14, -4, -12, -14, -18], ramp(h + 10, 26, 22), 2);                                     // cloak behind
    B.c(-4, -30, -6, -2, 4, 3, LE); B.c(5, -30, 6, -2, 4, 3, LE); B.e(-6, -1, 5, 2, DARK); B.e(7, -1, 5, 2, DARK);    // legs and boots
    B.c(0, -32, 0, -52, 10, 11, STEEL); B.e(0, -44, 9, 7, CL, { mask: (x, y) => y > -48 }); B.l(-9, -33, 9, -33, ramp(30, 40, 30)[1], 2);
    B.e(-10, -52, 5, 4, STEEL); B.e(10, -52, 5, 4, STEEL);
    B.c(-10, -50, -14, -36, 3.4, 3, CL); B.p([-22, -50, -8, -50, -8, -28, -15, -22, -22, -28], ramp(h, 40, 34), 2); B.e(-15, -40, 3, 3, ramp(45, 60, 55));  // shield
    B.e(2, -62, 8, 8, STEEL); B.l(-2, -62, 9, -62, DARK[0], 2); B.p([0, -70, 4, -78 - f, 8, -69], ramp(h, 70, 45), 3);   // helmet, plume
    B.c(10, -50, 18, -40, 3.4, 3, CL); B.c(18, -40, 22, -46, 3, 2.4, SK);
    B.p([21, -47, 24, -48, 42, -76, 39, -77], STEEL, 3); B.l(18, -44, 27, -51, ramp(40, 50, 45)[2], 2);              // sword
    B.eye(4, -62, glow(40), 2); B.eye(7, -62, glow(40), 2);
  },
  reptile(B, h, f) {
    const R = ramp(h, 38, 36), BE = ramp(h - 30, 30, 62), D = ramp(h + 10, 40, 22);
    B.c(-6, -22, -30, -10, 7, 4, R); B.c(-30, -10, -46, -4 - f * 3, 4, 1.6, R);                                       // tail
    B.c(-2, -26, -10, -12, 5, 3.6, D); B.c(-10, -12, -6, 0, 3.6, 2.4, D);
    B.c(0, -22, 4, -52, 10, 9, R); B.e(4, -38, 6, 12, BE, { mask: (x) => x > 2 });
    for (let y = -50; y < -24; y += 4) for (let x = -6; x < 2; x += 4) B.dot(x + (y % 8 ? 2 : 0), y, R[1]);           // scales
    for (let k = 0; k < 5; k++) B.p([-6 + k, -48 + k * 6, -12 + k, -44 + k * 6, -5 + k, -42 + k * 6], D, 2);         // dorsal spikes
    B.c(4, -26, 10, -12, 5, 3.6, R); B.c(10, -12, 6, 0, 3.6, 2.4, R);
    B.e(8, -60, 8, 7, R); B.c(10, -60, 26, -56, 5, 3, R); B.c(12, -54, 24, -52 + f, 2.4, 1.6, D);
    for (let x = 14; x < 24; x += 3) B.dot(x, -55 + f * 0.5, 0xffe8e8e0);
    B.l(14, -50, 30, -90, ramp(30, 40, 34)[2], 2); B.p([28, -90, 32, -90, 30, -100], STEEL, 3);                        // spear
    B.c(8, -48, 16, -44, 3, 2.4, R);
    B.eye(13, -63, glow(55), 3);
  },
  aquatic(B, h, f) {
    const R = ramp(h, 42, 40), BE = ramp(h - 40, 30, 66), FN = ramp(h + 30, 50, 50, 190);
    B.p([-6, -60, -20, -70 - f * 2, -16, -40], FN, 3); B.p([-10, -36, -24, -30, -12, -24], FN, 3);                   // fins
    B.c(-4, -24, -8, -2, 4.4, 3, R); B.c(6, -24, 8, -2, 4.4, 3, R); B.e(-8, -1, 6, 2, FN); B.e(9, -1, 6, 2, FN);
    B.c(0, -24, 2, -50, 11, 10, R); B.e(4, -38, 6, 11, BE, { mask: (x) => x > 1 });
    for (let y = -48; y < -26; y += 3) for (let x = -8; x < 2; x += 3) if ((x + y) % 2) B.dot(x, y, R[3]);
    B.e(8, -60, 11, 9, R); B.e(14, -56, 6, 4, ramp(0, 30, 22)); for (let x = 10; x < 18; x += 2) B.dot(x, -58, 0xffe8e8e0);
    B.c(10, -46, 18, -36, 3.4, 2.4, R); B.l(18, -30, 22, -86, ramp(40, 60, 50)[2], 2);
    for (const dx of [-4, 0, 4]) B.l(22 + dx * 0.2, -86, 22 + dx, -96, STEEL[3]); B.l(18, -86, 26, -86, STEEL[3]);   // trident
    B.eye(12, -63, glow(170), 3);
  },
  bird(B, h, f) {
    const R = ramp(h, 36, 40), W = ramp(h + 10, 34, 30), BK = ramp(40, 70, 50);
    const up = f ? -14 : 8;
    for (let row = 0; row < 3; row++) B.p([-4, -52 + row * 3, -46 - row * 4, -74 + up + row * 8, -40 + row * 6, -44 + row * 4, -18, -40 + row * 2], row === 2 ? R : W, 3 - row * 0.5);   // far wing, feather rows
    B.c(-6, -18, -8, 0, 2, 1.4, BK); B.c(6, -18, 6, 0, 2, 1.4, BK);
    B.e(0, -36, 16, 20, R); B.e(4, -30, 9, 12, ramp(h - 30, 20, 66), { mask: (x) => x > 0 }); B.c(-12, -34, -30, -26, 5, 2, W);   // body, breast, tail
    B.e(10, -60, 10, 9, R); B.p([18, -62, 30, -58, 18, -54], BK, 3);
    for (let row = 0; row < 3; row++) B.p([4, -50 + row * 3, 40 + row * 4, -76 + up + row * 8, 34 - row * 6, -44 + row * 4, 12, -40 + row * 2], row === 2 ? R : W, 3.5 - row * 0.5);   // near wing
    for (const x of [-8, 6]) for (const k of [-3, 0, 3]) B.l(x, 0, x + k, 2, CLAW[1]);
    B.eye(14, -62, glow(45), 3);
  },
  demon(B, h, f) {
    const R = ramp(h, 40, 34), M = ramp(h + 20, 36, 22, 235);
    const fl = f * 6;
    B.p([-4, -58, -50, -90 - fl, -44, -66, -38, -70, -34, -48, -24, -52, -14, -40], M, 2); for (const [x, y] of [[-50, -90 - fl], [-38, -70], [-24, -52]]) B.l(-4, -58, x, y, M[3]);
    B.c(-8, -10, -24, -4 - f * 3, 3, 1.4, R); B.p([-26, -8 - f * 3, -32, -4 - f * 3, -24, 0 - f * 3], R, 3);           // tail
    B.c(-4, -28, -8, -14, 5, 4, R); B.c(-8, -14, -4, 0, 4, 2.6, R); B.c(6, -28, 10, -14, 5, 4, R); B.c(10, -14, 8, 0, 4, 2.6, R);
    B.c(0, -28, 0, -54, 10, 12, R); B.e(4, -48, 8, 6, ramp(h, 30, 46), { mask: (x) => x > 0 });
    B.c(-8, -54, -14, -36, 4, 3, R); B.c(10, -54, 20, -40, 4, 3, R); for (const k of [-2, 0, 2]) B.l(20, -40, 26, -38 + k * 2, CLAW[2]);
    B.e(2, -64, 9, 9, R); B.p([-4, -70, -12, -86, -1, -72], HORN, 3); B.p([6, -71, 12, -88, 9, -70], HORN, 3);
    B.p([7, -60, 13, -60, 10, -57], ramp(0, 0, 90), 3);
    B.eye(4, -66, glow(50), 2); B.eye(9, -66, glow(50), 2);
    B.p([4, -58, 46, -92 - fl, 42, -66, 36, -70, 30, -48, 22, -52, 14, -40], M, 3); for (const [x, y] of [[46, -92 - fl], [36, -70], [22, -52]]) B.l(4, -58, x, y, M[4]);
  },
  dragon(B, h, f) {
    const R = ramp(h, 40, 34), BE = ramp(h - 30, 35, 62), M = ramp(h + 18, 36, 24, 235), up = f * 8;
    B.p([-6, -54, -56, -98 - up, -44, -60, -30, -64, -20, -42], M, 2); B.l(-6, -54, -56, -98 - up, M[3], 2); B.l(-6, -54, -44, -60, M[3]);
    B.c(-28, -30, -60, -18, 10, 5, R); B.c(-60, -18, -76, -10 - f * 4, 5, 2, R); B.p([-76, -14 - f * 4, -86, -10 - f * 4, -78, -4 - f * 4], R, 3);
    B.c(-18, -26, -22, 0, 7, 5, ramp(h + 10, 40, 24)); B.c(16, -26, 20, 0, 7, 5, ramp(h + 10, 40, 24));
    B.e(-2, -36, 32, 20, R); B.e(4, -28, 22, 9, BE, { mask: (x, y) => y > -32 });
    for (let x = -26; x < 22; x += 5) B.p([x, -54 + Math.abs(x) * 0.1, x + 3, -60 + Math.abs(x) * 0.1, x + 5, -54 + Math.abs(x) * 0.1], HORN, 2);   // back spines
    B.c(-12, -24, -16, 0, 8, 6, R); B.c(22, -24, 26, 0, 8, 6, R); for (const x of [-16, 26]) for (const k of [-3, 0, 3]) B.l(x + k, 0, x + k + 2, 2, CLAW[1]);
    B.c(20, -46, 34, -70, 10, 7, R); B.e(26, -54, 6, 9, BE, { mask: (x) => x > 24 });
    B.e(40, -76, 12, 9, R); B.c(44, -74, 62, -70 + f, 7, 4, R); B.c(46, -68, 60, -64 + f * 2, 3.4, 2, ramp(h + 10, 40, 22));
    for (let x = 48; x < 60; x += 3) B.dot(x, -66 + f, 0xfff0f0e8);
    B.p([34, -82, 26, -100, 40, -84], HORN, 3); B.p([40, -84, 38, -102, 46, -84], HORN, 3);
    B.eye(46, -78, glow(45), 3);
    B.p([4, -56, 46, -104 - up, 44, -64, 34, -66, 24, -44], M, 3); B.l(4, -56, 46, -104 - up, M[4], 2); B.l(4, -56, 44, -64, M[4]);
  },
  construct(B, h, f) {
    const S2 = ramp(h, 12, 44), D = ramp(h, 14, 28), RUNE = glow(h + 160);
    B.p([-20, -30, -8, -30, -8, 0, -22, 0], D, 2); B.p([8, -30, 20, -30, 22, 0, 8, 0], S2, 2);                       // legs
    B.p([-28, -78, 28, -78, 30, -28, -30, -28], S2, 3); B.p([16, -78, 28, -78, 30, -28, 18, -28], D, 2);               // torso front and side
    for (let y = -70; y < -32; y += 12) B.l(-26, y, 16, y + 2, S2[0]);
    B.l(-12, -66, -4, -50, RUNE, 2); B.l(-4, -50, -12, -40, RUNE, 2); B.eye(-3, -58, RUNE, 2);                        // a glowing rune
    B.p([-44, -78, -30, -80, -30, -36 + f, -42, -38 + f], D, 2); B.p([30, -80, 44, -78, 44, -36 - f, 32, -38 - f], S2, 3);   // arms
    B.e(-37, -34 + f, 8, 6, D); B.e(38, -34 - f, 8, 6, S2);
    B.p([-12, -96, 12, -96, 14, -78, -12, -78], S2, 3); B.l(-8, -88, 10, -88, DARK[0], 2);
    B.eye(-2, -89, glow(h + 180), 4);
  },
  elemental(B, h, f) {
    const R = ramp(h, 80, 55, 210), C = ramp(h - 10, 90, 70, 240);
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 + f * 0.4, x = Math.cos(a) * 24, y = -46 + Math.sin(a) * 18; B.c(x * 0.4, y * 0.4 - 28, x, y - 10 - (k % 2) * 8, 6, 2, R, { amb: 0.35 }); }
    B.e(0, -46, 20, 20, C, { amb: 0.45 }); B.e(-4, -50, 9, 9, ramp(h - 20, 40, 92, 240), { amb: 0.6 });
    for (let k = 0; k < 10; k++) B.dot(((k * 37) % 50) - 25, -10 - ((k * 23 + f * 7) % 70), C[4]);
    B.eye(-4, -48, 0xff1a1010, 3); B.eye(6, -48, 0xff1a1010, 3);
  },
  fae(B, h, f) {
    const SK = ramp(95, 30, 42), CL = ramp(h, 40, 34), W = ramp(h - 60, 40, 80, 120);
    B.p([-2, -44, -26, -66 - f * 6, -22, -40], W, 3, { noEdge: 1 }); B.p([-2, -40, -22, -30 + f * 4, -12, -30], W, 3, { noEdge: 1 });
    B.c(-3, -18, -5, 0, 2.6, 2, SK); B.c(4, -18, 6, 0, 2.6, 2, SK);
    B.c(0, -20, 0, -38, 7, 8, CL); B.l(-7, -22, 7, -22, ramp(30, 40, 30)[2], 2);
    B.e(2, -48, 10, 9, SK); B.p([-6, -50, -18, -58, -6, -44], SK, 3); B.p([10, -50, 22, -58, 10, -44], SK, 3);       // big ears
    B.p([-6, -54, 2, -70, 10, -54], CL, 3);                                                                          // pointed hood
    B.c(8, -34, 14, -26, 2.4, 2, SK); B.p([13, -27, 15, -28, 24, -40, 22, -41], STEEL, 3);                           // knife
    for (let x = 3; x < 10; x += 2) B.dot(x, -43, 0xffe8e8e0);
    B.eye(2, -50, glow(55), 2); B.eye(7, -50, glow(55), 2);
  },
  god(B, h, f) {
    const R = ramp(h, 40, 22), M = ramp(h + 20, 50, 40, 200), HAL = glow(h - 30);
    for (let k = 0; k < 64; k++) { const a = k / 64 * Math.PI * 2; B.dot(Math.cos(a) * 46, -96 + Math.sin(a) * 46, HAL); if (k % 2) B.dot(Math.cos(a) * 40, -96 + Math.sin(a) * 40, M[3]); }
    for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.5; B.c(Math.cos(a) * 14, -86 + Math.sin(a) * 12, Math.cos(a) * 58, -84 + Math.sin(a) * 44 + (f ? 4 : -4) * (k % 2 ? 1 : -1), 6, 2, M); }
    B.p([-36, 0, 36, 0, 22, -74, -22, -74], R, 2); B.l(0, -70, 0, -4, R[0], 2);
    B.e(0, -88, 22, 24, R); B.e(0, -86, 15, 17, ramp(h, 30, 6));
    for (const [x, y] of [[-6, -92], [6, -92], [0, -82], [-10, -80], [10, -80]]) B.eye(x, y, HAL, 3);
    B.p([-14, -108, -6, -128, 0, -110, 6, -128, 14, -108], ramp(45, 70, 55), 3);
  },
};

// ---------------------------------------------------------------- rendering with a cache
const cache = new Map();
// a cached sprite for a family, hue, scale (sprite pixels per unit) and frame: { cv, ox, oy, eyes, white }
export function beast(art, hue, u, frame) {
  u = Math.max(0.2, Math.round(u * 20) / 20);
  const key = `${art}:${hue}:${u}:${frame}`; let s = cache.get(key); if (s) return s;
  if (cache.size > 300) cache.clear();
  const W = Math.ceil(190 * u) + 6, H = Math.ceil(140 * u) + 6, ox = Math.round(W / 2), oy = H - 3;
  const B = new Buf(W, H, u, ox, oy);
  (F[art] || F.ooze)(B, hue, frame);
  // a dark outline around the sprite
  const out = new Uint32Array(B.d), OL = 0xff180c10;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (B.d[i]) continue;
    if ((x > 0 && B.d[i - 1] >>> 24 > 150) || (x < W - 1 && B.d[i + 1] >>> 24 > 150) || (y > 0 && B.d[i - W] >>> 24 > 150) || (y < H - 1 && B.d[i + W] >>> 24 > 150)) out[i] = OL; }
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  const img = c.createImageData(W, H); new Uint32Array(img.data.buffer).set(out); c.putImageData(img, 0, 0);
  const white = document.createElement('canvas'); white.width = W; white.height = H; const wc = white.getContext('2d'); wc.drawImage(cv, 0, 0); wc.globalCompositeOperation = 'source-in'; wc.fillStyle = 'rgba(255,250,240,.9)'; wc.fillRect(0, 0, W, H);
  s = { cv, white, ox, oy, eyes: B.eyes, W, H }; cache.set(key, s); return s;
}
export const ARTS = Object.keys(F);
