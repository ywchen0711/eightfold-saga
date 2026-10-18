// True HD-2D: the dungeon, the battle stage, the towns and the title are little lit 3D dioramas drawn with WebGL under
// the 2D canvas. Pixel sprites stand in them as billboards that cast shadows; the picture gets tilt-shift depth of
// field, bloom, colour grading, a vignette and drifting particles. The 2D canvas keeps every sprite effect and word.
// Without WebGL (or switched off) the game keeps its painted 2D look.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { THEMES } from './art.js';
import { DIO, monsterSprite, mix } from './hd.js';
import { drawChibi } from './chibi.js';

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

// ---------------------------------------------------------------- textures drawn here
const canvases = new Map();
const once = (key, fn) => { let c = canvases.get(key); if (!c) { c = fn(); canvases.set(key, c); } return c; };
const OPEN_GROUND = ['forest', 'swamp', 'desert', 'sea', 'sky'];
// a floor tile: flagstones, or grass / sand / wet ground outdoors (4 variants side by side, 32px each)
function floorCanvas(theme) {
  return once('floor:' + theme, () => {
    const T = THEMES[theme] || THEMES.cave, c = mk(128, 32), g = c.getContext('2d');
    for (let v = 0; v < 4; v++) {
      const X = v * 32; R(g, X, 0, 32, 32, T.floor);
      if (!OPEN_GROUND.includes(theme)) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        R(g, X + i * 16 + 1, j * 16 + 1, 14, 14, mix(T.floor, (i + j + v) & 1 ? '#000000' : '#ffffff', 0.05 + hash(v * 9 + i, j) * 0.06));
        R(g, X + i * 16, j * 16 + 15, 16, 1, 'rgba(0,0,0,.28)'); R(g, X + i * 16 + 15, j * 16, 1, 16, 'rgba(0,0,0,.22)'); R(g, X + i * 16 + 1, j * 16 + 1, 14, 1, 'rgba(255,240,220,.08)');
      }
      for (let k = 0; k < 26; k++) R(g, X + Math.floor(hash(k, v) * 32), Math.floor(hash(v, k + 50) * 32), 1 + Math.floor(hash(k, 3) * 2), 1, hash(k, v + 7) > 0.5 ? 'rgba(255,240,220,.1)' : 'rgba(0,0,0,.16)');
      if (theme === 'forest' || theme === 'swamp') for (let k = 0; k < 9; k++) { const x = X + Math.floor(hash(k, v + 20) * 30), y = Math.floor(hash(v + 20, k) * 28); R(g, x, y, 1, 3, '#5a8a3a'); R(g, x + 1, y + 1, 1, 2, '#4a7a2e'); }
      if (theme === 'desert') for (let k = 0; k < 3; k++) R(g, X + Math.floor(hash(k, v + 9) * 24), Math.floor(hash(v + 9, k) * 30), 7, 1, mix(T.floor, '#ffffff', 0.15));
    }
    return c;
  });
}
function wallCanvas(theme) {
  return once('wall:' + theme, () => {
    const T = THEMES[theme] || THEMES.cave, c = mk(32, 32), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 32); gr.addColorStop(0, mix(T.wall, '#ffffff', 0.1)); gr.addColorStop(1, mix(T.wall, '#000000', 0.2)); g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    if (['cave', 'mine', 'volcano', 'ice', 'mountain', 'swamp', 'forest'].includes(theme)) {
      for (let i = 0; i < 7; i++) { const x = Math.floor(hash(i, 1) * 26), y = Math.floor(hash(1, i) * 26), w = 5 + Math.floor(hash(i, 2) * 8), h = 4 + Math.floor(hash(2, i) * 6);
        R(g, x, y, w, h, mix(T.wall, hash(i, 4) > 0.5 ? '#ffffff' : '#000000', 0.12)); R(g, x, y, w, 1, 'rgba(255,240,220,.14)'); R(g, x, y + h - 1, w, 1, 'rgba(0,0,0,.3)'); }
    } else for (let row = 0; row < 4; row++) { R(g, 0, row * 8, 32, 1, 'rgba(0,0,0,.3)'); R(g, 0, row * 8 + 1, 32, 1, 'rgba(255,240,220,.07)'); for (let k = (row % 2) * 8; k < 32; k += 16) R(g, k, row * 8, 1, 8, 'rgba(0,0,0,.3)'); }
    if (theme === 'forest' || theme === 'swamp' || theme === 'ruins' || theme === 'tomb') for (let m = 0; m < 4; m++) R(g, Math.floor(hash(m, 9) * 28), Math.floor(hash(9, m) * 8), 4, 2 + Math.floor(hash(m, 8) * 4), 'rgba(80,130,60,.5)');
    return c;
  });
}
function topCanvas(theme) {
  return once('top:' + theme, () => {
    const T = THEMES[theme] || THEMES.cave, c = mk(32, 32), g = c.getContext('2d');
    R(g, 0, 0, 32, 32, mix(T.wall, '#000000', 0.5));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { R(g, i * 11 + 1, j * 11 + 1, 9, 9, mix(mix(T.wall, T.top, 0.3), '#000000', 0.15 + hash(i, j) * 0.25)); R(g, i * 11 + 1, j * 11 + 1, 9, 1, 'rgba(255,240,210,.12)'); }
    return c;
  });
}
function cobbleCanvas(col) {
  return once('cobble:' + col, () => {
    const c = mk(32, 32), g = c.getContext('2d'); R(g, 0, 0, 32, 32, mix(col, '#000000', 0.35));
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const ox = j % 2 ? 4 : 0; R(g, (i * 8 + ox) % 32 + 1, j * 8 + 1, 6, 6, mix(col, hash(i, j) > 0.5 ? '#ffffff' : '#000000', hash(j, i) * 0.12)); R(g, (i * 8 + ox) % 32 + 1, j * 8 + 1, 6, 1, 'rgba(255,240,220,.12)'); }
    return c;
  });
}
function skyCanvas(cols, stars) {
  return once('sky:' + cols.join() + stars, () => {
    const c = mk(4, 256), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, cols[0]); gr.addColorStop(0.55, cols[1]); gr.addColorStop(1, cols[2] || cols[1]); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    if (!stars) return c;
    const s = mk(512, 256), sg = s.getContext('2d'); sg.drawImage(c, 0, 0, 512, 256);
    for (let i = 0; i < 160; i++) { sg.fillStyle = `rgba(255,255,255,${0.2 + hash(i, 5) * 0.6})`; sg.fillRect(Math.floor(hash(i, 6) * 512), Math.floor(hash(7, i) * 150), 1, 1); }
    return s;
  });
}
function glowCanvas(core, edge) { return once('glow:' + core + edge, () => { const c = mk(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, core); gr.addColorStop(0.3, edge); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c; }); }
function shaftCanvas() { return once('shaft', () => { const c = mk(16, 128), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 16, 128); const h = g.createLinearGradient(0, 0, 16, 0); h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(0.5, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = h; g.fillRect(0, 0, 16, 128); return c; }); }
function treeCanvas(kind, col) {
  return once('tree:' + kind + col, () => {
    const c = mk(48, 64), g = c.getContext('2d'), disc = (cx, cy, r, f) => { g.fillStyle = f; for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) g.fillRect(cx + x, cy + y, 1, 1); };
    if (kind === 'pine') { R(g, 21, 48, 6, 16, '#2a1a10'); R(g, 22, 48, 3, 16, '#6a4a2a'); for (const [y, w] of [[6, 7], [16, 12], [26, 16], [36, 20]]) { R(g, 24 - w - 1, y - 1, w * 2 + 2, 13, '#0a1e12'); R(g, 24 - w, y, w * 2, 11, mix(col, '#000000', 0.25)); R(g, 24 - w, y, w, 3, mix(col, '#ffffff', 0.15)); } return c; }
    R(g, 19, 40, 10, 24, '#2a1a10'); R(g, 21, 40, 6, 24, '#6a4a2a');
    for (const [x, y, r] of [[24, 22, 19], [10, 32, 11], [38, 32, 11]]) disc(x, y, r + 1, '#0a1e10');
    for (const [x, y, r] of [[24, 22, 19], [10, 32, 11], [38, 32, 11]]) disc(x, y, r, mix(col, '#000000', 0.2));
    disc(20, 17, 11, col); disc(16, 13, 5, mix(col, '#ffffff', 0.3));
    return c;
  });
}

// ---------------------------------------------------------------- sprites: hero chibis and monsters drawn into small canvases
function heroCanvas(id, pose, frame, wtype, flip) {
  return once(`h:${id}:${pose}:${frame}:${wtype}:${flip}`, () => { const c = mk(48, 44); drawChibi(c.getContext('2d'), id, 24, 42, 1, pose, frame, wtype, typeof flip === 'string' ? { dir: flip } : { flip }); return c; });
}
function monCanvas(art, hue, frame) {
  return once(`m:${art}:${hue}:${frame}`, () => { const c = mk(160, 150); monsterSprite(c.getContext('2d'), art, hue, 80, 140, 1, frame * 0.5 + 0.01, { px: 1, noGlow: true }); return c; });
}

// ---------------------------------------------------------------- post effects (same pipeline as the other HD-2D games)
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const DOF = {
  uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2(1, 0) }, focus: { value: 0.5 }, nearW: { value: 0.36 }, farW: { value: 0.3 }, maxR: { value: 6 }, all: { value: 0 } },
  vertexShader: VS,
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 dir; uniform float focus, nearW, farW, maxR, all; varying vec2 vUv;
    void main(){ float d = vUv.y - focus; float a = d > 0.0 ? smoothstep(farW * 0.3, farW, d) : smoothstep(nearW * 0.3, nearW, -d);
      float r = max(a, all) * maxR; vec4 c = vec4(0.0); float ws = 0.0;
      for (int i = -6; i <= 6; i++) { float f = float(i); float w = exp(-f * f / 14.0); c += texture2D(tDiffuse, vUv + dir * f * r / 6.0) * w; ws += w; }
      gl_FragColor = c / ws; }`,
};
const GRADE = {
  uniforms: { tDiffuse: { value: null }, vig: { value: 0.5 }, sat: { value: 1.08 }, contrast: { value: 1.08 }, tint: { value: new THREE.Vector3(1, 1, 1) } },
  vertexShader: VS,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vig, sat, contrast; uniform vec3 tint; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, sat);
      c = max(vec3(0.0), (c - 0.18) * contrast + 0.18) * tint; vec2 v = vUv - 0.5; c *= 1.0 - vig * dot(v, v) * 2.4; gl_FragColor = vec4(c, 1.0); }`,
};
const BRIGHT = new Set(['sky', 'desert', 'ice', 'mountain']), MID = new Set(['forest', 'swamp', 'sea', 'ruins', 'fort']);

export function create(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.5, 200);
  const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.6, 0.8); composer.addPass(bloom);
  const dofH = new ShaderPass(DOF), dofV = new ShaderPass(DOF); dofV.uniforms.dir.value.set(0, 1); composer.addPass(dofH); composer.addPass(dofV);
  const grade = new ShaderPass(GRADE); composer.addPass(grade); composer.addPass(new OutputPass());

  const hemi = new THREE.HemisphereLight('#ffffff', '#444444', 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffffff', 2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 80 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; scene.add(sun); scene.add(sun.target);
  const spot = new THREE.SpotLight('#ffffff', 0, 40, 0.6, 0.6, 1.2); spot.castShadow = false; scene.add(spot); scene.add(spot.target);
  const lantern = new THREE.PointLight('#ffd9a8', 0, 12, 1.2); scene.add(lantern);
  const pool = Array.from({ length: 5 }, () => { const l = new THREE.PointLight('#ff9a40', 0, 8, 1.5); scene.add(l); return l; });

  const texCache = new Map();
  const tex = (c, o = {}) => {
    const k = c; let t = texCache.get(k); if (t) return t;
    t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
    if (o.mip === false) { t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; } else { t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8; }
    if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    texCache.set(k, t); return t;
  };
  const glow = { warm: () => tex(glowCanvas('rgba(255,250,220,1)', 'rgba(255,170,60,.55)'), { mip: false }), white: () => tex(glowCanvas('rgba(255,255,255,1)', 'rgba(200,220,255,.4)'), { mip: false }),
    red: () => tex(glowCanvas('rgba(255,230,220,1)', 'rgba(255,50,70,.6)'), { mip: false }), teal: () => tex(glowCanvas('rgba(230,255,250,1)', 'rgba(90,255,210,.55)'), { mip: false }),
    any: (col) => tex(glowCanvas('rgba(255,255,255,1)', col), { mip: false }) };
  const blobTex = tex(glowCanvas('rgba(0,0,0,.8)', 'rgba(0,0,0,.5)'), { mip: false });

  let W = null; const own = [];
  const keep = (x) => { own.push(x); return x; };
  const lam = (o) => keep(new THREE.MeshLambertMaterial(o));
  const matCache = {}; const col = (c, o = {}) => { const k = c + JSON.stringify(o); return matCache[k] || (matCache[k] = keep(new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o }))); };
  const glowMat = (c, i = 2.4) => col(c, { emissive: c, emissiveIntensity: i });
  function clear() { if (W) scene.remove(W.root); for (const x of own) x.dispose && x.dispose(); own.length = 0; for (const k in matCache) delete matCache[k]; W = null; }
  // little builders; every mesh casts and receives shadows unless told otherwise
  let root = null;
  const put = (mesh, x, y, z, cast = true) => { mesh.position.set(x, y, z); mesh.castShadow = cast; mesh.receiveShadow = true; root.add(mesh); return mesh; };
  const geo = (g) => keep(g);
  const box = (w, h, d, m, x, y, z) => put(new THREE.Mesh(geo(new THREE.BoxGeometry(w, h, d)), m), x, y + h / 2, z);
  const cyl = (r1, r2, h, n, m, x, y, z) => put(new THREE.Mesh(geo(new THREE.CylinderGeometry(r1, r2, h, n)), m), x, y + h / 2, z);
  const cone = (r, h, n, m, x, y, z, rot = 0) => { const s = put(new THREE.Mesh(geo(new THREE.ConeGeometry(r, h, n)), m), x, y + h / 2, z); s.rotation.y = rot; return s; };
  const ball = (r, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const s = put(new THREE.Mesh(geo(new THREE.SphereGeometry(r, 12, 8)), m), x, y, z); s.scale.set(sx, sy, sz); return s; };
  const rock = (r, m, x, y, z, sy = 0.75) => { const s = put(new THREE.Mesh(geo(new THREE.DodecahedronGeometry(r)), m), x, y + r * sy * 0.6, z); s.scale.set(1, sy, 1); s.rotation.set(hash(x * 9, z) * 3, hash(z, x) * 6, 0); return s; };
  const sprite = (t, x, y, z, s, o = {}) => { const sp = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: t, blending: THREE.AdditiveBlending, depthWrite: false, opacity: o.a == null ? 1 : o.a, color: o.color || '#ffffff' }))); sp.position.set(x, y, z); sp.scale.set(s, s * (o.tall || 1), 1); root.add(sp); return sp; };
  const board = (img, w, h, x, z, s = 1, lean = 0.25) => {      // a standing billboard (trees)
    const g2 = geo(new THREE.PlaneGeometry(w, h)); g2.translate(0, h / 2, 0); g2.rotateX(-lean);
    const t = tex(img), m = new THREE.Mesh(g2, lam({ map: t, alphaTest: 0.5, side: THREE.DoubleSide })); m.customDepthMaterial = keep(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: 0.5 }));
    m.scale.setScalar(s); return put(m, x, 0, z);
  };
  const flames = [];      // lights in the scene: the nearest few are real point lights
  const torch = (x, y, z, c = '#ff9a40', size = 0.5) => { const sp = sprite(c === '#ff9a40' ? glow.warm() : glow.any(c), x, y, z, size, { tall: 1.3 }); flames.push({ x, y: y + 0.1, z: z + 0.25, col: c, sprite: sp, size }); return sp; };
  // floating particles of a kind (dust, ember, snow, firefly, bubble, drip, motes)
  function motes(kind, light, n, area) {
    const colr = { ember: '#ff8a30', firefly: '#c8ff70', snow: '#f4f8ff', bubble: '#b0f0ff', drip: '#a0dcc8', motes: light, dust: '#e8d8b8' }[kind] || light;
    const pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { pos[i * 3] = (hash(i, 1) - 0.5) * area[0]; pos[i * 3 + 1] = hash(i, 2) * area[1]; pos[i * 3 + 2] = (hash(i, 3) - 0.5) * area[2]; seed[i] = hash(i, 4) * 10; }
    const g2 = geo(new THREE.BufferGeometry()); g2.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(g2, keep(new THREE.PointsMaterial({ map: glow.white(), color: colr, size: kind === 'snow' ? 0.14 : 0.12, transparent: true, opacity: 0.85, blending: kind === 'dust' || kind === 'snow' ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false })));
    p.frustumCulled = false; root.add(p);
    return { p, kind, base: pos.slice(), seed, area };
  }
  function moveMotes(M, t, cx, cz) {
    const P = M.p.geometry.attributes.position.array, [ax, ay, az] = M.area;
    for (let i = 0; i < M.seed.length; i++) {
      const s = M.seed[i], sp = 0.15 + (s % 1) * 0.25; let y = M.base[i * 3 + 1];
      if (M.kind === 'snow' || M.kind === 'drip') y = ay - ((ay - y + t * (M.kind === 'drip' ? 2.4 : 0.5) * sp * 3) % ay);
      else if (M.kind === 'ember' || M.kind === 'bubble') y = (y + t * sp * 1.4) % ay;
      else y = y + Math.sin(t * 0.7 + s) * 0.3;
      let x = M.base[i * 3] + Math.sin(t * 0.5 * sp + s) * 0.7, z = M.base[i * 3 + 2] + Math.cos(t * 0.4 + s * 1.3) * 0.5;
      x = ((x - cx + ax / 2) % ax + ax) % ax + cx - ax / 2; z = ((z - cz + az / 2) % az + az) % az + cz - az / 2;
      P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z;
    }
    M.p.geometry.attributes.position.needsUpdate = true;
    M.p.material.opacity = M.kind === 'firefly' ? 0.4 + 0.5 * Math.abs(Math.sin(t * 1.3)) : 0.75;
  }
  function begin(key, look) {
    clear(); flames.length = 0; root = new THREE.Group(); scene.add(root);
    const D = DIO[look.theme] || DIO.cave;
    scene.background = look.bg ? tex(look.bg, { mip: false }) : new THREE.Color(look.dark || '#040308');
    scene.fog = new THREE.Fog(look.fog || D.haze, look.fogN || 20, look.fogF || 50);
    hemi.color.set(look.sky || D.light); hemi.groundColor.set(look.gnd || '#2a2430'); hemi.intensity = look.amb;
    sun.color.set(look.sunCol || D.light); sun.intensity = look.sun; sun.castShadow = look.sun > 0.4;
    spot.intensity = 0; lantern.intensity = 0;
    W = { key, D, look, root, flames, mot: null, sprites: [], dyn: [] };
    return W;
  }

  // ---------------------------------------------------------------- a dungeon floor
  function buildDungeon(fl) {
    const th = fl.theme, D = DIO[th] || DIO.cave, bright = BRIGHT.has(th), mid = MID.has(th);
    begin('dun:' + fl.id + ':' + fl.f, { theme: th, dark: th === 'sky' ? '#9ab8e0' : '#040308', fog: th === 'sky' ? '#c8d8f0' : '#040308', fogN: 22, fogF: 40, amb: bright ? 0.95 : mid ? 0.85 : 0.5, sun: bright ? 1.7 : mid ? 1.2 : 0.35, sky: bright ? '#ffffff' : D.light, gnd: '#1a1418' });
    W.dark = !bright;
    const isWall = (x, y) => x < 0 || y < 0 || x >= fl.w || y >= fl.h || fl.tiles[y * fl.w + x] === 0;
    const buried = (x, y) => [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]].every(([dx, dy]) => isWall(x + dx, y + dy));
    // the floor: one plane painted tile by tile (rock beyond the walls is left dark)
    const S = 32, gc = mk(fl.w * S, fl.h * S), g = gc.getContext('2d'), ft = floorCanvas(th);
    for (let y = 0; y < fl.h; y++) for (let x = 0; x < fl.w; x++) if (!isWall(x, y)) g.drawImage(ft, ((x * 7 + y * 13) % 4) * S, 0, S, S, x * S, y * S, S, S);
    for (let y = 0; y < fl.h; y++) for (let x = 0; x < fl.w; x++) if (!isWall(x, y) && isWall(x, y - 1)) { const gr = g.createLinearGradient(0, y * S, 0, y * S + 10); gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x * S, y * S, S, 10); }
    const gt = keep(new THREE.CanvasTexture(gc)); gt.colorSpace = THREE.SRGBColorSpace; gt.magFilter = THREE.NearestFilter; gt.minFilter = THREE.LinearMipmapLinearFilter; gt.anisotropy = 8;
    const gp = geo(new THREE.PlaneGeometry(fl.w, fl.h)); gp.rotateX(-Math.PI / 2);
    put(new THREE.Mesh(gp, lam({ map: gt, alphaTest: 0.5 })), fl.w / 2, 0, fl.h / 2, false);
    // walls that face the floor rise as blocks
    const list = []; for (let y = 0; y < fl.h; y++) for (let x = 0; x < fl.w; x++) if (isWall(x, y) && !buried(x, y)) list.push([x, y]);
    const woods = th === 'forest' || th === 'swamp';
    const H = woods ? 0.45 : 1.2, bg = geo(new THREE.BoxGeometry(1, H, 1)); bg.translate(0, H / 2, 0);
    const side = lam({ map: tex(wallCanvas(th)) }), top = lam({ map: tex(topCanvas(th)) });
    if (woods) {
      const leaf = th === 'swamp' ? '#4a6a34' : '#3a7a34';
      for (const kind of ['round', 'pine']) {
        const spots2 = list.filter(([x, y]) => (hash(x, y * 3) < 0.45) === (kind === 'pine'));
        if (!spots2.length) continue;
        const g3 = geo(new THREE.PlaneGeometry(1.5, 2)); g3.translate(0, 1, 0); g3.rotateX(-0.42);
        const t3 = tex(treeCanvas(kind, leaf)), tm = new THREE.InstancedMesh(g3, lam({ map: t3, alphaTest: 0.5, side: THREE.DoubleSide }), spots2.length), q4 = new THREE.Matrix4();
        spots2.forEach(([x, y], i) => { const sc = 0.95 + hash(y, x) * 0.45; q4.makeScale(sc, sc, sc); q4.setPosition(x + 0.5 + (hash(x, 7) - 0.5) * 0.3, 0, y + 0.55); tm.setMatrixAt(i, q4); });
        tm.customDepthMaterial = keep(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t3, alphaTest: 0.5 })); tm.castShadow = tm.receiveShadow = true; root.add(tm);
      }
    }
    const im = new THREE.InstancedMesh(bg, [side, side, top, top, side, side], list.length), m4 = new THREE.Matrix4();
    list.forEach(([x, y], i) => { m4.makeTranslation(x + 0.5, 0, y + 0.5); im.setMatrixAt(i, m4); });
    im.castShadow = im.receiveShadow = true; root.add(im);
    // torches on the walls above the floor
    const spots = [];
    for (const [x, y] of list) if (!isWall(x, y + 1) && hash(x, y) < 0.2 && !spots.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 5)) spots.push([x, y]);
    for (const [x, y] of spots) { box(0.08, 0.24, 0.12, col('#3a2a1a'), x + 0.5, H * 0.45, y + 1.05); torch(x + 0.5, H * 0.45 + 0.42, y + 1.12, th === 'void' ? '#c070ff' : th === 'sewer' ? '#70ffc0' : '#ff9a40'); }
    // the way in, the way on, the chests
    const s = fl.start, e = fl.end, wood = col('#5a3418'), stone = col(mix((THEMES[th] || THEMES.cave).top, '#808080', 0.3));
    W.marks = { start: s, end: e };
    if (fl.f === 1) { box(0.92, 1.35, 0.14, col('#2a1a10'), s.x + 0.5, 0, s.y + 0.12); box(0.72, 1.18, 0.1, wood, s.x + 0.5, 0, s.y + 0.18); sprite(glow.warm(), s.x + 0.72, 0.62, s.y + 0.26, 0.35); }
    else for (let i = 0; i < 4; i++) box(0.86, 0.12 * (i + 1), 0.22, stone, s.x + 0.5, 0, s.y + 0.95 - i * 0.22);
    if (e.kind === 'down') { const hole = new THREE.Mesh(geo(new THREE.PlaneGeometry(0.86, 0.86)), new THREE.MeshBasicMaterial({ color: '#000000' })); hole.rotation.x = -Math.PI / 2; put(hole, e.x + 0.5, 0.012, e.y + 0.5, false);
      for (let i = 0; i < 3; i++) box(0.7, 0.04, 0.2, stone, e.x + 0.5, -0.0 + 0.004 * i, e.y + 0.25 + i * 0.22); sprite(glow.warm(), e.x + 0.5, 0.2, e.y + 0.5, 1.0, { a: 0.5 }); }
    else { box(0.9, 0.42, 0.7, stone, e.x + 0.5, 0, e.y + 0.5); box(1.0, 0.08, 0.8, col('#5a5668'), e.x + 0.5, 0.42, e.y + 0.5);
      const gem = put(new THREE.Mesh(geo(new THREE.OctahedronGeometry(0.16)), glowMat('#ff3a52')), e.x + 0.5, 0.95, e.y + 0.5, false);
      const halo = sprite(glow.red(), e.x + 0.5, 0.95, e.y + 0.5, 1.4, { a: 0.8 });
      flames.push({ x: e.x + 0.5, y: 1.3, z: e.y + 0.9, col: '#ff4060', power: 0.8 });
      W.altar = { gem, halo, fl: flames[flames.length - 1] };
    }
    W.chests = fl.chests.map((c) => {
      const body = box(0.6, 0.36, 0.42, col('#7a4420'), c.x + 0.5, 0, c.y + 0.5); box(0.62, 0.05, 0.44, col('#d8b050'), c.x + 0.5, 0.2, c.y + 0.5);
      const pivot = new THREE.Group(); pivot.position.set(c.x + 0.5, 0.36, c.y + 0.29); root.add(pivot);
      const lid = new THREE.Mesh(geo(new THREE.BoxGeometry(0.62, 0.14, 0.44)), col('#9a5a26')); lid.position.set(0, 0.07, 0.22); lid.castShadow = true; pivot.add(lid);
      const gl = sprite(glow.warm(), c.x + 0.5, 0.55, c.y + 0.55, 0.9, { a: 0.5 });
      return { c, body, pivot, gl };
    });
    W.mot = motes(D.part, D.light, 70, [24, 3, 18]);
  }

  // ---------------------------------------------------------------- the battle stage and the title: an open diorama for a theme
  function buildArena(theme, key) {
    const D = DIO[theme] || DIO.cave, T = THEMES[theme] || THEMES.cave, bright = BRIGHT.has(theme), mid = MID.has(theme);
    const starry = ['void', 'castle', 'tower', 'mountain', 'ice', 'desert', 'fort'].includes(theme);
    begin(key, { theme, bg: skyCanvas(D.sky, starry), fog: D.haze, fogN: 18, fogF: 62, amb: bright ? 1.4 : mid ? 1.0 : 0.75, sun: bright ? 2.4 : mid ? 1.6 : 0.9, sky: D.sky[2], gnd: T.wall });
    spot.color.set(D.light); spot.intensity = bright ? 0 : 60; spot.position.set(1, 12, 6); spot.target.position.set(0, 0, -1);
    // the ground
    const gt = tex(floorCanvas(theme), { repeat: true }); const ground = keep(gt.clone()); ground.needsUpdate = true; ground.repeat.set(20, 14); ground.wrapS = ground.wrapT = THREE.RepeatWrapping;
    const floating = theme === 'sky' || theme === 'void';
    const gp = floating ? geo(new THREE.CircleGeometry(11, 40)) : geo(new THREE.PlaneGeometry(80, 56)); gp.rotateX(-Math.PI / 2);
    if (floating) { ground.repeat.set(5.5, 5.5); }
    put(new THREE.Mesh(gp, lam({ map: ground })), 0, 0, floating ? -2 : -8, false);
    if (floating) cyl(11, 7, 2.5, 40, col(mix(T.wall, '#000000', 0.2)), 0, -2.5, -2);
    // scenery around the fight (never in the middle, where everyone stands)
    const kind = D.kind, wallC = col(T.wall), topC = col(T.top), dark = col(mix(T.wall, '#000000', 0.35));
    const ring = (n, r0, r1, fn) => { for (let i = 0; i < n; i++) { const a = Math.PI * (0.05 + 0.9 * (i + hash(i, 7) * 0.6) / n), r = r0 + hash(i, 8) * (r1 - r0); fn(Math.cos(a) * r * 1.3, -Math.sin(a) * r * 0.9 - 2, i); } };
    if (kind === 'rocks' || kind === 'beams') {
      ring(16, 7, 14, (x, z, i) => rock(0.6 + hash(i, 1) * 1.2, i % 2 ? wallC : topC, x, 0, z));
      ring(12, 9, 16, (x, z, i) => cone(0.4 + hash(i, 2) * 0.4, 1.5 + hash(i, 3) * 2.5, 6, dark, x, 0, z));
      if (kind === 'beams') for (const x of [-9, -4.5, 4.5, 9]) { box(0.3, 3.4, 0.3, col('#5a3a1e'), x - 1.2, 0, -9); box(0.3, 3.4, 0.3, col('#5a3a1e'), x + 1.2, 0, -9); box(3, 0.3, 0.34, col('#6a4426'), x, 3.2, -9); torch(x, 2.6, -8.7); }
      else for (const x of [-7, 6]) torch(x, 1.8, -7);
    } else if (kind === 'peaks') {
      for (let i = 0; i < 9; i++) { const x = -34 + i * 8.5 + hash(i, 4) * 4, h = 9 + hash(i, 5) * 9; cone(5 + hash(i, 6) * 3, h, 6, col(mix(T.wall, D.haze, 0.25)), x, 0, -34 - hash(i, 9) * 8, hash(i, 3));
        if (theme !== 'volcano') cone(2.2, h * 0.36, 6, col('#f4f6ff'), x, h * 0.64, -34 - hash(i, 9) * 8, hash(i, 3)); else cone(1.4, 0.8, 6, glowMat('#ff5a1a', 3), x, h - 0.6, -34 - hash(i, 9) * 8); }
      ring(14, 7, 14, (x, z, i) => rock(0.5 + hash(i, 1) * 1.1, i % 3 ? wallC : topC, x, 0, z));
      if (theme === 'volcano') for (const [x, z] of [[-8, -6], [7, -5], [-3, -12]]) { const lv = new THREE.Mesh(geo(new THREE.CircleGeometry(1.4, 16)), glowMat('#ff4a10', 2)); lv.rotation.x = -Math.PI / 2; put(lv, x, 0.02, z, false); flames.push({ x, y: 0.6, z, col: '#ff6020' }); }
    } else if (kind === 'pillars') {
      ring(10, 6, 12, (x, z, i) => { const broken = hash(i, 5) < 0.35, h = broken ? 1 + hash(i, 6) * 2 : 4.5; box(1.1, 0.3, 1.1, topC, x, 0, z); cyl(0.38, 0.42, h, 12, col(mix(T.top, '#ffffff', 0.15), { flatShading: false }), x, 0.3, z); if (!broken) box(1.1, 0.3, 1.1, topC, x, 4.8, z); });
      const fallen = put(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.4, 0.4, 3.6, 12)), col(mix(T.top, '#ffffff', 0.1), { flatShading: false })), -6, 0.4, -4); fallen.rotation.z = Math.PI / 2; fallen.rotation.y = 0.5;
      ring(8, 9, 15, (x, z, i) => rock(0.4 + hash(i, 2) * 0.6, wallC, x, 0, z));
      if (theme === 'tomb') for (const x of [-6, 6]) torch(x, 2.4, -6, '#a0c0ff');
    } else if (kind === 'castle') {
      for (let x = -20; x <= 20; x += 2) { box(2, 5, 1.6, wallC, x, 0, -12); if ((x / 2) % 2 === 0) box(0.9, 0.7, 1.6, wallC, x - 0.5, 5, -12); }
      for (const x of [-14, 0, 14]) { cyl(2, 2.2, 9, 12, topC, x, 0, -13.5); cone(2.6, 3.4, 12, col(theme === 'tower' ? '#4a3a7a' : '#3a4a8a'), x, 9, -13.5); box(0.5, 0.8, 0.05, glowMat('#ffd890'), x, 5.5, -11.4, false); }
      for (const x of [-9, -3, 3, 9]) { const b = put(new THREE.Mesh(geo(new THREE.PlaneGeometry(1.2, 2.6)), col('#8a1a2a', { side: THREE.DoubleSide })), x, 3.3, -11.1); void b; torch(x + 1.4, 2.6, -11, '#ff9a40', 0.6); }
      ring(6, 8, 12, (x, z, i) => rock(0.4 + hash(i, 2) * 0.4, dark, x, 0, z));
    } else if (kind === 'pipes') {
      for (let i = 0; i < 6; i++) { const p = put(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.5, 0.5, 30, 12)), col(i % 2 ? '#5a5a62' : '#6a5a4a', { flatShading: false })), 0, 1 + i * 1.4, -12 - (i % 3) * 1.5); p.rotation.z = Math.PI / 2; }
      for (const x of [-10, -5, 5, 10]) { cyl(0.6, 0.6, 9, 12, col('#4a4a52', { flatShading: false }), x, 0, -10); box(1.6, 0.5, 1.6, col('#3a3a40'), x, 0, -10); }
      if (theme === 'factory') for (const x of [-7, 7]) { box(2.4, 2.2, 2, col('#3a2a24'), x, 0, -8); box(1.2, 0.8, 0.05, glowMat('#ff7a20', 3), x, 0.6, -6.95, false); flames.push({ x, y: 1, z: -6.5, col: '#ff7a20' }); }
      else { const wat = new THREE.Mesh(geo(new THREE.PlaneGeometry(40, 4)), keep(new THREE.MeshPhongMaterial({ color: '#2a6a5a', emissive: '#0a3a2a', shininess: 90, transparent: true, opacity: 0.85 }))); wat.rotation.x = -Math.PI / 2; put(wat, 0, 0.03, -7.5, false); W.water = wat; }
    } else if (kind === 'trees') {
      const tc = theme === 'swamp' ? '#4a6a34' : '#3a7a34';
      ring(18, 6, 15, (x, z, i) => board(treeCanvas(i % 3 ? 'round' : 'pine', tc), 3, 4, x, z, 1.2 + hash(i, 4) * 0.9));
      ring(10, 6, 10, (x, z, i) => ball(0.6 + hash(i, 1) * 0.4, col(mix(tc, '#000000', 0.15)), x, 0.2, z + 2, 1.3, 0.7, 1.1));
      if (theme === 'swamp') for (const [x, z] of [[-6, -4], [5, -6]]) { const wat = new THREE.Mesh(geo(new THREE.CircleGeometry(2, 20)), keep(new THREE.MeshPhongMaterial({ color: '#3a4a2a', shininess: 80 }))); wat.rotation.x = -Math.PI / 2; put(wat, x, 0.02, z, false); }
    } else if (kind === 'dunes') {
      for (let i = 0; i < 9; i++) ball(6 + hash(i, 1) * 5, col(mix(T.floor, '#ffffff', hash(i, 2) * 0.1), { flatShading: false }), -30 + i * 7.5, -1.5, -22 - hash(i, 3) * 10, 1.4, 0.35, 0.8);
      ring(6, 8, 13, (x, z, i) => { if (i % 2) cyl(0.35, 0.4, 2 + hash(i, 1) * 2, 10, col(mix(T.top, '#ffffff', 0.1)), x, 0, z); else rock(0.5 + hash(i, 2) * 0.6, wallC, x, 0, z); });
    } else if (kind === 'waves') {
      const wat = new THREE.Mesh(geo(new THREE.PlaneGeometry(90, 40, 30, 12)), keep(new THREE.MeshPhongMaterial({ color: '#1e5a7a', emissive: '#0a2030', shininess: 120, specular: '#88ccff', flatShading: true })));
      wat.rotation.x = -Math.PI / 2; put(wat, 0, 0.05, -30, false); W.water = wat; W.waves = wat.geometry.attributes.position.array.slice();
      ring(12, 7, 13, (x, z, i) => rock(0.5 + hash(i, 1) * 1.0, i % 2 ? wallC : topC, x, 0, z));
      ring(8, 6, 11, (x, z, i) => { if (i % 2) cone(0.15, 1 + hash(i, 4), 5, col('#e86a7a'), x, 0, z); });
    } else if (kind === 'clouds') {
      for (let i = 0; i < 22; i++) { const x = (hash(i, 1) - 0.5) * 70, z = -10 - hash(i, 2) * 40, y = -4 + hash(i, 3) * 6; for (let k = 0; k < 3; k++) ball(2 + hash(i, k) * 2.5, col('#ffffff', { flatShading: false }), x + k * 2.2, y + hash(k, i), z, 1.2, 0.6, 1); }
      ring(6, 7, 10, (x, z, i) => cyl(0.3, 0.32, 3.5, 12, col('#f0f0f8', { flatShading: false }), x, 0, z));
    } else if (kind === 'void') {
      for (let i = 0; i < 26; i++) { const x = (hash(i, 1) - 0.5) * 50, z = -6 - hash(i, 2) * 30, y = hash(i, 3) * 9 - 1, c = put(new THREE.Mesh(geo(new THREE.OctahedronGeometry(0.4 + hash(i, 4) * 0.9)), i % 3 ? col('#2a1840') : glowMat('#b050ff', 1.8)), x, y, z); c.scale.y = 1.8; W.dyn.push(c); }
      ring(8, 7, 11, (x, z, i) => rock(0.5 + hash(i, 1) * 0.6, dark, x, 0, z));
    }
    // light falling from above through the haze
    for (let i = 0; i < 4; i++) {
      const sh = new THREE.Mesh(geo(new THREE.PlaneGeometry(2.2 + hash(i, 1) * 2, 16)), keep(new THREE.MeshBasicMaterial({ map: tex(shaftCanvas(), { mip: false }), color: D.light, transparent: true, opacity: bright ? 0.1 : 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })));
      sh.position.set(-9 + i * 6 + hash(i, 2) * 3, 6, -7 - hash(i, 3) * 4); sh.rotation.z = 0.35; root.add(sh);
    }
    W.mot = motes(D.part, D.light, 90, [30, 6, 18]);
  }

  // ---------------------------------------------------------------- a town at night: houses around a lamplit square
  const TOWN = {
    castle: { wall: '#c8bca0', roof: '#3a4a7a', ground: '#7a7470', win: '#ffd890', sky: ['#0a1030', '#2a3462', '#5a5a80'], big: 'castle' },
    village: { wall: '#d8c8a0', roof: '#8a4a2a', ground: '#6a5a44', win: '#ffc070', sky: ['#0a1020', '#2a3448', '#4a4a5a'], big: 'well', trees: 1 },
    forest: { wall: '#8a6a44', roof: '#4a6a34', ground: '#3a5a2a', win: '#d0ff90', sky: ['#06120a', '#1a3422', '#2a4a30'], big: 'tree', trees: 3 },
    port: { wall: '#e0d8c8', roof: '#3a6a8a', ground: '#7a7a74', win: '#ffd8a0', sky: ['#061428', '#1e4060', '#3a6080'], big: 'lighthouse', sea: 1 },
    industrial: { wall: '#6a5048', roof: '#3a3434', ground: '#4a4440', win: '#ff9a50', sky: ['#0e0c0c', '#2e2420', '#5a3a2a'], big: 'chimney' },
    snow: { wall: '#c8c0b8', roof: '#f4f8ff', ground: '#e8eef8', win: '#fff0d0', sky: ['#0c1428', '#3a5a88', '#7a9ac0'], big: 'tree', trees: 2, snow: 1 },
    desert: { wall: '#e0c090', roof: '#e0c090', ground: '#d8b880', win: '#ffe0a0', sky: ['#1a0e28', '#7a3a4a', '#d0806a'], big: 'dome', flat: 1 },
    mountain: { wall: '#8a8478', roof: '#4a4440', ground: '#6a6458', win: '#ffc080', sky: ['#0a0a10', '#2e2c34', '#4a4650'], big: 'peaks' },
    eastern: { wall: '#e8dcc8', roof: '#3a2a3a', ground: '#7a6a5a', win: '#ff9a80', sky: ['#10081a', '#3a2040', '#6a3a5a'], big: 'pagoda', pagoda: 1 },
    holy: { wall: '#f4f0e8', roof: '#5a7ac8', ground: '#c8c4c0', win: '#fffbe0', sky: ['#1a2a5a', '#5a7ab8', '#a8c0e8'], big: 'temple' },
  };
  function buildTown(style) {
    const st = TOWN[style] || TOWN.village;
    begin('town:' + style, { theme: 'castle', bg: skyCanvas(st.sky, true), fog: st.sky[1], fogN: 26, fogF: 70, amb: 0.65, sun: 0.7, sunCol: '#a8b8ff', sky: '#8a9ad8', gnd: '#2a2420' });
    const gt = keep(tex(cobbleCanvas(st.ground), { repeat: true }).clone()); gt.needsUpdate = true; gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(30, 20);
    const gp = geo(new THREE.PlaneGeometry(80, 50)); gp.rotateX(-Math.PI / 2); put(new THREE.Mesh(gp, lam({ map: gt })), 0, 0, -10, false);
    const wall = col(st.wall), roof = col(st.roof), dark = col('#2a1a10'), win = glowMat(st.win, 1.6);
    const house = (x, z, w, h, d, face = 0) => {
      const g2 = new THREE.Group(); g2.position.set(x, 0, z); g2.rotation.y = face; root.add(g2);
      const add = (m, px, py, pz, cast = true) => { m.position.set(px, py, pz); m.castShadow = cast; m.receiveShadow = true; g2.add(m); return m; };
      add(new THREE.Mesh(geo(new THREE.BoxGeometry(w, h, d)), wall), 0, h / 2, 0);
      if (st.flat) { add(new THREE.Mesh(geo(new THREE.BoxGeometry(w + 0.2, 0.2, d + 0.2)), col(mix(st.wall, '#000000', 0.15))), 0, h + 0.1, 0); if (hash(x, z) > 0.5) add(new THREE.Mesh(geo(new THREE.SphereGeometry(w * 0.3, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)), col('#e8d0a0', { flatShading: false })), 0, h + 0.2, 0); }
      else { const r = add(new THREE.Mesh(geo(new THREE.ConeGeometry(Math.max(w, d) * (st.pagoda ? 0.95 : 0.78), h * 0.7, 4)), roof), 0, h + h * 0.35, 0); r.rotation.y = Math.PI / 4; r.scale.set(1, 1, d / w); if (st.pagoda) add(new THREE.Mesh(geo(new THREE.BoxGeometry(w + 0.8, 0.12, d + 0.8)), roof), 0, h, 0); }
      add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.7, 1.2, 0.05)), dark), w * 0.18, 0.6, d / 2 + 0.03, false);
      for (const wx of [-w * 0.25, w * 0.32]) if (hash(x * 3 + wx, z) > 0.25) add(new THREE.Mesh(geo(new THREE.BoxGeometry(0.42, 0.5, 0.05)), win), wx, h * 0.6, d / 2 + 0.04, false);
      const gx = Math.cos(face) * 0 + x, gz = z; sprite(glow.any('rgba(255,200,120,.35)'), gx + Math.sin(face) * (d / 2 + 0.3) - w * 0.1, h * 0.6, gz + Math.cos(face) * (d / 2 + 0.3), 0.9, { a: 0.22 });
    };
    for (let i = 0; i < 6; i++) { const x = -11 + i * 4.4, w = 2.6 + hash(i, 1) * 1.0, h = 2.2 + hash(i, 2) * 1.4; house(x, -9 - hash(i, 3) * 1.5, w, h, 2.4); }
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) house(s * (9.5 + i * 0.8), -4 + i * 3.4, 2.4, 2 + hash(i, s + 5) * 1.2, 2.4, -s * Math.PI / 2);
    // lamps
    for (const [x, z] of [[-4, -2], [4, -2], [-6.5, 3], [6.5, 3]]) { cyl(0.06, 0.08, 2.4, 6, col('#2a2a30'), x, 0, z); box(0.24, 0.3, 0.24, glowMat('#ffe0a0', 1.8), x, 2.4, z, false); torch(x, 2.6, z, '#ffc070', 0.55); }
    // the landmark at the back of the square
    const B = st.big;
    if (B === 'castle') { box(10, 6, 3, col('#a8a090'), 0, 0, -20); for (const x of [-5, 5]) { cyl(1.3, 1.5, 9, 10, col('#b8b0a0'), x, 0, -19.5); cone(1.8, 2.6, 10, col('#3a4a7a'), x, 9, -19.5); } cyl(1.6, 1.8, 12, 10, col('#c0b8a8'), 0, 0, -21); cone(2.2, 3.4, 10, col('#3a4a7a'), 0, 12, -21); for (let i = 0; i < 6; i++) box(0.4, 0.6, 0.05, win, -4 + i * 1.6, 3.5 + (i % 2), -18.45, false); }
    else if (B === 'well') { cyl(1, 1, 0.8, 12, col('#8a8478'), 0, 0, -3.5); for (const x of [-0.8, 0.8]) box(0.12, 1.8, 0.12, dark, x, 0.8, -3.5); const r = cone(1.4, 0.8, 4, roof, 0, 2.5, -3.5, Math.PI / 4); void r; }
    else if (B === 'tree' || st.trees) { const n = B === 'tree' ? 1 : 0; if (n) board(treeCanvas(st.snow ? 'pine' : 'round', st.snow ? '#3a5a4a' : '#3a7a34'), 3, 4, 0, -3.5, 1.6, 0.15); }
    if (st.trees) for (let i = 0; i < st.trees * 5; i++) board(treeCanvas(i % 2 || st.snow ? 'pine' : 'round', st.snow ? '#3a5a4a' : '#3a6a34'), 3, 4, -22 + i * (44 / (st.trees * 5)) + hash(i, 1) * 2, -14 - hash(i, 2) * 4, 1.4 + hash(i, 3) * 0.8, 0.1);
    if (B === 'lighthouse') { cyl(1, 1.3, 9, 12, col('#f0ece4'), 10, 0, -18); cyl(1.05, 1.05, 1, 12, col('#c83a3a'), 10, 4, -18); box(1.2, 1, 1.2, glowMat('#fff2c0', 3), 10, 9, -18, false); sprite(glow.white(), 10, 9.6, -18, 6, { a: 0.7 });
      const sea = new THREE.Mesh(geo(new THREE.PlaneGeometry(100, 30, 30, 10)), keep(new THREE.MeshPhongMaterial({ color: '#16405a', emissive: '#06141e', shininess: 120, specular: '#8ab8e0', flatShading: true }))); sea.rotation.x = -Math.PI / 2; put(sea, 0, 0.04, -32, false); W.water = sea; W.waves = sea.geometry.attributes.position.array.slice();
      for (const x of [-6, 3]) { box(3, 0.6, 1.2, col('#6a4426'), x, 0, -19); box(0.12, 3, 0.12, dark, x, 0.6, -19); } }
    if (B === 'chimney') for (const x of [-8, -2, 6]) { cyl(0.7, 0.9, 10, 10, col('#5a3a30'), x, 0, -16); sprite(glow.any('rgba(255,120,40,.6)'), x, 10, -16, 3, { a: 0.6 }); flames.push({ x, y: 9, z: -15, col: '#ff7a30', power: 0.6 }); }
    if (B === 'dome') { cyl(4, 4, 4, 20, col('#e8d0a0'), 0, 0, -18); ball(4, col('#f0c060', { flatShading: false }), 0, 4, -18, 1, 0.9, 1); for (const x of [-6, 6]) { cyl(0.5, 0.6, 9, 10, col('#e8d0a0'), x, 0, -18); cone(0.8, 1.6, 10, col('#f0c060'), x, 9, -18); } board(treeCanvas('round', '#5a8a3a'), 3, 4, -5, -9, 1.1, 0.15); }
    if (B === 'peaks') for (let i = 0; i < 6; i++) { const h = 14 + hash(i, 1) * 10; cone(7, h, 6, col('#3a3634'), -30 + i * 12, 0, -40, hash(i, 2)); cone(2.8, h * 0.3, 6, col('#e8ecf4'), -30 + i * 12, h * 0.7, -40, hash(i, 2)); }
    if (B === 'pagoda') { for (let k = 0; k < 4; k++) { box(4 - k * 0.7, 1.6, 4 - k * 0.7, col('#c84a3a'), 0, k * 2, -18); box(5.4 - k * 0.8, 0.25, 5.4 - k * 0.8, roof, 0, k * 2 + 1.6, -18); } for (const x of [-2.2, 2.2]) cyl(0.18, 0.18, 3, 8, col('#c83a3a'), x, 0, -3.5); box(5.4, 0.3, 0.4, col('#2a1a1a'), 0, 3, -3.5); box(4.6, 0.2, 0.3, col('#c83a3a'), 0, 2.5, -3.5);
      for (const x of [-3, 3]) { cyl(0.05, 0.05, 1.8, 6, dark, x, 0, 0); ball(0.35, glowMat('#ff7a5a', 2), x, 2.1, 0, 1, 1.3, 1); } }
    if (B === 'temple') { box(12, 0.6, 6, col('#e8e4dc'), 0, 0, -18); for (let i = 0; i < 6; i++) cyl(0.4, 0.45, 6, 12, col('#ffffff', { flatShading: false }), -5 + i * 2, 0.6, -15.6); box(12.6, 0.8, 6.4, col('#e8e4dc'), 0, 6.6, -18); cone(7.5, 2.6, 4, col('#5a7ac8'), 0, 7.4, -18, Math.PI / 4); box(2.6, 4, 0.05, glowMat('#fffbe0', 2.4), 0, 0.6, -15, false); sprite(glow.white(), 0, 3, -14.8, 7, { a: 0.45 }); }
    sprite(glow.any('rgba(255,250,230,.5)'), 14, 18, -50, 10, { a: 0.9 });      // the moon
    W.mot = motes(st.snow ? 'snow' : style === 'forest' ? 'firefly' : style === 'industrial' ? 'ember' : 'motes', st.win, 90, [30, 7, 18]);
  }

  // ---------------------------------------------------------------- billboards for the people
  const boardGeo = new THREE.PlaneGeometry(1, 1); boardGeo.translate(0, 0.5, 0);
  const blobGeo = new THREE.PlaneGeometry(1, 0.5); blobGeo.rotateX(-Math.PI / 2);
  const spool = [];
  function spriteMesh(i) {
    if (spool[i]) return spool[i];
    const m = new THREE.Mesh(boardGeo, new THREE.MeshBasicMaterial({ alphaTest: 0.5, side: THREE.DoubleSide })); m.castShadow = true;
    m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5 });
    const blob = new THREE.Mesh(blobGeo, new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0.5 }));
    scene.add(m); scene.add(blob); return (spool[i] = { m, blob });
  }
  // a sprite: img (canvas), x/z on the ground, upp = world units per sprite pixel, foot = pixel row of the feet
  function showSprites(list, lean, tint) {
    list.forEach((s, i) => {
      const { m, blob } = spriteMesh(i), t = tex(s.img, { mip: false });
      if (m.material.map !== t) { m.material.map = t; m.customDepthMaterial.map = t; m.material.needsUpdate = m.customDepthMaterial.needsUpdate = true; }
      const w = s.img.width * s.upp, h = s.img.height * s.upp, below = (s.img.height - s.foot) * s.upp;
      m.visible = blob.visible = true; m.scale.set(w, h / Math.cos(lean * 0.8), 1); m.rotation.set(-lean, 0, 0);
      m.position.set(s.x, -below, s.z);
      const al = s.alpha == null ? 1 : s.alpha; m.material.transparent = al < 1; m.material.opacity = al; m.material.alphaTest = 0.5 * al; m.visible = true;
      const b = tint ? tint(s.x, s.z) : 1; m.material.color.setRGB(b, b, b);
      blob.position.set(s.x, 0.012, s.z); blob.scale.set(s.shadow || w * 0.6, 1, s.shadow || w * 0.6); blob.material.opacity = 0.45 * (s.alpha == null ? 1 : s.alpha);
    });
    for (let i = list.length; i < spool.length; i++) spool[i].m.visible = spool[i].blob.visible = false;
  }

  // ---------------------------------------------------------------- one frame
  let lastT = 0, cam = null, frames = 0;
  // narrow (portrait) screens see more: a wider lens, and the dungeon camera steps back
  const narrowK = () => Math.max(0, 1.3 - camera.aspect);
  const tgt = new THREE.Vector3();
  function lightFlames(t, cx, cz, dark) {
    const near = W.flames.map((f) => [Math.hypot(f.x - cx, f.z - cz), f]).sort((a, b) => a[0] - b[0]);
    pool.forEach((l, i) => { const n = near[i]; if (!n || n[0] > 16) { l.intensity = 0; return; } const f = n[1], fl = 0.85 + Math.sin(t * 13 + i * 2) * 0.08 + Math.sin(t * 23 + i) * 0.06;
      l.position.set(f.x, f.y, f.z); l.color.set(f.col); l.intensity = (dark ? 6 : 3) * fl * (f.power || 1); });
    for (const f of W.flames) if (f.sprite) { const s = f.size * (0.9 + Math.sin(t * 17 + f.x) * 0.08); f.sprite.scale.set(s, s * 1.3, 1); }
  }
  function waves(t) {
    if (!W.water || !W.waves) return;
    const P = W.water.geometry.attributes.position.array, B = W.waves;
    for (let i = 0; i < P.length; i += 3) P[i + 2] = B[i + 2] + Math.sin(B[i] * 0.4 + t * 1.3) * 0.18 + Math.cos(B[i + 1] * 0.5 + t) * 0.14;
    W.water.geometry.attributes.position.needsUpdate = true; W.water.geometry.computeVertexNormals();
  }
  function post(focus, nearW, farW, maxR, all, sat, tint) {
    const px = renderer.getPixelRatio();
    for (const p of [dofH, dofV]) Object.assign(p.uniforms.focus, { value: focus }), p.uniforms.nearW.value = nearW, p.uniforms.farW.value = farW, p.uniforms.maxR.value = maxR * px, p.uniforms.all.value = all;
    dofH.uniforms.dir.value.set(1 / canvas.width, 0); dofV.uniforms.dir.value.set(0, 1 / canvas.height);
    grade.uniforms.sat.value = sat; grade.uniforms.tint.value.set(...tint);
  }
  // st: { scene: 'dungeon' | 'arena' | 'town', t, ... }
  function render(st) {
    const dt = Math.min(0.1, Math.max(0, st.t - lastT)); lastT = st.t;
    if (st.scene === 'dungeon') {
      const fl = st.fl; if (!W || W.key !== 'dun:' + fl.id + ':' + fl.f) { buildDungeon(fl); cam = null; }
      if (!cam) cam = { x: st.hx, z: st.hz };
      const k = Math.min(1, dt * 9); cam.x += (st.hx - cam.x) * k; cam.z += (st.hz - cam.z) * k;
      const pitch = 52 * Math.PI / 180, dist = 17 + narrowK() * 4;
      tgt.set(cam.x, 0, cam.z); camera.fov = 32 + narrowK() * 12; camera.position.set(tgt.x, dist * Math.sin(pitch), tgt.z + dist * Math.cos(pitch)); camera.lookAt(tgt);
      sun.position.set(tgt.x - 8, 20, tgt.z + 10); sun.target.position.copy(tgt); sun.target.updateMatrixWorld();
      lantern.position.set(st.hx, 1.5, st.hz + 0.4); lantern.intensity = W.dark ? 7 : 0;
      lightFlames(st.t, tgt.x, tgt.z, W.dark);
      for (const c of W.chests) { const opened = st.opened(c.c); c.pivot.rotation.x = opened ? -1.9 : 0; c.gl.visible = !opened; if (!opened) c.gl.material.opacity = 0.35 + 0.15 * Math.sin(st.t * 3 + c.c.x); }
      if (W.altar) { const lit = st.cleared; W.altar.gem.material.color.set(lit ? '#9affe0' : '#ff3a52'); W.altar.gem.material.emissive.set(lit ? '#9affe0' : '#ff3a52'); W.altar.halo.material.map = lit ? glow.teal() : glow.red(); W.altar.fl.col = lit ? '#70ffd0' : '#ff4060';
        W.altar.gem.position.y = 0.95 + Math.sin(st.t * 2) * 0.06; W.altar.gem.rotation.y = st.t; }
      const tint = (x, z) => { if (!W.dark) return 1; let b = 0.32 + Math.max(0, 1 - Math.hypot(x - st.hx, z - st.hz) / 6.5) * 0.8; for (const f of W.flames) b += Math.max(0, 1 - Math.hypot(x - f.x, z - f.z) / 4) * 0.5; return Math.min(1.05, b); };
      showSprites(st.sprites, 0.42, tint);
      moveMotes(W.mot, st.t, tgt.x, tgt.z);
      post(0.5, 0.34, 0.3, 4.5, 0, 1.1, [1.04, 1.0, 0.96]);
      bloom.strength = W.dark ? 0.7 : 0.45; bloom.threshold = 0.78;
    } else if (st.scene === 'arena') {
      if (!W || W.key !== 'arena:' + st.theme + (st.title ? ':t' : '')) buildArena(st.theme, 'arena:' + st.theme + (st.title ? ':t' : ''));
      const t = st.t, sway = st.title ? Math.sin(t * 0.08) * 3 : Math.sin(t * 0.09) * 0.8;
      camera.fov = (st.title ? 42 : 38) + narrowK() * 30; camera.position.set(sway, st.title ? 4.2 : 3.4, st.title ? 15 : 12.5); camera.lookAt(sway * 0.3, st.title ? 3.2 : 1.2, -3);
      sun.position.set(-10, 18, 8); sun.target.position.set(0, 0, -2); sun.target.updateMatrixWorld();
      lightFlames(t, 0, -4, false); waves(t);
      for (const c of W.dyn) { c.rotation.y = t * 0.4 + c.position.x; c.position.y += Math.sin(t + c.position.x) * 0.004; }
      showSprites([], 0, null); moveMotes(W.mot, t, 0, -4);
      post(st.title ? 0.42 : 0.4, 0.5, st.title ? 0.22 : 0.26, st.title ? 5 : 4, 0, 1.08, [1.03, 1.0, 0.97]);
      bloom.strength = 0.6; bloom.threshold = 0.8;
    } else if (st.scene === 'town') {
      if (!W || W.key !== 'town:' + st.style) buildTown(st.style);
      const t = st.t, sway = Math.sin(t * 0.07) * 1.2;
      camera.fov = 40 + narrowK() * 30; camera.position.set(sway, 4.2, 13); camera.lookAt(sway * 0.3, 2.4, -4);
      sun.position.set(12, 20, 6); sun.target.position.set(0, 0, -4); sun.target.updateMatrixWorld();
      lightFlames(t, 0, -2, false); waves(t);
      showSprites([], 0, null); moveMotes(W.mot, t, 0, -4);
      post(0.5, 0.45, 0.22, 4.5, 0, 1.06, [0.98, 0.98, 1.05]);
      bloom.strength = 0.55; bloom.threshold = 0.8;
    }
    camera.updateProjectionMatrix();
    composer.render(dt); frames++;
  }
  function resize(w, h, dpr) { renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); composer.setPixelRatio(dpr); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  return { render, resize, heroCanvas, monCanvas, get frames() { return frames; } };
}
export { heroCanvas, monCanvas };
