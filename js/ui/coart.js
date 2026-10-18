// The Chosen Ones art style, shared with Eightfold Saga: 16px tiles, little 4-direction people (DQ-style), and cute
// outlined monsters. Copied from Chosen Ones' js/art.js, plus robes on any look, small accessories, and fish / bee / wisp monsters.
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const cache = new Map();
const memo = (key, fn) => { let v = cache.get(key); if (!v) { v = fn(); cache.set(key, v); } return v; };
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}
let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// ---------------------------------------------------------------- tiles (16x16)
const THEMES = {
  town:   { floor: '#5aa83a', floor2: '#4e9a32', wall: '#8e8a96', wall2: '#5e5a68', top: '#c05a3a' },
  castle: { floor: '#9a9488', floor2: '#8a847a', wall: '#7a7a88', wall2: '#55556a', top: '#a0a0b0' },
  cave:   { floor: '#7a6448', floor2: '#6a563c', wall: '#4a3a2a', wall2: '#2e2418', top: '#6a5440' },
  tower:  { floor: '#8a8070', floor2: '#7a7060', wall: '#6a5a6a', wall2: '#463a46', top: '#8a7a8a' },
  dark:   { floor: '#4a3a5a', floor2: '#3e304e', wall: '#2a1a3a', wall2: '#140a1e', top: '#5a3a6a' },
  shrine: { floor: '#c8d0e0', floor2: '#b8c0d4', wall: '#7a8ab0', wall2: '#4a5a80', top: '#a0b0d8' },
};
function tileCanvas(id, theme, frame) {
  return memo(`t:${id}:${theme}:${frame}`, () => {
    const c = mk(16, 16), g = c.getContext('2d'), th = THEMES[theme] || THEMES.town;
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    seed = id.split('').reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7) % 99991 + 1;
    const speck = (base, dark, n) => { R(0, 0, 16, 16, base); for (let i = 0; i < n; i++) R(Math.floor(rnd() * 16), Math.floor(rnd() * 16), 1, 1, dark); };
    const grass = () => { speck('#5aa83a', '#4a9030', 14); for (let i = 0; i < 4; i++) { const x = Math.floor(rnd() * 14), y = Math.floor(rnd() * 13); R(x, y, 1, 2, '#3e8a2a'); R(x + 1, y + 1, 1, 2, '#3e8a2a'); } };
    // furniture indoors stands on the wooden floor in towns, on the map's own floor elsewhere
    const under = () => { if (theme === 'town') { R(0, 0, 16, 16, '#b08050'); for (let y = 0; y < 16; y += 4) R(0, y, 16, 1, '#8a6038'); } else R(0, 0, 16, 16, th.floor); };
    switch (id) {
      case 'grass': grass(); break;
      case 'flowers': grass(); for (let i = 0; i < 5; i++) { const x = 1 + Math.floor(rnd() * 13), y = 1 + Math.floor(rnd() * 13); R(x, y, 2, 2, ['#ff7ab0', '#fff07a', '#ffffff'][i % 3]); } break;
      case 'path': speck('#c8a870', '#b09058', 18); break;
      case 'sand': speck('#e8d090', '#d0b070', 16); R(3, 10, 4, 1, '#d8bc78'); R(9, 4, 5, 1, '#d8bc78'); break;
      case 'swamp': speck('#5a6a3a', '#4a5a2e', 18); R(3, 4, 5, 2, '#7a5aa0'); R(9, 10, 4, 2, '#7a5aa0'); break;
      case 'forest': grass(); for (const [x, y] of [[1, 2], [8, 0], [4, 8], [10, 8]]) { R(x + 2, y + 6, 2, 3, '#6a4a2a'); R(x, y + 1, 6, 5, '#2e7a2a'); R(x + 1, y, 4, 7, '#2e7a2a'); R(x + 1, y + 1, 2, 2, '#4aa040'); } break;
      case 'tree': grass(); R(7, 10, 3, 5, '#6a4a2a'); R(2, 2, 12, 9, '#2e7a2a'); R(4, 1, 8, 11, '#2e7a2a'); R(4, 3, 4, 3, '#4aa040'); R(2, 2, 1, 1, '#5aa83a'); break;
      case 'hills': grass(); for (const [x, y] of [[1, 4], [7, 9]]) { g.fillStyle = '#7ab04a'; g.beginPath(); g.ellipse(x + 4, y + 4, 5, 3.5, 0, Math.PI, 0); g.fill(); R(x, y + 4, 9, 1, '#4a8a2a'); } break;
      case 'mountain': grass(); g.fillStyle = '#8a7a6a'; g.beginPath(); g.moveTo(0, 15); g.lineTo(8, 1); g.lineTo(16, 15); g.fill(); g.fillStyle = '#6a5a4a'; g.beginPath(); g.moveTo(8, 1); g.lineTo(16, 15); g.lineTo(10, 15); g.fill(); g.fillStyle = '#f4f4f4'; g.beginPath(); g.moveTo(8, 1); g.lineTo(5.5, 5.5); g.lineTo(10.5, 5.5); g.fill(); break;
      case 'sea': R(0, 0, 16, 16, '#2a5ac8'); R(frame ? 2 : 6, 4, 4, 1, '#6a9aff'); R(frame ? 9 : 11, 10, 4, 1, '#6a9aff'); R(frame ? 12 : 1, 13, 3, 1, '#4a7ae8'); break;
      case 'water': R(0, 0, 16, 16, '#3a7ae0'); R(frame ? 3 : 8, 5, 4, 1, '#8ab8ff'); R(frame ? 10 : 2, 11, 4, 1, '#8ab8ff'); break;
      case 'bridge': R(0, 0, 16, 16, '#2a5ac8'); R(0, 2, 16, 12, '#a8784a'); for (let x = 1; x < 16; x += 4) R(x, 2, 1, 12, '#7a5232'); R(0, 2, 16, 1, '#c8986a'); R(0, 13, 16, 1, '#5a3a20'); break;
      case 'rock': grass(); g.fillStyle = '#7a7a7a'; g.beginPath(); g.ellipse(8, 9, 7, 6, 0, 0, 7); g.fill(); g.fillStyle = '#9a9a9a'; g.beginPath(); g.ellipse(6, 7, 3, 2, 0, 0, 7); g.fill(); R(4, 13, 9, 1, '#4a4a4a'); break;
      case 'miasma': R(0, 0, 16, 16, '#3a1a4a'); for (let i = 0; i < 6; i++) R(Math.floor(rnd() * 14), Math.floor(rnd() * 14), 3, 2, frame ? '#6a2a7a' : '#5a1a6a'); break;
      case 'void': R(0, 0, 16, 16, '#000'); break;
      // town and dungeon pieces in the map's theme
      case 'floor': { if (theme === 'town') { grass(); break; } R(0, 0, 16, 16, th.floor); R(0, 0, 16, 1, th.floor2); R(0, 0, 1, 16, th.floor2); R(8, 8, 8, 1, th.floor2); R(8, 8, 1, 8, th.floor2); break; }
      case 'wall': if (theme === 'cave') { R(0, 0, 16, 16, th.wall2); for (const [x, y, w, h] of [[1, 1, 7, 6], [9, 0, 6, 5], [0, 8, 6, 7], [7, 7, 8, 8]]) { R(x, y, w, h, th.wall); R(x, y, w, 1, th.top); R(x, y + h - 1, w, 1, '#1e160e'); } break; }
        R(0, 0, 16, 16, th.wall); for (let y = 0; y < 16; y += 4) { R(0, y, 16, 1, th.wall2); for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) R(x, y, 1, 4, th.wall2); } R(0, 0, 16, 2, th.top); break;
      case 'cwall': R(0, 0, 16, 16, '#6a6a78'); R(0, 0, 16, 4, '#8a8a98'); for (let x = 0; x < 16; x += 4) R(x, 0, 2, 2, '#4a4a58'); for (let y = 6; y < 16; y += 5) R(0, y, 16, 1, '#4a4a58'); break;
      case 'crack': R(0, 0, 16, 16, th.wall); for (let y = 0; y < 16; y += 4) R(0, y, 16, 1, th.wall2); R(0, 0, 16, 2, th.top); g.strokeStyle = '#1a1010'; g.lineWidth = 1; g.beginPath(); g.moveTo(5, 2); g.lineTo(9, 7); g.lineTo(6, 11); g.lineTo(10, 15); g.stroke(); break;
      case 'wood': R(0, 0, 16, 16, '#b08050'); for (let y = 0; y < 16; y += 4) R(0, y, 16, 1, '#8a6038'); R(5, 0, 1, 4, '#8a6038'); R(11, 4, 1, 4, '#8a6038'); R(3, 8, 1, 4, '#8a6038'); R(13, 12, 1, 4, '#8a6038'); break;
      case 'stone': R(0, 0, 16, 16, '#a8a49a'); R(0, 0, 16, 1, '#8a867c'); R(0, 0, 1, 16, '#8a867c'); R(8, 8, 8, 1, '#8a867c'); R(8, 8, 1, 8, '#8a867c'); break;
      case 'carpet': R(0, 0, 16, 16, '#b82a3a'); R(0, 0, 2, 16, '#f0c040'); R(14, 0, 2, 16, '#f0c040'); break;
      case 'door': R(0, 0, 16, 16, th.wall); R(2, 1, 12, 15, '#7a4a20'); R(3, 2, 10, 14, '#a8682a'); R(7, 2, 1, 14, '#7a4a20'); R(10, 9, 2, 2, '#f0d040'); break;
      case 'counter': R(0, 0, 16, 16, '#b08050'); R(0, 3, 16, 10, '#8a5a30'); R(0, 3, 16, 2, '#c89060'); R(0, 12, 16, 1, '#5a3a20'); break;
      case 'table': R(0, 0, 16, 16, '#b08050'); R(1, 3, 14, 9, '#8a5a30'); R(1, 3, 14, 2, '#c89060'); R(2, 12, 2, 3, '#5a3a20'); R(12, 12, 2, 3, '#5a3a20'); break;
      case 'bed': R(0, 0, 16, 16, '#b08050'); R(1, 1, 14, 14, '#7a4a20'); R(2, 2, 12, 5, '#ffffff'); R(2, 7, 12, 8, '#4a7ad8'); R(2, 7, 12, 1, '#6a9aff'); break;
      case 'barrel': under(); g.fillStyle = '#9a6a3a'; g.beginPath(); g.ellipse(8, 9, 6, 7, 0, 0, 7); g.fill(); R(2, 5, 12, 1, '#5a3a20'); R(2, 12, 12, 1, '#5a3a20'); g.fillStyle = '#c89060'; g.beginPath(); g.ellipse(8, 3.5, 5, 2, 0, 0, 7); g.fill(); break;
      case 'throne': R(0, 0, 16, 16, '#b82a3a'); R(3, 1, 10, 13, '#c8a030'); R(4, 2, 8, 6, '#d83a4a'); R(4, 9, 8, 4, '#d83a4a'); R(3, 14, 2, 2, '#8a6a10'); R(11, 14, 2, 2, '#8a6a10'); break;
      case 'pillar': under(); R(4, 0, 8, 16, '#d8d4c8'); R(4, 0, 2, 16, '#ffffff'); R(10, 0, 2, 16, '#a8a498'); R(3, 0, 10, 2, '#e8e4d8'); R(3, 14, 10, 2, '#a8a498'); break;
      case 'statue': under(); R(3, 12, 10, 4, '#8a8a8a'); R(6, 2, 4, 10, '#b0b0b0'); R(5, 1, 6, 4, '#c0c0c0'); R(4, 5, 8, 2, '#b0b0b0'); break;
      case 'grave': grass(); R(5, 4, 6, 9, '#9a9a9a'); R(6, 3, 4, 1, '#9a9a9a'); R(7, 6, 2, 4, '#6a6a6a'); R(6, 7, 4, 1, '#6a6a6a'); R(4, 13, 8, 1, '#5a5a5a'); break;
      case 'fence': grass(); R(0, 6, 16, 2, '#c89060'); R(0, 11, 16, 2, '#c89060'); for (let x = 1; x < 16; x += 5) R(x, 3, 2, 12, '#a8784a'); break;
      case 'stairsdown': under(); for (let i = 0; i < 4; i++) R(2 + i, 2 + i * 3, 12 - i * 2, 3, shade('#555555', -i * 0.2)); R(6, 12, 4, 3, '#000'); break;
      case 'stairsup': under(); for (let i = 0; i < 4; i++) R(2, 12 - i * 3, 12, 3, shade('#b0a890', i * 0.15)); R(2, 12, 12, 1, '#6a6050'); break;
      case 'lava': R(0, 0, 16, 16, '#c83a10'); R(frame ? 2 : 7, 4, 5, 2, '#ffb030'); R(frame ? 9 : 3, 11, 5, 2, '#ff7a20'); break;
      case 'altar': under(); R(2, 6, 12, 8, '#e8e8f0'); R(2, 6, 12, 2, '#ffffff'); R(6, 1, 4, 5, '#ffd040'); R(7, 0, 2, 2, '#fff8c0'); break;
      // world-map places
      case 'castle': grass(); R(2, 5, 12, 10, '#d8d8e0'); R(1, 2, 4, 6, '#c8c8d4'); R(11, 2, 4, 6, '#c8c8d4'); R(1, 1, 4, 2, '#3a5ad8'); R(11, 1, 4, 2, '#3a5ad8'); R(6, 3, 4, 4, '#c8c8d4'); R(6, 2, 4, 1, '#d84a3a'); R(6, 10, 4, 5, '#5a3a20'); R(2, 5, 12, 1, '#a0a0b0'); break;
      case 'town': grass(); for (const [x, y, col] of [[1, 6, '#d84a3a'], [8, 2, '#3a7ad8'], [9, 9, '#d8a03a']]) { R(x, y + 3, 6, 4, '#f0e0c0'); g.fillStyle = col; g.beginPath(); g.moveTo(x - 1, y + 3); g.lineTo(x + 3, y); g.lineTo(x + 7, y + 3); g.fill(); R(x + 2, y + 5, 2, 2, '#5a3a20'); } break;
      case 'village': grass(); for (const [x, y] of [[2, 5], [9, 7]]) { R(x, y + 3, 5, 4, '#e0d0a8'); g.fillStyle = '#8a6a3a'; g.beginPath(); g.moveTo(x - 1, y + 3); g.lineTo(x + 2.5, y); g.lineTo(x + 6, y + 3); g.fill(); } R(6, 1, 2, 4, '#2e7a2a'); break;
      case 'cave': grass(); g.fillStyle = '#7a6a5a'; g.beginPath(); g.moveTo(0, 15); g.lineTo(8, 2); g.lineTo(16, 15); g.fill(); g.fillStyle = '#1a1010'; g.beginPath(); g.ellipse(8, 12, 4, 4, 0, Math.PI, 0); g.fill(); R(4, 12, 8, 3, '#1a1010'); break;
      case 'tower': grass(); R(5, 2, 6, 13, '#a8a0b8'); R(4, 1, 8, 2, '#8a80a0'); for (let x = 4; x < 12; x += 2) R(x, 0, 1, 1, '#8a80a0'); R(7, 5, 2, 2, '#2a2040'); R(6, 11, 4, 4, '#3a2a20'); break;
      case 'shrine': grass(); R(2, 7, 12, 8, '#e8eef8'); g.fillStyle = '#7a9ae0'; g.beginPath(); g.moveTo(1, 7); g.lineTo(8, 1); g.lineTo(15, 7); g.fill(); for (let x = 3; x < 14; x += 3) R(x, 8, 1, 7, '#b8c0d8'); break;
      case 'darkcastle': R(0, 0, 16, 16, '#3a1a4a'); R(2, 5, 12, 10, '#2a2a3a'); R(1, 1, 4, 7, '#1a1a2a'); R(11, 1, 4, 7, '#1a1a2a'); R(6, 2, 4, 5, '#1a1a2a'); R(3, 2, 2, 2, '#ff3a3a'); R(12, 2, 2, 2, '#ff3a3a'); R(6, 10, 4, 5, '#ff5a2a'); break;
      default: R(0, 0, 16, 16, '#f0f'); break;
    }
    return c;
  });
}
export const tile = tileCanvas;

// ---------------------------------------------------------------- people (16x16, 4 directions, 2 walking frames)
export const LOOKS = {
  hero:    { skin: '#f6d0a8', hair: '#3a8a3a', cloth: '#3a6ad8', cloth2: '#f0c040', style: 'spiky' },
  kaldor:  { skin: '#e8b890', hair: '#8a5a2a', cloth: '#a8b0c0', cloth2: '#3a5ad8', style: 'helmet' },
  pupu:    { slime: '#4a9aff' },
  rhea:    { skin: '#f6d0a8', hair: '#e85a3a', cloth: '#f0f0f0', cloth2: '#d83a6a', style: 'princess' },
  barlow:  { skin: '#e8c8a8', hair: '#f0f0f0', cloth: '#5a4ab8', cloth2: '#f0c040', style: 'wizard' },
  cass:    { skin: '#f0c8a0', hair: '#4a3a2a', cloth: '#3aa06a', cloth2: '#f0f0f0', style: 'priest' },
  tolle:   { skin: '#f0c090', hair: '#5a3a1a', cloth: '#d8783a', cloth2: '#3a8a3a', style: 'merchant' },
  mira:    { skin: '#e8b080', hair: '#5a2a8a', cloth: '#ff7ab0', cloth2: '#ffd040', style: 'dancer' },
  thea:    { skin: '#e8b080', hair: '#2a2a5a', cloth: '#5a3aa8', cloth2: '#c8c8ff', style: 'veil' },
  orin:    { skin: '#c88a5a', hair: '#2a2a2a', cloth: '#d8a03a', cloth2: '#8a3a2a', style: 'bald' },
  king:    { skin: '#f0c8a0', hair: '#f0f0f0', cloth: '#b82a3a', cloth2: '#ffd040', style: 'king' },
  queen:   { skin: '#f6d0a8', hair: '#f0d070', cloth: '#a83ab8', cloth2: '#ffd040', style: 'princess' },
  guard:   { skin: '#e8b890', hair: '#5a3a1a', cloth: '#8a96a8', cloth2: '#d83a3a', style: 'helmet' },
  man:     { skin: '#f0c090', hair: '#6a4a2a', cloth: '#5a8a3a', cloth2: '#8a6a3a', style: 'short' },
  woman:   { skin: '#f6d0a8', hair: '#a8582a', cloth: '#d86a8a', cloth2: '#f0f0f0', style: 'long' },
  oldman:  { skin: '#e8c0a0', hair: '#e0e0e0', cloth: '#8a7a6a', cloth2: '#5a4a3a', style: 'beard' },
  child:   { skin: '#f6d0a8', hair: '#d8a040', cloth: '#3aa0d8', cloth2: '#f0f0f0', style: 'short', small: true },
  merchant:{ skin: '#f0c090', hair: '#2a2a2a', cloth: '#f0f0f0', cloth2: '#3a8a3a', style: 'apron' },
  nun:     { skin: '#f6d0a8', hair: '#2a2a3a', cloth: '#2a2a3a', cloth2: '#f0f0f0', style: 'nun' },
  priestn: { skin: '#f0c8a0', hair: '#7a5a3a', cloth: '#f0f0f0', cloth2: '#d8b040', style: 'priest' },
  soldier: { skin: '#e8b890', hair: '#3a2a1a', cloth: '#7a5a3a', cloth2: '#a8a8a8', style: 'helmet' },
  sage:    { skin: '#f0d0b0', hair: '#f0f0f0', cloth: '#e8e8f8', cloth2: '#7a9ae0', style: 'wizard' },
  dancerw: { skin: '#e8b080', hair: '#2a1a1a', cloth: '#ffb040', cloth2: '#d83a3a', style: 'dancer' },
  villain: { skin: '#b8a0c8', hair: '#2a1a3a', cloth: '#3a1a4a', cloth2: '#ff3a3a', style: 'wizard' },
};
export function person(look, dir, frame) {
  return memo(`p:${look}:${dir}:${frame}`, () => {
    const L = LOOKS[look] || LOOKS.man, c = mk(16, 16), g = c.getContext('2d');
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    if (L.slime) {          // a friendly slime
      const bob = frame ? 1 : 0; g.fillStyle = '#1a1a3a'; g.beginPath(); g.ellipse(8, 11 + bob / 2, 7, 5 - bob / 2, 0, 0, 7); g.fill();
      g.fillStyle = L.slime; g.beginPath(); g.moveTo(8, 2 + bob); g.quadraticCurveTo(15, 9, 14, 13); g.lineTo(2, 13); g.quadraticCurveTo(1, 9, 8, 2 + bob); g.fill();
      R(4, 7 + bob, 2, 2, '#fff'); R(10, 7 + bob, 2, 2, '#fff'); if (dir !== 'up') { R(5, 8 + bob, 1, 1, '#000'); R(10, 8 + bob, 1, 1, '#000'); R(6, 11, 4, 1, '#c03a5a'); } R(5, 4 + bob, 2, 1, '#bfe0ff');
      return c;
    }
    const sm = L.small ? 1 : 0, out = '#1a1424';
    const step = frame ? 1 : -1;
    // legs
    const ly = 12;
    if (dir === 'left' || dir === 'right') { R(6 + step, ly, 2, 3, L.cloth2); R(8 - step, ly, 2, 3, shade(L.cloth2, -0.25)); }
    else { R(5, ly, 2, 3 - (frame ? 1 : 0), L.cloth2); R(9, ly, 2, 3 - (frame ? 0 : 1), L.cloth2); }
    R(5, 15, 2, 1, '#3a2a1a'); R(9, 15, 2, 1, '#3a2a1a');
    // body (robes reach the ground)
    const robe = L.robe || ['wizard', 'priest', 'nun', 'veil', 'king', 'princess'].includes(L.style);
    R(4, 8, 8, robe ? 7 : 5, L.cloth); R(4, 8, 1, robe ? 7 : 5, shade(L.cloth, -0.25)); R(11, 8, 1, robe ? 7 : 5, shade(L.cloth, -0.25));
    if (L.style === 'apron') R(5, 9, 6, 5, '#f8f8f8');
    else R(4, 11, 8, 1, L.cloth2);
    // arms
    const arm = dir === 'left' || dir === 'right' ? 0 : step;
    R(3, 9 + (arm > 0 ? 1 : 0), 1, 3, L.skin); R(12, 9 + (arm < 0 ? 1 : 0), 1, 3, L.skin);
    // head
    const hy = 1 + sm;
    R(4, hy + 1, 8, 6, L.skin); R(5, hy, 6, 8, L.skin);
    const hairTop = () => { R(4, hy, 8, 3, L.hair); R(5, hy - 1, 6, 1, L.hair); };
    const face = () => {
      if (dir === 'up') { R(4, hy, 8, 6, L.hair); return; }
      if (dir === 'down') { R(6, hy + 4, 1, 2, out); R(9, hy + 4, 1, 2, out); R(7, hy + 6, 2, 1, '#d87070'); }
      else { const ex = dir === 'left' ? 5 : 10; R(ex, hy + 4, 1, 2, out); R(dir === 'left' ? 4 : 11, hy + 3, 1, 4, L.hair); }
    };
    switch (L.style) {
      case 'spiky': hairTop(); R(3, hy - 1, 2, 2, L.hair); R(11, hy - 1, 2, 2, L.hair); R(7, hy - 2, 2, 2, L.hair); R(4, hy + 3, 1, 3, L.hair); R(11, hy + 3, 1, 3, L.hair); face(); break;
      case 'helmet': face(); R(4, hy - 1, 8, 4, L.cloth); R(4, hy - 1, 8, 1, shade(L.cloth, 0.3)); R(7, hy - 2, 2, 1, L.cloth2); if (dir === 'up') R(4, hy, 8, 6, L.cloth); break;
      case 'princess': hairTop(); R(3, hy + 2, 2, 8, L.hair); R(11, hy + 2, 2, 8, L.hair); R(6, hy - 1, 4, 1, '#ffd040'); R(7, hy - 2, 2, 1, '#ffd040'); face(); break;
      case 'wizard': face(); R(3, hy + 1, 10, 2, L.cloth); R(5, hy - 2, 6, 3, L.cloth); R(7, hy - 4, 3, 2, L.cloth); if (L.nobeard) { R(3, hy + 3, 2, 6, L.hair); R(11, hy + 3, 2, 6, L.hair); } else if (dir !== 'up') { R(5, hy + 6, 6, 3, L.hair); R(6, hy + 9, 4, 1, L.hair); } break;
      case 'priest': hairTop(); R(5, hy - 2, 6, 3, L.cloth); R(7, hy - 3, 2, 1, L.cloth2); face(); break;
      case 'merchant': face(); R(4, hy - 1, 8, 3, '#f0e0c0'); R(5, hy - 2, 6, 1, '#f0e0c0'); R(7, hy - 1, 2, 2, '#d83a3a'); if (dir !== 'up') R(6, hy + 6, 4, 1, L.hair); break;
      case 'dancer': hairTop(); R(10, hy - 2, 4, 3, L.hair); R(12, hy + 1, 2, 5, L.hair); R(5, hy, 2, 1, '#ffd040'); face(); break;
      case 'veil': face(); R(4, hy - 1, 8, 4, L.cloth2); R(3, hy + 2, 2, 7, L.cloth2); R(11, hy + 2, 2, 7, L.cloth2); R(7, hy, 2, 1, '#ffd040'); break;
      case 'bald': R(4, hy, 8, 2, L.skin); R(4, hy + 1, 8, 1, '#d83a3a'); face(); break;
      case 'king': hairTop(); R(4, hy - 2, 8, 2, '#ffd040'); R(4, hy - 3, 1, 1, '#ffd040'); R(7, hy - 3, 2, 1, '#ffd040'); R(11, hy - 3, 1, 1, '#ffd040'); face(); if (dir !== 'up') { R(5, hy + 6, 6, 2, L.hair); } break;
      case 'beard': hairTop(); face(); if (dir !== 'up') R(5, hy + 6, 6, 3, L.hair); break;
      case 'nun': face(); R(4, hy - 1, 8, 3, L.cloth); R(3, hy + 1, 2, 8, L.cloth); R(11, hy + 1, 2, 8, L.cloth); R(5, hy + 1, 6, 1, '#f0f0f0'); break;
      case 'long': hairTop(); R(3, hy + 2, 2, 7, L.hair); R(11, hy + 2, 2, 7, L.hair); face(); break;
      case 'apron': hairTop(); face(); break;
      default: hairTop(); face(); break;
    }
    // small accessories
    const front = dir !== 'up';
    switch (L.extra) {
      case 'goggles': R(4, hy + 1, 8, 1, '#c8a040'); if (front) { R(5, hy + 1, 2, 1, '#8ad8ff'); R(9, hy + 1, 2, 1, '#8ad8ff'); } break;
      case 'cap': R(4, hy - 1, 8, 2, L.cloth2); if (dir === 'down') R(4, hy + 1, 8, 1, shade(L.cloth2, -0.3)); else if (dir === 'left') R(2, hy + 1, 4, 1, L.cloth2); else if (dir === 'right') R(10, hy + 1, 4, 1, L.cloth2); break;
      case 'eyepatch': if (front) R(dir === 'right' ? 10 : dir === 'left' ? 5 : 5, hy + 3, 2, 3, '#101010'); R(4, hy + 2, 8, 1, '#101010'); break;
      case 'feather': R(11, hy - 3, 1, 3, '#ff5a5a'); R(12, hy - 4, 1, 2, '#ffd040'); break;
      case 'ribbon': R(10, hy - 1, 3, 2, L.cloth2); R(13, hy, 1, 2, L.cloth2); break;
      case 'mask': if (front) R(4, hy + 5, 8, 3, L.cloth2); break;
      case 'scar': if (dir === 'down') R(9, hy + 3, 1, 3, '#b05050'); break;
      default: break;
    }
    // outline
    const img = g.getImageData(0, 0, 16, 16), d = img.data, o = new Uint8ClampedArray(d);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const i = (y * 16 + x) * 4; if (d[i + 3]) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && X < 16 && Y >= 0 && Y < 16 && d[(Y * 16 + X) * 4 + 3]; });
      if (near) { o[i] = 26; o[i + 1] = 20; o[i + 2] = 36; o[i + 3] = 255; }
    }
    g.putImageData(new ImageData(o, 16, 16), 0, 0);
    return c;
  });
}
// the wagon that carries the rest of the party in chapter 5
export function wagon(dir, frame) {
  return memo(`wagon:${dir}:${frame}`, () => {
    const c = mk(16, 16), g = c.getContext('2d'), R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    R(1, 3, 14, 8, '#f0e8d0'); R(1, 3, 14, 2, '#d8d0b8'); R(1, 10, 14, 2, '#8a5a30');
    for (const x of [3, 11]) { R(x - 1, 11, 4, 4, '#3a2a1a'); R(x, 12 + (frame ? 0 : 1), 2, 1, '#a8784a'); }
    R(0, 2, 16, 1, '#1a1424'); R(0, 2, 1, 10, '#1a1424'); R(15, 2, 1, 10, '#1a1424');
    return c;
  });
}

// ---------------------------------------------------------------- monsters: outlined, shaded, big friendly eyes
const OUT = '#1c1428';
function body(g, path, fill, light, x, y, r) {
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r * 1.2);
  gr.addColorStop(0, light); gr.addColorStop(0.55, fill); gr.addColorStop(1, shade(fill, -0.35));
  g.fillStyle = gr; g.beginPath(); path(); g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
}
function eye(g, x, y, r, look = 0, angry = false) {
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y, r, r * 1.15, 0, 0, 7); g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
  g.fillStyle = OUT; g.beginPath(); g.ellipse(x + look, y + r * 0.15, r * 0.5, r * 0.62, 0, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(x + look - r * 0.2, y - r * 0.15, r * 0.2, 0, 7); g.fill();
  if (angry) { g.lineWidth = 3; g.beginPath(); g.moveTo(x - r * 1.2, y - r * 1.5); g.lineTo(x + r, y - r * 0.9); g.stroke(); }
}
function mouth(g, x, y, w, open = 0, fang = false) {
  g.lineWidth = 2.5; g.strokeStyle = OUT; g.fillStyle = '#8a2a3a';
  g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x, y + w * 0.8 + open, x + w, y); if (open) { g.closePath(); g.fill(); } g.stroke();
  if (fang) { g.fillStyle = '#fff'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * w * 0.55 - 3, y + 1); g.lineTo(x + s * w * 0.55, y + 8); g.lineTo(x + s * w * 0.55 + 3, y + 1); g.fill(); g.stroke(); } }
}
const DRAW = {
  slime(g, [c1, c2]) {
    body(g, () => { g.moveTo(48, 14); g.bezierCurveTo(56, 30, 84, 46, 82, 70); g.quadraticCurveTo(80, 86, 48, 86); g.quadraticCurveTo(16, 86, 14, 70); g.bezierCurveTo(12, 46, 40, 30, 48, 14); }, c1, c2, 48, 62, 38);
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(32, 46, 6, 10, -0.5, 0, 7); g.fill();
    eye(g, 37, 60, 7); eye(g, 59, 60, 7); mouth(g, 48, 72, 11, 7);
  },
  bat(g, [c1, c2]) {
    for (const s of [-1, 1]) body(g, () => { g.moveTo(48 + s * 14, 46); g.quadraticCurveTo(48 + s * 40, 20, 48 + s * 46, 40); g.quadraticCurveTo(48 + s * 38, 44, 48 + s * 40, 56); g.quadraticCurveTo(48 + s * 30, 52, 48 + s * 30, 62); g.quadraticCurveTo(48 + s * 22, 56, 48 + s * 14, 60); g.closePath(); }, shade(c1, -0.15), c2, 48 + s * 30, 44, 22);
    body(g, () => { g.ellipse(48, 52, 18, 17, 0, 0, 7); }, c1, c2, 48, 52, 18);
    for (const s of [-1, 1]) { g.fillStyle = c1; g.beginPath(); g.moveTo(48 + s * 6, 38); g.lineTo(48 + s * 14, 24); g.lineTo(48 + s * 16, 42); g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke(); }
    eye(g, 41, 50, 5); eye(g, 55, 50, 5); mouth(g, 48, 60, 7, 4, true);
  },
  rabbit(g, [c1, c2]) {
    for (const s of [-1, 1]) body(g, () => { g.ellipse(48 + s * 12, 26, 6, 18, s * 0.2, 0, 7); }, c1, '#fff', 48 + s * 12, 26, 14);
    g.fillStyle = '#f0e050'; g.beginPath(); g.moveTo(44, 36); g.lineTo(48, 12); g.lineTo(52, 36); g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
    body(g, () => { g.ellipse(48, 60, 26, 24, 0, 0, 7); }, c1, '#fff', 48, 60, 26);
    eye(g, 39, 56, 6, 0, true); eye(g, 57, 56, 6, 0, true); g.fillStyle = c2; g.beginPath(); g.arc(48, 66, 3, 0, 7); g.fill(); mouth(g, 48, 70, 6);
  },
  shroom(g, [c1, c2]) {
    body(g, () => { g.moveTo(34, 52); g.lineTo(32, 84); g.quadraticCurveTo(48, 90, 64, 84); g.lineTo(62, 52); g.closePath(); }, c2, '#fff', 48, 70, 20);
    body(g, () => { g.moveTo(12, 56); g.bezierCurveTo(10, 18, 86, 18, 84, 56); g.quadraticCurveTo(48, 64, 12, 56); }, c1, shade(c1, 0.5), 48, 40, 36);
    g.fillStyle = '#fff'; for (const [x, y, r] of [[30, 36, 6], [50, 28, 7], [68, 40, 5], [42, 48, 4]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    eye(g, 41, 68, 4.5); eye(g, 55, 68, 4.5); mouth(g, 48, 77, 5);
  },
  ghost(g, [c1, c2]) {
    body(g, () => { g.moveTo(48, 12); g.bezierCurveTo(82, 12, 80, 50, 80, 64); g.quadraticCurveTo(74, 88, 64, 76); g.quadraticCurveTo(56, 90, 48, 78); g.quadraticCurveTo(40, 90, 32, 76); g.quadraticCurveTo(22, 88, 16, 64); g.bezierCurveTo(16, 50, 14, 12, 48, 12); }, c1, c2, 44, 40, 38);
    g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(34, 30, 6, 10, -0.4, 0, 7); g.fill();
    eye(g, 38, 44, 7, 1); eye(g, 60, 44, 7, 1); mouth(g, 49, 58, 9, 8);
    for (const s of [-1, 1]) { g.fillStyle = c1; g.beginPath(); g.ellipse(48 + s * 36, 52, 6, 10, s * 0.6, 0, 7); g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke(); }
  },
  skeleton(g, [c1, c2]) {
    const R = (x, y, w, h) => { g.fillStyle = c1; g.fillRect(x, y, w, h); g.lineWidth = 2.5; g.strokeStyle = OUT; g.strokeRect(x, y, w, h); };
    R(44, 46, 8, 22); for (let i = 0; i < 3; i++) R(34, 50 + i * 6, 28, 3);
    R(36, 68, 6, 18); R(54, 68, 6, 18); R(28, 50, 5, 20); R(63, 50, 5, 20);
    g.fillStyle = '#8a8a9a'; g.fillRect(70, 30, 4, 40); g.strokeRect(70, 30, 4, 40); g.fillStyle = '#c0c0d0'; g.beginPath(); g.moveTo(66, 30); g.lineTo(72, 14); g.lineTo(78, 30); g.fill(); g.stroke();
    body(g, () => { g.ellipse(48, 30, 17, 16, 0, 0, 7); }, c1, '#fff', 48, 30, 17);
    g.fillStyle = OUT; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(48 + s * 7, 29, 5, 6, 0, 0, 7); g.fill(); }
    g.fillStyle = '#ff5a3a'; for (const s of [-1, 1]) { g.beginPath(); g.arc(48 + s * 7, 30, 2, 0, 7); g.fill(); }
    g.fillStyle = OUT; for (let i = -2; i <= 2; i++) g.fillRect(46 + i * 4, 40, 2, 4);
    g.fillStyle = c2; g.fillRect(30, 42, 36, 4);
  },
  imp(g, [c1, c2]) {
    for (const s of [-1, 1]) body(g, () => { g.moveTo(48 + s * 12, 50); g.quadraticCurveTo(48 + s * 40, 28, 48 + s * 38, 50); g.quadraticCurveTo(48 + s * 30, 50, 48 + s * 26, 60); g.closePath(); }, shade(c1, -0.2), c2, 48 + s * 28, 48, 16);
    body(g, () => { g.ellipse(48, 64, 18, 18, 0, 0, 7); }, c1, c2, 48, 64, 18);
    body(g, () => { g.ellipse(48, 38, 20, 18, 0, 0, 7); }, c1, c2, 48, 38, 20);
    for (const s of [-1, 1]) { g.fillStyle = '#f0e0c0'; g.beginPath(); g.moveTo(48 + s * 10, 24); g.lineTo(48 + s * 18, 8); g.lineTo(48 + s * 20, 28); g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke(); }
    eye(g, 41, 37, 5.5, 0, true); eye(g, 55, 37, 5.5, 0, true); mouth(g, 48, 47, 8, 5, true);
    g.strokeStyle = '#c0a040'; g.lineWidth = 3; g.beginPath(); g.moveTo(70, 80); g.lineTo(76, 40); g.stroke(); g.fillStyle = '#c0a040'; g.beginPath(); g.moveTo(70, 40); g.lineTo(76, 30); g.lineTo(82, 40); g.fill();
  },
  wolf(g, [c1, c2]) {
    body(g, () => { g.ellipse(52, 64, 30, 16, 0, 0, 7); }, c1, c2, 52, 64, 30);
    for (const x of [30, 42, 62, 74]) body(g, () => { g.rect(x - 4, 70, 8, 16); }, shade(c1, -0.1), c2, x, 78, 8);
    body(g, () => { g.moveTo(82, 58); g.quadraticCurveTo(94, 40, 90, 30); g.quadraticCurveTo(86, 50, 76, 58); g.closePath(); }, c1, c2, 86, 46, 12);
    body(g, () => { g.moveTo(14, 46); g.quadraticCurveTo(14, 26, 34, 26); g.quadraticCurveTo(48, 26, 50, 44); g.quadraticCurveTo(46, 60, 30, 58); g.quadraticCurveTo(14, 58, 8, 52); g.closePath(); }, c1, c2, 32, 42, 20);
    for (const x of [24, 40]) { g.fillStyle = c1; g.beginPath(); g.moveTo(x - 6, 30); g.lineTo(x, 12); g.lineTo(x + 6, 30); g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke(); }
    eye(g, 26, 38, 4.5, -1, true); eye(g, 40, 38, 4.5, -1, true); g.fillStyle = OUT; g.beginPath(); g.arc(10, 50, 3, 0, 7); g.fill(); mouth(g, 20, 54, 7, 3, true);
  },
  bird(g, [c1, c2]) {
    for (const s of [-1, 1]) body(g, () => { g.moveTo(48 + s * 10, 50); g.quadraticCurveTo(48 + s * 46, 20, 48 + s * 44, 52); g.quadraticCurveTo(48 + s * 30, 56, 48 + s * 14, 62); g.closePath(); }, shade(c1, -0.1), c2, 48 + s * 30, 44, 22);
    body(g, () => { g.ellipse(48, 60, 18, 22, 0, 0, 7); }, c1, c2, 48, 60, 18);
    body(g, () => { g.ellipse(48, 34, 15, 14, 0, 0, 7); }, c2, '#fff', 48, 34, 15);
    g.fillStyle = '#f0b030'; g.beginPath(); g.moveTo(42, 38); g.lineTo(48, 50); g.lineTo(54, 38); g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
    eye(g, 42, 31, 4.5, 0, true); eye(g, 54, 31, 4.5, 0, true);
    for (const s of [-1, 1]) { g.strokeStyle = '#f0b030'; g.lineWidth = 3; g.beginPath(); g.moveTo(48 + s * 6, 80); g.lineTo(48 + s * 8, 90); g.stroke(); }
  },
  mage(g, [c1, c2]) {
    body(g, () => { g.moveTo(48, 30); g.lineTo(76, 88); g.lineTo(20, 88); g.closePath(); }, c1, shade(c1, 0.4), 48, 60, 34);
    g.fillStyle = c2; g.fillRect(24, 80, 48, 4);
    body(g, () => { g.ellipse(48, 36, 13, 13, 0, 0, 7); }, '#2a2030', '#5a4a6a', 48, 36, 13);
    g.fillStyle = c2; for (const s of [-1, 1]) { g.beginPath(); g.arc(48 + s * 5, 36, 2.6, 0, 7); g.fill(); }
    body(g, () => { g.moveTo(30, 30); g.quadraticCurveTo(48, 20, 66, 30); g.lineTo(52, 2); g.quadraticCurveTo(46, 0, 30, 30); }, c1, shade(c1, 0.4), 48, 18, 18);
    g.strokeStyle = '#8a5a2a'; g.lineWidth = 4; g.beginPath(); g.moveTo(18, 88); g.lineTo(22, 34); g.stroke();
    const gl = g.createRadialGradient(22, 30, 1, 22, 30, 9); gl.addColorStop(0, '#fff'); gl.addColorStop(1, c2); g.fillStyle = gl; g.beginPath(); g.arc(22, 30, 7, 0, 7); g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
  },
  plant(g, [c1, c2]) {
    for (const a of [-1.2, -0.6, 0.6, 1.2]) body(g, () => { g.ellipse(48 + Math.sin(a) * 26, 64 + Math.cos(a) * 6, 16, 6, a, 0, 7); }, c1, '#a8f080', 48, 64, 18);
    body(g, () => { g.moveTo(40, 80); g.quadraticCurveTo(38, 54, 48, 44); g.quadraticCurveTo(58, 54, 56, 80); g.closePath(); }, '#3a8a3a', '#8ad070', 48, 62, 14);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; body(g, () => { g.ellipse(48 + Math.cos(a) * 15, 34 + Math.sin(a) * 15, 10, 8, a, 0, 7); }, c2, '#fff', 48 + Math.cos(a) * 15, 34 + Math.sin(a) * 15, 10); }
    body(g, () => { g.arc(48, 34, 13, 0, 7); }, '#f0d040', '#fff8c0', 48, 34, 13);
    eye(g, 43, 32, 3.5); eye(g, 53, 32, 3.5); mouth(g, 48, 39, 5, 3, true);
  },
  knight(g, [c1, c2]) {
    body(g, () => { g.moveTo(26, 46); g.lineTo(70, 46); g.lineTo(66, 82); g.lineTo(30, 82); g.closePath(); }, c1, shade(c1, 0.5), 48, 60, 26);
    for (const x of [36, 60]) body(g, () => { g.rect(x - 6, 80, 12, 10); }, shade(c1, -0.2), c1, x, 84, 8);
    body(g, () => { g.moveTo(10, 50); g.lineTo(30, 46); g.lineTo(30, 74); g.quadraticCurveTo(18, 80, 10, 70); g.closePath(); }, c2, shade(c2, 0.4), 20, 60, 14);
    g.strokeStyle = '#d8d8e8'; g.lineWidth = 4; g.beginPath(); g.moveTo(74, 80); g.lineTo(84, 22); g.stroke(); g.lineWidth = 2; g.strokeStyle = OUT; g.beginPath(); g.moveTo(70, 70); g.lineTo(80, 72); g.stroke();
    body(g, () => { g.moveTo(32, 46); g.lineTo(32, 24); g.quadraticCurveTo(48, 6, 64, 24); g.lineTo(64, 46); g.closePath(); }, c1, shade(c1, 0.5), 48, 30, 18);
    g.fillStyle = OUT; g.fillRect(36, 30, 24, 5); g.fillStyle = '#ff5a3a'; g.fillRect(40, 31, 4, 3); g.fillRect(52, 31, 4, 3);
    g.fillStyle = c2; g.beginPath(); g.moveTo(46, 10); g.quadraticCurveTo(60, 2, 66, 16); g.quadraticCurveTo(58, 10, 50, 16); g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
  },
  snake(g, [c1, c2]) {
    body(g, () => { g.moveTo(14, 82); g.bezierCurveTo(10, 60, 80, 78, 72, 56); g.bezierCurveTo(64, 40, 30, 52, 40, 30); g.lineTo(54, 34); g.bezierCurveTo(48, 44, 82, 40, 84, 60); g.bezierCurveTo(86, 86, 30, 72, 30, 84); g.closePath(); }, c1, c2, 50, 60, 36);
    g.strokeStyle = c2; g.lineWidth = 3; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(58 + i * 4, 66 - i * 3, 4, 0, 3); g.stroke(); }
    body(g, () => { g.ellipse(46, 26, 18, 13, -0.3, 0, 7); }, c1, c2, 46, 26, 18);
    eye(g, 40, 22, 4.5, 0, true); eye(g, 54, 19, 4.5, 0, true);
    g.strokeStyle = '#e03a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(32, 34); g.lineTo(24, 40); g.lineTo(20, 38); g.moveTo(24, 40); g.lineTo(22, 44); g.stroke();
  },
  beast(g, [c1, c2]) {
    body(g, () => { g.ellipse(48, 62, 28, 26, 0, 0, 7); }, c1, shade(c1, 0.4), 48, 62, 28);
    for (const s of [-1, 1]) body(g, () => { g.ellipse(48 + s * 30, 60, 9, 18, s * 0.3, 0, 7); }, c1, shade(c1, 0.4), 48 + s * 30, 60, 12);
    for (const s of [-1, 1]) { g.fillStyle = '#f0f0f0'; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(48 + s * (30 + k * 3) - 2, 74); g.lineTo(48 + s * (32 + k * 3), 84); g.lineTo(48 + s * (30 + k * 3) + 2, 74); g.fill(); } }
    body(g, () => { g.ellipse(48, 34, 22, 18, 0, 0, 7); }, c1, shade(c1, 0.4), 48, 34, 22);
    for (const s of [-1, 1]) { g.fillStyle = '#f0e0c0'; g.beginPath(); g.moveTo(48 + s * 14, 22); g.quadraticCurveTo(48 + s * 30, 8, 48 + s * 26, 2); g.quadraticCurveTo(48 + s * 22, 14, 48 + s * 8, 18); g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke(); }
    eye(g, 40, 32, 5, 0, true); eye(g, 56, 32, 5, 0, true); g.fillStyle = c2; g.fillRect(40, 30, 16, 0);
    mouth(g, 48, 42, 10, 6, true);
  },
  scorpion(g, [c1, c2]) {
    body(g, () => { g.moveTo(60, 62); g.bezierCurveTo(90, 60, 90, 20, 66, 18); g.lineTo(62, 26); g.bezierCurveTo(78, 28, 78, 52, 56, 56); g.closePath(); }, c1, shade(c1, 0.4), 72, 40, 22);
    g.fillStyle = c2; g.beginPath(); g.moveTo(62, 14); g.lineTo(54, 22); g.lineTo(66, 24); g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { g.strokeStyle = OUT; g.lineWidth = 3; g.beginPath(); g.moveTo(42 + i * 8, 70); g.lineTo(42 + i * 8 + s * 6, 84); g.stroke(); }
    body(g, () => { g.ellipse(46, 66, 24, 13, 0, 0, 7); }, c1, shade(c1, 0.4), 46, 66, 24);
    for (const s of [-1, 1]) body(g, () => { g.moveTo(30, 62 + s * 4); g.quadraticCurveTo(14, 60 + s * 12, 10, 46 + s * 4); g.lineTo(18, 48 + s * 2); g.quadraticCurveTo(20, 56, 30, 58); g.closePath(); }, c1, shade(c1, 0.4), 18, 54, 12);
    eye(g, 38, 60, 4, -1, true); eye(g, 50, 60, 4, -1, true);
  },
  golem(g, [c1, c2]) {
    const block = (x, y, w, h) => body(g, () => { g.roundRect(x, y, w, h, 5); }, c1, shade(c1, 0.35), x + w / 2, y + h / 2, Math.max(w, h) / 2);
    block(26, 40, 44, 32); block(10, 40, 16, 34); block(70, 40, 16, 34); block(28, 72, 16, 16); block(52, 72, 16, 16); block(34, 14, 28, 26);
    g.fillStyle = OUT; g.fillRect(38, 24, 20, 6); g.fillStyle = c2; g.fillRect(41, 25, 5, 4); g.fillRect(50, 25, 5, 4);
    g.strokeStyle = shade(c1, -0.4); g.lineWidth = 2; g.beginPath(); g.moveTo(36, 48); g.lineTo(44, 56); g.lineTo(40, 64); g.moveTo(60, 46); g.lineTo(56, 54); g.stroke();
    g.fillStyle = c2; g.beginPath(); g.arc(48, 56, 5, 0, 7); g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
  },
  dragon(g, [c1, c2]) {
    for (const s of [-1, 1]) body(g, () => { g.moveTo(48 + s * 12, 46); g.quadraticCurveTo(48 + s * 44, 10, 48 + s * 46, 40); g.lineTo(48 + s * 36, 38); g.lineTo(48 + s * 34, 50); g.lineTo(48 + s * 24, 48); g.closePath(); }, shade(c1, -0.15), c2, 48 + s * 30, 34, 20);
    body(g, () => { g.ellipse(48, 66, 24, 20, 0, 0, 7); }, c1, shade(c1, 0.4), 48, 66, 24);
    body(g, () => { g.ellipse(48, 70, 13, 14, 0, 0, 7); }, c2, '#fff', 48, 70, 13);
    body(g, () => { g.moveTo(38, 52); g.quadraticCurveTo(36, 30, 48, 22); g.quadraticCurveTo(60, 30, 58, 52); g.closePath(); }, c1, shade(c1, 0.4), 48, 38, 16);
    body(g, () => { g.ellipse(48, 22, 15, 12, 0, 0, 7); }, c1, shade(c1, 0.4), 48, 22, 15);
    for (const s of [-1, 1]) { g.fillStyle = '#f0e0c0'; g.beginPath(); g.moveTo(48 + s * 8, 14); g.lineTo(48 + s * 14, 2); g.lineTo(48 + s * 14, 14); g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke(); }
    eye(g, 42, 20, 4, 0, true); eye(g, 54, 20, 4, 0, true); mouth(g, 48, 28, 7, 3, true);
    for (const s of [-1, 1]) { g.fillStyle = '#f0f0f0'; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(48 + s * 18 + k * 3 * s, 84); g.lineTo(48 + s * 20 + k * 3 * s, 90); g.lineTo(48 + s * 22 + k * 3 * s, 84); g.fill(); } }
  },
  // Eightfold Saga's sea creatures, stinging insects and elemental spirits, in the same style
  fish(g, [c1, c2]) {
    body(g, () => { g.moveTo(80, 40); g.lineTo(92, 26); g.lineTo(90, 72); g.lineTo(80, 58); g.closePath(); }, shade(c1, -0.15), c2, 86, 50, 16);
    body(g, () => { g.ellipse(48, 52, 36, 26, 0, 0, 7); }, c1, c2, 44, 50, 34);
    body(g, () => { g.moveTo(40, 28); g.quadraticCurveTo(52, 8, 62, 30); g.closePath(); }, shade(c1, -0.15), c2, 52, 24, 12);
    g.fillStyle = shade(c2, 0.4); g.beginPath(); g.ellipse(46, 66, 22, 8, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; for (const x of [52, 62, 70]) { g.beginPath(); g.arc(x, 52, 10, -1, 1); g.stroke(); }
    eye(g, 28, 46, 8, -1); mouth(g, 22, 62, 7, 4);
    g.fillStyle = 'rgba(200,240,255,.8)'; for (const [x, y, r] of [[10, 24, 4], [18, 12, 3]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  },
  bee(g, [c1, c2]) {
    for (const s of [-1, 1]) { g.fillStyle = 'rgba(230,245,255,.85)'; g.beginPath(); g.ellipse(48 + s * 20, 30, 16, 22, s * 0.5, 0, 7); g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke(); }
    body(g, () => { g.ellipse(48, 58, 26, 28, 0, 0, 7); }, c1, c2, 48, 56, 28);
    g.fillStyle = shade(c1, -0.6); for (const y of [56, 70]) g.fillRect(24, y, 48, 6);
    g.fillStyle = OUT; g.beginPath(); g.moveTo(42, 84); g.lineTo(48, 96); g.lineTo(54, 84); g.fill();
    for (const s of [-1, 1]) { g.strokeStyle = OUT; g.lineWidth = 2.5; g.beginPath(); g.moveTo(48 + s * 6, 34); g.quadraticCurveTo(48 + s * 12, 14, 48 + s * 20, 12); g.stroke(); g.fillStyle = OUT; g.beginPath(); g.arc(48 + s * 20, 12, 3.5, 0, 7); g.fill(); }
    eye(g, 39, 44, 7); eye(g, 57, 44, 7); mouth(g, 48, 52, 6, 3);
  },
  wisp(g, [c1, c2]) {
    g.save(); g.globalAlpha = 0.35; g.fillStyle = c2; g.beginPath(); g.ellipse(48, 56, 40, 40, 0, 0, 7); g.fill(); g.restore();
    body(g, () => { g.moveTo(48, 6); g.quadraticCurveTo(58, 22, 70, 18); g.quadraticCurveTo(66, 32, 80, 40); g.bezierCurveTo(88, 70, 70, 90, 48, 90); g.bezierCurveTo(26, 90, 8, 70, 16, 40); g.quadraticCurveTo(30, 34, 28, 20); g.quadraticCurveTo(40, 26, 48, 6); }, c1, c2, 48, 58, 40);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(48, 66, 16, 14, 0, 0, 7); g.fill();
    eye(g, 38, 58, 7); eye(g, 58, 58, 7); mouth(g, 48, 72, 8, 5);
  },
  lord(g, [c1, c2]) {
    body(g, () => { g.moveTo(48, 26); g.lineTo(84, 90); g.lineTo(12, 90); g.closePath(); }, c1, shade(c1, 0.4), 48, 64, 40);
    for (const s of [-1, 1]) body(g, () => { g.moveTo(48 + s * 14, 34); g.lineTo(48 + s * 44, 26); g.lineTo(48 + s * 38, 50); g.closePath(); }, '#7a1a2a', '#ff5a5a', 48 + s * 34, 34, 16);
    g.fillStyle = c2; g.fillRect(28, 82, 40, 4); g.fillRect(44, 40, 8, 40);
    body(g, () => { g.ellipse(48, 28, 13, 14, 0, 0, 7); }, '#b8a0d8', '#f0e0ff', 48, 28, 14);
    for (const s of [-1, 1]) { g.fillStyle = '#e0e0f0'; g.beginPath(); g.moveTo(48 + s * 8, 18); g.quadraticCurveTo(48 + s * 22, 6, 48 + s * 18, -2); g.quadraticCurveTo(48 + s * 14, 10, 48 + s * 4, 14); g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke(); }
    eye(g, 43, 28, 3.5, 0, true); eye(g, 53, 28, 3.5, 0, true);
    g.fillStyle = c2; g.beginPath(); g.moveTo(38, 16); g.lineTo(42, 8); g.lineTo(46, 14); g.lineTo(48, 4); g.lineTo(50, 14); g.lineTo(54, 8); g.lineTo(58, 16); g.closePath(); g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
  },
  demon(g, [c1, c2]) {
    for (const s of [-1, 1]) body(g, () => { g.moveTo(48 + s * 16, 44); g.quadraticCurveTo(48 + s * 50, 0, 48 + s * 48, 50); g.lineTo(48 + s * 38, 44); g.lineTo(48 + s * 34, 58); g.lineTo(48 + s * 26, 52); g.closePath(); }, shade(c1, -0.2), c2, 48 + s * 34, 34, 24);
    body(g, () => { g.ellipse(48, 64, 26, 24, 0, 0, 7); }, c1, shade(c1, 0.4), 48, 64, 26);
    for (const s of [-1, 1]) body(g, () => { g.ellipse(48 + s * 30, 66, 9, 18, s * 0.35, 0, 7); }, c1, shade(c1, 0.4), 48 + s * 30, 66, 12);
    g.fillStyle = c2; g.beginPath(); g.ellipse(48, 66, 10, 10, 0, 0, 7); g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
    body(g, () => { g.ellipse(48, 32, 19, 16, 0, 0, 7); }, c1, shade(c1, 0.4), 48, 32, 19);
    for (const s of [-1, 1]) { g.fillStyle = '#f0e0c0'; g.beginPath(); g.moveTo(48 + s * 12, 22); g.quadraticCurveTo(48 + s * 34, 16, 48 + s * 30, -2); g.quadraticCurveTo(48 + s * 26, 14, 48 + s * 6, 16); g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke(); }
    eye(g, 41, 30, 5, 0, true); eye(g, 55, 30, 5, 0, true); mouth(g, 48, 41, 11, 7, true);
  },
};
// a monster drawn at 96x96 (cached); flash = all-white silhouette for the hit blink
// sc: drawn sc times larger (the shapes are vectors), so big monsters stay sharp
export function monster(art, col, flash = false, sc = 1) {
  return memo(`m:${art}:${col.join()}:${flash}:${sc}`, () => {
    const c = mk(96 * sc, 96 * sc), g = c.getContext('2d'); g.scale(sc, sc);
    g.lineJoin = 'round'; g.lineCap = 'round';
    (DRAW[art] || DRAW.slime)(g, col);
    if (flash) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(0, 0, 96 * sc, 96 * sc); }
    return c;
  });
}
export const ARTS = Object.keys(DRAW);

// ---------------------------------------------------------------- battle backdrops
export function backdrop(kind, w, h) {
  return memo(`bg:${kind}:${w}:${h}`, () => {
    const c = mk(w, h), g = c.getContext('2d');
    const sky = { field: ['#3a7ae0', '#a8d0ff'], cave: ['#1a1410', '#3a2a1e'], tower: ['#2a2238', '#4a3a58'], castle: ['#2a2a3a', '#4a4a5a'], desert: ['#e08a3a', '#ffe0a0'], dark: ['#140a1e', '#3a1a4a'], shrine: ['#8ab0f0', '#e8f0ff'] }[kind] || ['#000', '#222'];
    const ground = { field: '#4a9a3a', cave: '#4a3a2a', tower: '#5a4a5a', castle: '#5a5a6a', desert: '#d8b06a', dark: '#2a1a3a', shrine: '#c8d0e8' }[kind] || '#333';
    let gr = g.createLinearGradient(0, 0, 0, h * 0.62); gr.addColorStop(0, sky[0]); gr.addColorStop(1, sky[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (kind === 'field' || kind === 'desert') { g.fillStyle = kind === 'field' ? '#6a8ac8' : '#c8784a'; g.beginPath(); g.moveTo(0, h * 0.62); for (let x = 0; x <= w; x += w / 8) g.lineTo(x, h * 0.5 + Math.sin(x * 0.02) * h * 0.06); g.lineTo(w, h * 0.62); g.fill(); }
    if (kind === 'cave' || kind === 'dark') { g.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 10; i++) { const x = (i / 10) * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w / 20, h * (0.12 + (i % 3) * 0.05)); g.lineTo(x + w / 10, 0); g.fill(); } }
    if (kind === 'castle' || kind === 'tower' || kind === 'shrine') { g.fillStyle = 'rgba(255,255,255,.08)'; for (let x = w * 0.08; x < w; x += w / 6) g.fillRect(x, h * 0.08, w * 0.05, h * 0.55); }
    gr = g.createLinearGradient(0, h * 0.62, 0, h); gr.addColorStop(0, ground); gr.addColorStop(1, shade(ground, -0.45)); g.fillStyle = gr; g.fillRect(0, h * 0.62, w, h * 0.38);
    return c;
  });
}
