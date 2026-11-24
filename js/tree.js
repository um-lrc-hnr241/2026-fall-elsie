// =============================================================
//  3D Tree of Knowledge — home page (illustrated, Arts & Crafts style)
//  Apples come from js/apples.js (edit labels and links there).
// =============================================================
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { paintLandscape, paintGlass, glassLandscape, paintMillefleur, finish } from "./looks.js?v=8";

// Which look to use: "illustrated" (home page), "stained", "engraving" or "tapestry"
const STYLE = window.STYLE || "illustrated";

const EARTH = window.EARTH_APPLE;
const APPLES = window.APPLES;

// ---------- Seeded random so the tree looks the same every visit ----------
let seed = 11;
let seed2 = 99; // second random stream, for scenery
const rand2 = () => {
  seed2 = (seed2 * 16807) % 2147483647;
  return (seed2 - 1) / 2147483646;
};
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const randUnit = () => {
  const u = rand() * 2 - 1, th = rand() * Math.PI * 2, s = Math.sqrt(1 - u * u);
  return new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th));
};
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

// ---------- Colors (edit to restyle) ----------
const C = {
  ink: "#23241a",
  bark: "#7f8d6c",
  hill: "#6f6a3c",
  apple: "#cf3b26",
  serpent: "#6e8a52",
  leaves: ["#7aa58a", "#6a9a7e", "#86ad8f", "#5f8f78"],
  stars: ["#ffffff", "#e6dcff", "#d6ccf2"],
  berries: ["#e8692f", "#f08d3a", "#d9482b"],
};
// Per-style color changes and outline settings
const LOOK = {
  illustrated: { ink: 1, inkColor: [0.12, 0.125, 0.085] },
  engraving: { ink: 1.3, inkColor: [0.08, 0.07, 0.06] },
  stained: {
    ink: 2.2, inkColor: [0.04, 0.04, 0.05],
    colors: { bark: "#8a5a32", apple: "#d4202a", serpent: "#2f9a3e",
      leaves: ["#2f9a4a", "#3fb35a", "#1f7a3a", "#5cc06a"], berries: ["#f0b030", "#e8692f", "#d4202a"] },
  },
  tapestry: {
    ink: 0.7, inkColor: [0.17, 0.12, 0.08],
    colors: { bark: "#b8a26a", apple: "#b8322a", serpent: "#5f7a3e",
      leaves: ["#5d7a45", "#4b6b3e", "#6e8b4e", "#3f5c3a"], berries: ["#c8352a", "#d8503a", "#e8873a"] },
  },
}[STYLE];
Object.assign(C, LOOK.colors || {});

// ---------- Basic setup ----------
const container = document.getElementById("scene");
const labelLayer = document.getElementById("labels");

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 200);
const TARGET = V(0, 6.3, 0);
const FIT = { half: 6.9, wide: 5.9 }; // updated once the tree is grown

function fitDistance() {
  const aspect = window.innerWidth / window.innerHeight;
  const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  return Math.max(FIT.half / halfH, FIT.wide / (halfH * aspect)); // fit tree height, or canopy width on narrow screens
}
let baseDist = fitDistance();
const startPos = V(0, 11, baseDist * 1.7);
camera.position.copy(startPos);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(TARGET);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.rotateSpeed = 0.6;
controls.minPolarAngle = 0.95;
controls.maxPolarAngle = 1.5;
controls.minAzimuthAngle = -0.9;
controls.maxAzimuthAngle = 0.9;
controls.enabled = false;
function setZoomLimits() {
  controls.minDistance = baseDist * 0.6;
  controls.maxDistance = baseDist * 1.3;
}
setZoomLimits();

// ---------- Lights ----------
scene.add(new THREE.HemisphereLight(0xfffaf0, 0x8a8560, 1.7));
const sun = new THREE.DirectionalLight(0xffffff, 1.9);
sun.position.set(5, 10, 8);
scene.add(sun);

// ---------- Illustrated look: 3-tone shading + ink outlines ----------
const ramp = new THREE.DataTexture(new Uint8Array([105, 185, 255]), 3, 1, THREE.RedFormat);
ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
ramp.needsUpdate = true;
// Woven-cloth texture used on every solid surface in the tapestry style
let weaveTex = null;
function toon(color, extra = {}) {
  if (STYLE === "tapestry") {
    if (!weaveTex) {
      weaveTex = canvasTex(128, 128, (ctx) => { ctx.fillStyle = "#ece6d6"; ctx.fillRect(0, 0, 128, 128); });
      weaveTex.wrapS = weaveTex.wrapT = THREE.RepeatWrapping;
      weaveTex.repeat.set(4, 4);
    }
    return new THREE.MeshLambertMaterial({ color, map: weaveTex, ...extra });
  }
  const m = new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...extra });
  if (STYLE === "stained") { // glass glows with its own color
    if (extra.map) { m.emissive.set("#ffffff"); m.emissiveMap = extra.map; m.emissiveIntensity = 0.18; }
    else m.emissive.set(color).multiplyScalar(0.4);
  }
  return m;
}

const inkCache = new Map();
function inkMat(thick) {
  if (!inkCache.has(thick)) {
    inkCache.set(thick, new THREE.ShaderMaterial({
      uniforms: { thick: { value: thick * LOOK.ink } },
      vertexShader: `
        uniform float thick;
        void main() {
          vec4 p = vec4(position + normal * thick, 1.0);
          #ifdef USE_INSTANCING
            p = instanceMatrix * p;
          #endif
          gl_Position = projectionMatrix * modelViewMatrix * p;
        }`,
      fragmentShader: `void main() { gl_FragColor = vec4(${LOOK.inkColor.map((v) => v.toFixed(3)).join(",")}, 1.0); }`,
      side: THREE.BackSide,
    }));
  }
  return inkCache.get(thick);
}
// A mesh plus its ink outline
function inked(geo, mat, thick, parent) {
  const m = new THREE.Mesh(geo, mat);
  m.add(new THREE.Mesh(geo, inkMat(thick)));
  parent.add(m);
  return m;
}

// ---------- Hand-drawn textures (drawn in code) ----------
function canvasTex(w, h, draw, { finished = true } = {}) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.lineJoin = ctx.lineCap = "round";
  draw(ctx, w, h);
  if (finished) finish(STYLE, ctx, w, h, rand2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function leafPath(ctx, cx, base, tip, half) {
  const L = [], R = [];
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = base - t * (base - tip);
    const w = Math.sin(Math.PI * Math.pow(t, 0.75)) * half;
    const tooth = i % 2 && t > 0.15 && t < 0.9 ? half * 0.12 : 0; // serrated edge
    L.push([cx - w - tooth, y]);
    R.push([cx + w + tooth, y]);
  }
  ctx.beginPath();
  ctx.moveTo(cx, base);
  L.forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(cx, tip);
  R.reverse().forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath();
}

const leafTex = canvasTex(110, 200, (ctx) => {
  leafPath(ctx, 55, 192, 6, 44);
  ctx.fillStyle = "#c9d6c4"; ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.stroke();
  ctx.strokeStyle = "#f4f1df"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(55, 190); ctx.quadraticCurveTo(52, 100, 55, 18); ctx.stroke();
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const y = 160 - i * 28;
    ctx.beginPath(); ctx.moveTo(54, y); ctx.lineTo(30, y - 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(56, y); ctx.lineTo(80, y - 22); ctx.stroke();
  }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(55, 192); ctx.lineTo(55, 200); ctx.stroke();
});

function starPath(ctx, cx, cy, outer, inner, points = 5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

const starTex = canvasTex(128, 128, (ctx) => {
  starPath(ctx, 64, 66, 58, 22);
  ctx.fillStyle = "#8f74c0"; ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.stroke();
  starPath(ctx, 64, 66, 30, 12);
  ctx.fillStyle = "#b9a4e0"; ctx.fill();
  ctx.beginPath(); ctx.arc(64, 66, 9, 0, 7);
  ctx.fillStyle = "#f2c14e"; ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
});

// Flowers on the hill (flat cut-outs that always face you)
function plantTex(kind, color) {
  return canvasTex(128, 256, (ctx) => {
    const ink = (w) => { ctx.strokeStyle = C.ink; ctx.lineWidth = w; ctx.stroke(); };
    // stem
    ctx.beginPath(); ctx.moveTo(64, 256); ctx.quadraticCurveTo(58, 170, 64, 92);
    ink(9); ctx.strokeStyle = "#4f7a55"; ctx.lineWidth = 4; ctx.stroke();
    // two leaves
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(62, 215); ctx.rotate(s * 0.75);
      leafPath(ctx, 0, 0, -78, 15);
      ctx.fillStyle = "#5f8b6a"; ctx.fill(); ink(4);
      ctx.restore();
    }
    // flower head
    if (kind === "tulip") {
      ctx.beginPath();
      ctx.moveTo(38, 52); ctx.lineTo(50, 66); ctx.lineTo(64, 40); ctx.lineTo(78, 66); ctx.lineTo(90, 52);
      ctx.quadraticCurveTo(94, 100, 64, 104); ctx.quadraticCurveTo(34, 100, 38, 52);
      ctx.fillStyle = color; ctx.fill(); ink(5);
      ctx.beginPath(); ctx.moveTo(64, 48); ctx.quadraticCurveTo(58, 80, 64, 102); ink(3);
    } else if (kind === "daisy") {
      for (let i = 0; i < 12; i++) {
        ctx.save(); ctx.translate(64, 70); ctx.rotate((i / 12) * Math.PI * 2);
        ctx.beginPath(); ctx.ellipse(0, -24, 8, 18, 0, 0, 7);
        ctx.fillStyle = color; ctx.fill(); ink(3.5);
        ctx.restore();
      }
      ctx.beginPath(); ctx.arc(64, 70, 13, 0, 7); ctx.fillStyle = "#c4622d"; ctx.fill(); ink(4);
    } else {
      starPath(ctx, 64, 66, 44, 17);
      ctx.fillStyle = color; ctx.fill(); ink(5);
      ctx.beginPath(); ctx.arc(64, 66, 8, 0, 7); ctx.fillStyle = "#f2c14e"; ctx.fill(); ink(3);
    }
  });
}

function earthTex() {
  return canvasTex(512, 256, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    const waves = [];
    for (let i = 0; i < 9; i++) {
      waves.push({ k: randUnit().multiplyScalar(2 + rand() * 5), ph: rand() * 6.28, amp: 1 / (1 + i * 0.5) });
    }
    const v = new THREE.Vector3();
    for (let y = 0; y < h; y++) {
      const lat = (0.5 - y / h) * Math.PI;
      for (let x = 0; x < w; x++) {
        const lon = (x / w) * Math.PI * 2;
        v.set(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon));
        let n = 0;
        for (const wv of waves) n += Math.sin(v.dot(wv.k) + wv.ph) * wv.amp;
        let c;
        if (Math.abs(n - 0.2) < 0.05) c = [110, 78, 20];            // dark gold coastline
        else if (n > 0.2) c = n > 0.95 ? [255, 226, 130] : [246, 204, 92]; // land: bright gold
        else c = n > -0.1 ? [214, 165, 52] : [190, 140, 38];       // sea: deeper gold
        const i = (y * w + x) * 4;
        img.data.set([c[0], c[1], c[2], 255], i);
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}

// ---------- Painted sky and distant landscape (a big backdrop around everything) ----------
{
  const W = 4096, H = 1024, BR = 40;
  const BH = (2 * Math.PI * BR * H) / W;  // keeps the painting's proportions
  const yTop = BH - 12;
  const toCanvas = (y) => ((yTop - y) / BH) * H;
  let floorColor = "#7d9969";
  const tex = canvasTex(W, H, (ctx) => {
    if (STYLE === "stained") {
      paintGlass(ctx, W, H, rand2, glassLandscape(W, toCanvas, rand2));
      floorColor = "#24622f";
    } else if (STYLE === "tapestry") {
      paintMillefleur(ctx, W, H, rand2, 15000);
      finish("tapestry", ctx, W, H, rand2);
      floorColor = "#1e2c1d";
    } else {
      floorColor = paintLandscape(ctx, W, H, toCanvas, rand2);
      if (STYLE === "engraving") finish("engraving", ctx, W, H, rand2);
    }
  }, { finished: false });
  const backdrop = new THREE.Mesh(
    new THREE.CylinderGeometry(BR, BR, BH, 96, 1, true),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide })
  );
  backdrop.position.y = yTop - BH / 2;
  scene.add(backdrop);
  // the ground out to the horizon, patterned to match the style
  let floorTex = null;
  if (STYLE === "stained") {
    const pick = (a) => a[Math.floor(rand2() * a.length)];
    floorTex = canvasTex(1024, 1024, (ctx, w, h) => paintGlass(ctx, w, h, rand2,
      () => (rand2() < 0.06 ? pick(["#d4202a", "#f0b030"]) : pick(["#2f7a3a", "#3d9447", "#24622f", "#5aa83a"])), 64, 4), { finished: false });
  } else if (STYLE === "tapestry") {
    floorTex = canvasTex(1024, 1024, (ctx, w, h) => paintMillefleur(ctx, w, h, rand2, 3000));
  } else if (STYLE === "engraving") {
    floorTex = canvasTex(256, 256, (ctx, w, h) => { ctx.fillStyle = floorColor; ctx.fillRect(0, 0, w, h); });
  }
  if (floorTex) { floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(10, 10); }
  const floor = new THREE.Mesh(new THREE.CircleGeometry(BR, 64),
    new THREE.MeshBasicMaterial(floorTex ? { map: floorTex } : { color: floorColor }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.03;
  scene.add(floor);
}

// ---------- The hill ----------
const HILL_R = 7, HILL_H = 1.5;
const hillY = (r) => HILL_H * Math.sqrt(Math.max(0, 1 - (r * r) / (HILL_R * HILL_R)));
{
  const g = new THREE.SphereGeometry(1, 72, 24, 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(HILL_R, HILL_H, HILL_R);
  let tex;
  if (STYLE === "tapestry") {
    tex = canvasTex(2048, 512, (ctx, w, h) => paintMillefleur(ctx, w, h, rand2, 6000, true));
  } else if (STYLE === "stained") {
    const pick = (a) => a[Math.floor(rand2() * a.length)];
    tex = canvasTex(1024, 512, (ctx, w, h) => paintGlass(ctx, w, h, rand2,
      () => (rand2() < 0.08 ? pick(["#d4202a", "#f0b030", "#8a5ac8"]) : pick(["#2f7a3a", "#3d9447", "#5aa83a", "#7a8a2a", "#24622f"])), 34, 3), { finished: false });
  }
  if (tex) { for (let i = 0; i < 15000; i++) rand(); } // keep the tree's shape the same in every style
  else tex = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = C.hill; ctx.fillRect(0, 0, w, h);
    const dots = ["#5e5a31", "#7d7745", "#857f4b", "#5a5a35"];
    for (let i = 0; i < 5000; i++) {
      ctx.fillStyle = dots[i % 4];
      ctx.beginPath(); ctx.arc(rand() * w, rand() * h, 1 + rand() * 2, 0, 7); ctx.fill();
    }
  });
  inked(g, toon("#ffffff", { map: tex }), 0.05, scene);
}

// Flowers scattered on the hill
{
  const kinds = [
    ["tulip", "#3f5fa6"], ["tulip", "#e2893a"], ["tulip", "#8a6aa8"],
    ["daisy", "#e9b33a"], ["daisy", "#f3e7c9"], ["star", "#8f74c0"], ["star", "#d0553a"],
  ].map(([k, c]) => new THREE.SpriteMaterial({ map: plantTex(k, c), alphaTest: 0.5 }));
  for (let i = 0; i < 55; i++) {
    const r = 1.4 + Math.sqrt(rand()) * (HILL_R - 1.9);
    const a = rand() * Math.PI * 2;
    const s = 0.4 + rand() * 0.4;
    const sp = new THREE.Sprite(kinds[Math.floor(rand() * kinds.length)]);
    sp.center.set(0.5, 0);
    sp.scale.set(0.6 * s, 1.2 * s, 1);
    sp.position.set(Math.cos(a) * r, hillY(r) - 0.06, Math.sin(a) * r);
    scene.add(sp);
  }
}

// ---------- The tree ----------
const tree = new THREE.Group();
scene.add(tree);
const barkMat = toon(C.bark);

// A tube that gets thinner along its length
function taperTube(curve, r0, r1, segs = 28, radial = 8) {
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const c = curve.getPointAt(i / segs);
    const r = r0 + (r1 - r0) * (i / segs);
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, idx).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

// Trunk
const TRUNK_BASE = HILL_H - 0.2, TRUNK_TOP = HILL_H + 3.0;
const trunkR = (y) => THREE.MathUtils.lerp(0.7, 0.4, THREE.MathUtils.clamp((y - TRUNK_BASE) / (TRUNK_TOP - TRUNK_BASE), 0, 1));
const trunkTop = V(0.04, TRUNK_TOP, 0);
inked(taperTube(new THREE.CatmullRomCurve3([
  V(0, TRUNK_BASE, 0), V(0.08, TRUNK_BASE + 0.9, 0.02), V(-0.06, TRUNK_BASE + 1.8, -0.03), trunkTop,
]), 0.7, 0.4, 24, 12), barkMat, 0.035, tree);
inked(new THREE.SphereGeometry(0.41, 16, 12), barkMat, 0.035, tree).position.copy(trunkTop);

// Roots
for (let k = 0; k < 6; k++) {
  const a = (k / 6) * Math.PI * 2 + 0.4;
  const end = V(Math.cos(a) * 1.5, hillY(1.5) - 0.08, Math.sin(a) * 1.5);
  const mid = V(Math.cos(a) * 0.75, HILL_H + 0.1, Math.sin(a) * 0.75);
  inked(taperTube(new THREE.CatmullRomCurve3([V(0, HILL_H + 0.5, 0), mid, end]), 0.32, 0.05, 16, 8), barkMat, 0.03, tree);
}

// Curling, scroll-like branches
const samples = []; // points along branches, used to place leaves/flowers/apples
const STRETCH = 1.35; // how much taller the crown is than it is wide
const stretch = (p) => V(p.x, trunkTop.y + (p.y - trunkTop.y) * STRETCH, p.z);
function grow(start, dir, len, r0, depth, curl) {
  const d = dir.clone().normalize();
  const axis = new THREE.Vector3().crossVectors(d, UP);
  if (axis.lengthSq() < 1e-4) axis.set(1, 0, 0);
  axis.normalize().applyAxisAngle(d, (rand() - 0.5) * 0.9);
  const n = 14;
  const pts = [start.clone()];
  let p = start.clone();
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    d.applyAxisAngle(axis, (curl * 3 * k * k) / n); // curl tighter toward the tip
    p = p.clone().addScaledVector(d, (len / n) * (1 - 0.45 * k));
    pts.push(p);
  }
  const curve = new THREE.CatmullRomCurve3(pts);                 // branch layout
  const shown = new THREE.CatmullRomCurve3(pts.map(stretch));   // what you see: taller
  const r1 = Math.max(0.03, r0 * 0.18);
  inked(taperTube(shown, r0, r1), barkMat, 0.025, tree);
  for (let t = 0.2; t <= 1.0001; t += 0.05) {
    const tt = Math.min(t, 1);
    samples.push({ p: shown.getPointAt(tt), tan: shown.getTangentAt(tt), r: r0 + (r1 - r0) * tt, depth, t: tt });
  }
  if (depth > 0) {
    const kids = depth === 2 ? 4 : 2;
    for (let c = 0; c < kids; c++) {
      const t = 0.28 + c * (0.5 / kids) + rand() * 0.08;
      const tan = curve.getTangentAt(t);
      const side = new THREE.Vector3().crossVectors(tan, randUnit()).normalize();
      const nd = tan.clone().applyAxisAngle(side, 0.6 + rand() * 0.5);
      nd.y += 0.15;
      grow(curve.getPointAt(t), nd, len * (0.5 + rand() * 0.15), (r0 + (r1 - r0) * t) * 0.75,
        depth - 1, (rand() < 0.5 ? -1 : 1) * (1.4 + rand() * 1.4));
    }
  }
}
for (let k = 0; k < 7; k++) {
  const a = (k / 7) * Math.PI * 2 + rand() * 0.3;
  grow(trunkTop, V(Math.cos(a) * 1.15, 0.7, Math.sin(a) * 0.75), 6.2 + rand() * 0.6, 0.34, 2, -(0.8 + rand() * 0.5));
}
grow(trunkTop, V(0.05, 1, -0.25), 3.2, 0.3, 2, 1.1);

// Canopy bounds
const box = new THREE.Box3();
samples.forEach((s) => box.expandByPoint(s.p));
const CANOPY = box.getCenter(new THREE.Vector3());
const RAD = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);

// Frame the camera around the whole tree, leaving room for the title
{
  const top = box.max.y + 0.7, bottom = -0.6;
  FIT.half = (top - bottom) / 0.8 / 2;
  FIT.wide = RAD.x + 1.3;
  TARGET.y = bottom + FIT.half;
  controls.target.copy(TARGET);
  baseDist = fitDistance();
  startPos.set(0, TARGET.y + 5, baseDist * 1.7);
  camera.position.copy(startPos);
  setZoomLimits();
}

// Leaf positions (built into one mesh later)
let leaves = [];
for (const s of samples) {
  if (s.depth === 2 && s.t < 0.35) continue;
  const count = s.depth === 0 ? 5 : 4;
  for (let i = 0; i < count; i++) {
    const v = randUnit();
    const off = v.sub(s.tan.clone().multiplyScalar(v.dot(s.tan))).normalize();
    const base = s.p.clone().addScaledVector(off, s.r * 0.8);
    const out = off.clone().addScaledVector(s.tan, 0.5).add(randUnit().multiplyScalar(0.35)).normalize();
    const size = 0.58 + rand() * 0.3;
    leaves.push({ base, out, size, center: base.clone().addScaledVector(out, size * 0.5), twist: rand() * Math.PI });
  }
}

// ---------- Apples ----------
function makeAppleGeometry() {
  const g = new THREE.SphereGeometry(1, 48, 32);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r2 = x * x + z * z;
    if (y > 0) y -= 0.32 * Math.exp(-r2 / 0.035);
    else y += 0.18 * Math.exp(-r2 / 0.03);
    const widen = 1 + 0.07 * y;
    p.setXYZ(i, x * widen, y * 0.9, z * widen);
  }
  g.computeVertexNormals();
  return g;
}
const appleGeo = makeAppleGeometry();
const stemGeo = new THREE.CylinderGeometry(0.04, 0.055, 0.42, 6);
const stemMat = toon("#5a4a2c");
const appleLeafGeo = new THREE.PlaneGeometry(0.33, 0.6).translate(0, 0.3, 0);
const appleLeafMat = toon("#6a9a7e", { map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide });
const hitMat = new THREE.MeshBasicMaterial({ visible: false });

const clickable = [];
const apples = [];

function nearSomething(pos, leafGap, branchGap) {
  if (leaves.some((l) => l.center.distanceTo(pos) < leafGap)) return true;
  return samples.some((s) => s.p.distanceTo(pos) < branchGap + s.r);
}

function twig(from, to) {
  const mid = from.clone().lerp(to, 0.5).add(V(0, 0.08, 0));
  inked(taperTube(new THREE.CatmullRomCurve3([to, mid, from]), 0.05, 0.03, 10, 6), barkMat, 0.02, tree);
}

function makeApple({ item, radius, material, position, isEarth = false, ink }) {
  const group = new THREE.Group();
  group.position.copy(position);
  const body = inked(appleGeo, material, ink, group);
  const stem = inked(stemGeo, stemMat, 0.05, body);
  stem.position.y = 0.78; stem.rotation.z = 0.25;
  const leaf = new THREE.Mesh(appleLeafGeo, appleLeafMat);
  leaf.position.set(0.05, 0.85, 0); leaf.rotation.set(0.3, 0, -1.0);
  body.add(leaf);
  group.scale.setScalar(radius);

  const hit = new THREE.Mesh(new THREE.SphereGeometry(1.35, 12, 8), hitMat);
  group.add(hit);

  const label = document.createElement("div");
  label.className = "apple-label" + (isEarth ? " earth" : "");
  label.textContent = item.label;
  labelLayer.appendChild(label);

  // a little twig up to the nearest branch
  const top = position.clone().add(V(0, radius * 0.95, 0));
  let best = null;
  for (const s of samples) {
    if (s.p.y < top.y) continue;
    if (!best || s.p.distanceTo(top) < best.p.distanceTo(top)) best = s;
  }
  if (best && best.p.distanceTo(top) < 1.6) twig(top, best.p);

  const apple = { item, group, body, material, label, radius, isEarth, hover: 0, phase: rand() * 6.28, glow: material.emissive.clone() };
  hit.userData.apple = apple;
  clickable.push(hit);
  apples.push(apple);
  tree.add(group);
  return apple;
}

// Position inside the canopy, measured so 1 = the canopy's edge
const inner = (p) => V((p.x - CANOPY.x) / RAD.x, (p.y - CANOPY.y) / RAD.y, (p.z - CANOPY.z) / RAD.z);

// Clear leaves around an apple and in front of it, so it peeks out of the foliage
const VIEW = V(0, TARGET.y + 0.8, baseDist); // where the camera rests
function blocksView(p, pos, r) {
  if (p.distanceTo(pos) < r + 0.3) return true;
  const dir = VIEW.clone().sub(pos).normalize();
  const t = p.clone().sub(pos).dot(dir);
  return t > 0 && p.distanceTo(pos.clone().addScaledVector(dir, t)) < r + 0.35;
}
function clearAround(pos, r) {
  leaves = leaves.filter((l) => !blocksView(l.center, pos, r) && !blocksView(l.base, pos, r));
}

// The golden Earth apple, in the middle of the tree
const EARTH_R = 0.75;
const earthPos = V(0, CANOPY.y - RAD.y * 0.22, CANOPY.z + RAD.z * 0.5);
for (let k = 0; k < 40 && samples.some((s) => s.p.distanceTo(earthPos) < EARTH_R + s.r + 0.05); k++) earthPos.z += 0.05;
makeApple({
  item: EARTH, radius: EARTH_R, position: earthPos, isEarth: true, ink: 0.05,
  material: toon("#ffffff", { map: earthTex(), emissive: new THREE.Color("#3a2a00") }),
});
clearAround(earthPos, EARTH_R);

// The small apples hang from branches, spread across the front of the crown
const APPLE_R = 0.38;
const applePositions = [];
APPLES.forEach((item, i) => {
  // evenly spaced on an arc around the Earth: lower-left, over the top, to lower-right
  const n = APPLES.length;
  const phi = THREE.MathUtils.degToRad(n === 1 ? 90 : 205 - i * (230 / (n - 1)));
  const nx = Math.cos(phi) * 0.64, ny = -0.12 + Math.sin(phi) * 0.6;
  const nz = Math.sqrt(Math.max(0.05, 0.85 * 0.85 - nx * nx - ny * ny)); // just inside the leafy edge
  let best = CANOPY.clone().add(V(nx * RAD.x, ny * RAD.y, nz * RAD.z));
  for (let k = 0; k < 30 && samples.some((s) => s.p.distanceTo(best) < APPLE_R + s.r + 0.03); k++) best.z += 0.05;
  applePositions.push(best);
  makeApple({ item, radius: APPLE_R, material: toon(C.apple), position: best, ink: 0.08 });
  clearAround(best, APPLE_R);
});

// Build all leaves as one mesh (fast)
{
  const geo = new THREE.PlaneGeometry(0.55, 1).translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(geo,
    toon("#ffffff", { map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide }), leaves.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), tw = new THREE.Quaternion(), c = new THREE.Color();
  leaves.forEach((l, i) => {
    q.setFromUnitVectors(UP, l.out).multiply(tw.setFromAxisAngle(UP, l.twist));
    m.compose(l.base, q, V(l.size, l.size, l.size));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.set(C.leaves[i % C.leaves.length]));
  });
  tree.add(mesh);
}

// Purple star flowers and orange berries in the branches
{
  const keepClear = (p) =>
    !blocksView(p, earthPos, EARTH_R + 0.1) && applePositions.every((a) => !blocksView(p, a, APPLE_R + 0.1));
  const tips = samples.filter((s) => s.depth === 0 && s.t > 0.55);

  const stars = [];
  const berries = [];
  for (let i = 0; i < 44; i++) {
    const s = tips[Math.floor(rand() * tips.length)];
    const isBerry = i % 3 === 0;
    const count = isBerry ? 5 + Math.floor(rand() * 4) : 4 + Math.floor(rand() * 3);
    for (let j = 0; j < count; j++) {
      const p = s.p.clone().add(randUnit().multiplyScalar(isBerry ? 0.22 : 0.35));
      if (!keepClear(p)) continue;
      (isBerry ? berries : stars).push({ p, out: p.clone().sub(s.p).normalize() });
    }
  }

  const starMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.46, 0.46),
    new THREE.MeshBasicMaterial({ map: starTex, alphaTest: 0.5, side: THREE.DoubleSide }), stars.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  stars.forEach((f, i) => {
    q.setFromUnitVectors(V(0, 0, 1), f.out);
    m.compose(f.p, q, V(1, 1, 1));
    starMesh.setMatrixAt(i, m);
    starMesh.setColorAt(i, c.set(C.stars[i % C.stars.length]));
  });
  tree.add(starMesh);

  const bGeo = new THREE.SphereGeometry(0.09, 12, 8);
  const bMesh = new THREE.InstancedMesh(bGeo, toon("#ffffff"), berries.length);
  const bInk = new THREE.InstancedMesh(bGeo, inkMat(0.022), berries.length);
  berries.forEach((b, i) => {
    m.makeTranslation(b.p.x, b.p.y, b.p.z);
    bMesh.setMatrixAt(i, m);
    bInk.setMatrixAt(i, m);
    bMesh.setColorAt(i, c.set(C.berries[i % C.berries.length]));
  });
  tree.add(bMesh, bInk);
}

// ---------- The serpent, coiled around the trunk ----------
const tongue = new THREE.Group();
{
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const a = t * 2.25 * Math.PI * 2 + Math.PI;
    const y = HILL_H + 0.2 + t * 2.4;
    const r = trunkR(y) + 0.12;
    pts.push(V(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  const last = pts[pts.length - 1];
  pts.push(last.clone().add(V(0.15, 0.18, 0.3)), last.clone().add(V(0.3, 0.32, 0.62)));
  const curve = new THREE.CatmullRomCurve3(pts);
  const snakeMat = toon(C.serpent);
  inked(taperTube(curve, 0.035, 0.12, 120, 10), snakeMat, 0.025, tree);

  const tan = curve.getTangentAt(1);
  const head = new THREE.Group();
  head.position.copy(curve.getPointAt(1)).addScaledVector(tan, 0.1);
  head.quaternion.setFromUnitVectors(V(0, 0, 1), tan);
  const skull = inked(new THREE.SphereGeometry(1, 20, 14), snakeMat, 0.012, head);
  skull.scale.set(0.15, 0.1, 0.24);
  const eyeMat = new THREE.MeshBasicMaterial({ color: C.ink });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), eyeMat);
    eye.position.set(s * 0.1, 0.06, 0.08);
    head.add(eye);
  }
  const tMat = new THREE.MeshBasicMaterial({ color: "#c8352a" });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 5), tMat);
  base.rotation.x = Math.PI / 2; base.position.z = 0.07;
  tongue.add(base);
  for (const s of [-1, 1]) {
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.08, 5), tMat);
    fork.rotation.set(Math.PI / 2, 0, 0);
    fork.position.set(s * 0.015, 0, 0.17);
    fork.rotation.y = s * 0.4;
    tongue.add(fork);
  }
  tongue.position.set(0, -0.02, 0.22);
  head.add(tongue);
  tree.add(head);
}

// ---------- Animals (same ink-and-toon style) ----------
const ball = new THREE.SphereGeometry(1, 20, 14);
// An outlined ellipsoid: size = [x, y, z] radii
function part(parent, color, size, pos, rot = [0, 0, 0], ink = 0.06) {
  const m = inked(ball, typeof color === "string" ? toon(color) : color, ink, parent);
  m.scale.set(...size);
  m.position.set(...pos);
  m.rotation.set(...rot);
  return m;
}
function tube(parent, mat, pts, r0, r1, ink = 0.025) {
  return inked(taperTube(new THREE.CatmullRomCurve3(pts.map((p) => V(...p))), r0, r1, 20, 8), mat, ink, parent);
}
// Stand something on the hill, facing a direction (angle in radians)
function placeOnHill(obj, r, angle, facing) {
  obj.position.set(Math.cos(angle) * r, hillY(r), Math.sin(angle) * r);
  obj.rotation.y = facing;
  scene.add(obj);
}

// A white horse
{
  const horse = new THREE.Group();
  const white = toon("#f6f1e6"), cream = toon("#e6dcc4"), hoof = toon("#5b5548");
  part(horse, white, [0.72, 0.36, 0.32], [0, 1.05, 0]);
  part(horse, white, [0.36, 0.36, 0.3], [0.48, 1.08, 0]);
  part(horse, white, [0.38, 0.38, 0.31], [-0.48, 1.06, 0]);
  for (const [x, z, bend] of [[0.5, 0.15, 0.06], [0.5, -0.15, -0.04], [-0.52, 0.15, -0.08], [-0.52, -0.15, 0.05]]) {
    tube(horse, white, [[x, 0.95, z], [x + bend, 0.5, z], [x, 0.08, z]], 0.11, 0.07);
    inked(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 10), hoof, 0.02, horse).position.set(x, 0.05, z);
  }
  tube(horse, white, [[0.55, 1.15, 0], [0.8, 1.5, 0], [0.98, 1.78, 0]], 0.24, 0.15);       // neck
  part(horse, white, [0.34, 0.15, 0.14], [1.16, 1.72, 0], [0, 0, -0.75]);                 // head
  part(horse, white, [0.05, 0.12, 0.04], [1.0, 1.98, 0.07], [0.2, 0, -0.2], 0.03);         // ears
  part(horse, white, [0.05, 0.12, 0.04], [1.0, 1.98, -0.07], [-0.2, 0, -0.2], 0.03);
  for (let i = 0; i < 6; i++) {                                                            // mane
    const t = i / 5;
    part(horse, cream, [0.14, 0.07, 0.06], [0.62 + t * 0.36, 1.35 + t * 0.5, 0], [0, 0, 0.9 - t * 0.3], 0.03);
  }
  tube(horse, cream, [[-0.85, 1.18, 0], [-1.05, 0.95, 0], [-1.08, 0.5, 0]], 0.09, 0.04);  // tail
  part(horse, toon(C.ink), [0.03, 0.03, 0.03], [1.12, 1.82, 0.11], [0, 0, 0], 0.001);      // eyes
  part(horse, toon(C.ink), [0.03, 0.03, 0.03], [1.12, 1.82, -0.11], [0, 0, 0], 0.001);
  horse.scale.setScalar(0.85);
  placeOnHill(horse, 3.6, 0.55, -2.2);
}

// A majestic swan on a little pond
{
  const angle = 2.35, r = 4.4;
  const pond = inked(new THREE.CylinderGeometry(1, 1, 0.05, 48), toon("#7fa4b8"), 0.04, scene);
  pond.scale.set(1.5, 1, 1.05);
  const pp = V(Math.cos(angle) * r, hillY(r) + 0.02, Math.sin(angle) * r);
  pond.position.copy(pp);
  // tilt the pond to sit flat on the slope
  const normal = V(pp.x / (HILL_R * HILL_R), pp.y / (HILL_H * HILL_H), pp.z / (HILL_R * HILL_R)).normalize();
  pond.quaternion.setFromUnitVectors(UP, normal);

  const swan = new THREE.Group();
  const white = toon("#fbf8ef");
  part(swan, white, [0.55, 0.3, 0.34], [0, 0.22, 0]);                                     // body
  part(swan, white, [0.2, 0.1, 0.16], [-0.55, 0.35, 0], [0, 0, 0.6]);                     // tail
  part(swan, white, [0.5, 0.2, 0.1], [-0.1, 0.55, 0.26], [0.35, 0, 0.55]);                // wings, raised
  part(swan, white, [0.5, 0.2, 0.1], [-0.1, 0.55, -0.26], [-0.35, 0, 0.55]);
  tube(swan, white, [[0.38, 0.3, 0], [0.6, 0.55, 0], [0.4, 0.85, 0], [0.48, 1.08, 0]], 0.1, 0.06); // S-neck
  part(swan, white, [0.12, 0.08, 0.08], [0.55, 1.1, 0]);                                  // head
  const beak = inked(new THREE.ConeGeometry(0.045, 0.18, 10), toon("#e8893a"), 0.015, swan);
  beak.position.set(0.72, 1.08, 0); beak.rotation.z = -Math.PI / 2 - 0.25;
  part(swan, toon(C.ink), [0.04, 0.03, 0.035], [0.63, 1.12, 0], [0, 0, 0], 0.001);         // black knob
  swan.scale.setScalar(0.8);
  swan.position.copy(pp).add(V(0, 0.02, 0));
  swan.rotation.y = -0.4;
  scene.add(swan);
}

// Birds flying around the tree
const birds = [];
{
  const colors = ["#c9a43a", "#9a8bb0", "#b65c8a", "#8a8f3d", "#d07a3a"];
  for (let i = 0; i < 5; i++) {
    const bird = new THREE.Group();
    const c = colors[i % colors.length];
    part(bird, c, [0.24, 0.1, 0.1], [0, 0, 0], [0, 0, 0], 0.05);                     // body
    part(bird, c, [0.09, 0.08, 0.08], [0.24, 0.05, 0], [0, 0, 0], 0.05);             // head
    const beak = inked(new THREE.ConeGeometry(0.025, 0.1, 8), toon("#e8b04a"), 0.01, bird);
    beak.position.set(0.36, 0.04, 0); beak.rotation.z = -Math.PI / 2;
    part(bird, c, [0.14, 0.02, 0.07], [-0.27, 0.02, 0], [0, 0, 0.2], 0.05);          // tail
    const wings = [];
    for (const side of [1, -1]) {
      const pivot = new THREE.Group();
      pivot.position.set(0.02, 0.05, side * 0.06);
      part(pivot, c, [0.12, 0.02, 0.3], [0, 0, side * 0.28], [0, 0, 0], 0.05);
      bird.add(pivot);
      wings.push({ pivot, side });
    }
    bird.scale.setScalar(0.9);
    scene.add(bird);
    birds.push({
      bird, wings,
      radius: 5.8 + rand() * 2.2, height: 7.2 + rand() * 2.2,
      speed: (0.16 + rand() * 0.1) * (i % 2 ? 1 : -1), phase: rand() * 6.28, flap: 7 + rand() * 3,
    });
  }
}

// ---------- Drifting petals ----------
const petals = (() => {
  const count = 70;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const palette = ["#8f74c0", "#e8692f", "#f2c14e", "#7aa58a"].map((h) => new THREE.Color(h));
  for (let i = 0; i < count; i++) {
    pos.set([(rand() - 0.5) * 16, rand() * 11, (rand() - 0.5) * 10], i * 3);
    const c = palette[i % palette.length];
    col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.11, vertexColors: true }));
  scene.add(pts);
  return pts;
})();

// ---------- Mouse / touch ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hovered = null;
let downAt = null;

function pick(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(clickable, false)[0];
  return hit ? hit.object.userData.apple : null;
}

renderer.domElement.addEventListener("pointermove", (e) => {
  hovered = pick(e);
  renderer.domElement.style.cursor = hovered ? "pointer" : "grab";
});
renderer.domElement.addEventListener("pointerdown", (e) => {
  downAt = { x: e.clientX, y: e.clientY };
  document.getElementById("hint").classList.add("hide");
});
renderer.domElement.addEventListener("pointerup", (e) => {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
  downAt = null;
  if (moved > 6) return;
  const apple = pick(e);
  if (apple) open(apple.item);
});
renderer.domElement.addEventListener("pointerleave", () => { hovered = null; });

const toast = document.getElementById("toast");
let toastTimer;
function open(item) {
  if (item.href) {
    window.location.href = item.href;
  } else {
    toast.textContent = `${item.label} — coming soon`;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  baseDist = fitDistance();
  setZoomLimits();
});

// ---------- Animation loop ----------
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();
let introT = 0;
const ease = (t) => 1 - Math.pow(1 - t, 3);

function updateLabels() {
  const w = window.innerWidth, h = window.innerHeight;
  for (const a of apples) {
    a.group.getWorldPosition(tmp);
    tmp.y -= a.group.scale.y * 1.05;
    tmp.project(camera);
    if (tmp.z > 1) { a.label.style.display = "none"; continue; }
    a.label.style.display = "";
    a.label.style.left = `${(tmp.x * 0.5 + 0.5) * w}px`;
    a.label.style.top = `${(-tmp.y * 0.5 + 0.5) * h}px`;
    a.label.classList.toggle("hover", a === hovered);
  }
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (introT < 1) {
    introT = Math.min(1, introT + dt / 2.4);
    camera.position.lerpVectors(startPos, V(0, TARGET.y + 0.8, baseDist), ease(introT));
    camera.lookAt(TARGET);
    if (introT === 1) controls.enabled = true;
  } else {
    controls.update();
  }

  tree.rotation.z = Math.sin(t * 0.5) * 0.01;
  tree.rotation.x = Math.sin(t * 0.37) * 0.006;

  for (const a of apples) {
    a.hover += ((a === hovered ? 1 : 0) - a.hover) * Math.min(1, dt * 10);
    a.group.scale.setScalar(a.radius * (1 + a.hover * (a.isEarth ? 0.12 : 0.3)));
    a.body.rotation.z = Math.sin(t * 0.9 + a.phase) * 0.06;
    if (a.isEarth) a.body.rotation.y += dt * 0.25;
    a.material.emissive.copy(a.glow).add(new THREE.Color(0.3 * a.hover, 0.18 * a.hover, 0.05 * a.hover));
  }

  // birds circle the tree, flapping
  for (const b of birds) {
    const a = b.phase + t * b.speed;
    b.bird.position.set(Math.cos(a) * b.radius, b.height + Math.sin(t * 1.3 + b.phase) * 0.3, Math.sin(a) * b.radius * 0.8);
    const dir = Math.sign(b.speed);
    b.bird.rotation.set(dir * 0.25, Math.atan2(-Math.cos(a) * dir * 0.8, -Math.sin(a) * dir), 0, "YXZ");
    for (const w of b.wings) w.pivot.rotation.x = w.side * Math.sin(t * b.flap + b.phase) * 0.7;
  }

  // the serpent flicks its tongue
  tongue.scale.z = Math.sin(t * 5) > 0.6 ? 1 : 0.01;

  const p = petals.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let y = p.getY(i) - dt * 0.3;
    if (y < 0) y = 11;
    p.setY(i, y);
    p.setX(i, p.getX(i) + Math.sin(t * 0.8 + i) * dt * 0.15);
  }
  p.needsUpdate = true;

  renderer.render(scene, camera);
  updateLabels();

  if (!window.__treeReady) {
    window.__treeReady = true;
    document.getElementById("loading")?.remove();
  }
  requestAnimationFrame(animate);
}
animate();
