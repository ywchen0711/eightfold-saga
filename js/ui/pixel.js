// SNES-style rendering: a scene is drawn into a small low-resolution canvas (about 270 px tall) and scaled up with
// hard pixel edges. Also sprites with a dark one-pixel outline, like 16-bit sprites.
import { App } from './app.js';

const low = document.createElement('canvas'), lc = low.getContext('2d');
export const VH = 270;
// start a low-res frame covering the whole window; returns the context and its size in game pixels
export function beginLow(vh = VH) {
  const s = App.h / vh, W = Math.ceil(App.w / s), H = vh;
  if (low.width !== W || low.height !== H) { low.width = W; low.height = H; }
  lc.setTransform(1, 0, 0, 1, 0, 0); lc.imageSmoothingEnabled = false; lc.clearRect(0, 0, W, H);
  return { c: lc, W, H, s };
}
export function endLow(f) { const c = App.cx; c.save(); c.imageSmoothingEnabled = false; c.drawImage(low, 0, 0, f.W * f.s, f.H * f.s); c.restore(); }
// draw something into a scratch canvas, then stamp it with a dark outline (draw(ctx) draws around (cx, cy))
const tmp = document.createElement('canvas'), tc = tmp.getContext('2d'), sil = document.createElement('canvas'), sc = sil.getContext('2d');
export function outlined(c, x, y, w, h, draw, col = '#100818') {
  w = Math.ceil(w); h = Math.ceil(h);
  if (tmp.width < w + 4 || tmp.height < h + 4) { tmp.width = sil.width = Math.max(tmp.width, w + 4); tmp.height = sil.height = Math.max(tmp.height, h + 4); }
  tc.setTransform(1, 0, 0, 1, 0, 0); tc.clearRect(0, 0, tmp.width, tmp.height); tc.imageSmoothingEnabled = false;
  tc.save(); tc.translate(2, 2); draw(tc); tc.restore();
  sc.setTransform(1, 0, 0, 1, 0, 0); sc.clearRect(0, 0, sil.width, sil.height); sc.globalCompositeOperation = 'source-over';
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) sc.drawImage(tmp, dx, dy);
  sc.globalCompositeOperation = 'source-in'; sc.fillStyle = col; sc.fillRect(0, 0, sil.width, sil.height); sc.globalCompositeOperation = 'source-over';
  c.drawImage(sil, 0, 0, w + 4, h + 4, Math.round(x) - 2, Math.round(y) - 2, w + 4, h + 4);
  c.drawImage(tmp, 0, 0, w + 4, h + 4, Math.round(x) - 2, Math.round(y) - 2, w + 4, h + 4);
}
