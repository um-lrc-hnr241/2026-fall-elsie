// =============================================================
//  3D Tree of Knowledge — home page
//  Apples come from js/apples.js (edit labels and links there).
// =============================================================
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const EARTH = window.EARTH_APPLE;
const APPLES = window.APPLES;

// ---------- Small seeded random so the tree looks the same every visit ----------
let seed = 7;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

// ---------- Basic setup ----------
const container = document.getElementById("scene");
const labelLayer = document.getElementById("labels");

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xb7d4a8, 20, 48);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 200);
const TARGET = new THREE.Vector3(0, 4.5, 0);

// Pick a camera distance that fits the whole tree on any screen shape
function fitDistance() {
  const aspect = window.innerWidth / window.innerHeight;
  const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const byHeight = 5.0 / halfH;          // fit ~10 units tall
  const byWidth = 5.4 / (halfH * aspect); // fit ~10.8 units wide
  return Math.max(byHeight, byWidth);
}
let baseDist = fitDistance();
const startPos = new THREE.Vector3(0, 9, baseDist * 1.7);
camera.position.copy(startPos);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(TARGET);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.rotateSpeed = 0.6;
controls.minPolarAngle = 0.95;
controls.maxPolarAngle = 1.62;
controls.minAzimuthAngle = -0.9;
controls.maxAzimuthAngle = 0.9;
controls.enabled = false; // turned on after the intro
function setZoomLimits() {
  controls.minDistance = baseDist * 0.6;
  controls.maxDistance = baseDist * 1.3;
}
setZoomLimits();

// ---------- Lights ----------
scene.add(new THREE.HemisphereLight(0xfff2d0, 0x3b5a36, 1.3));
const sun = new THREE.DirectionalLight(0xffe0a3, 2.6);
sun.position.set(7, 13, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 12, bottom: -6, near: 1, far: 40 });
sun.shadow.bias = -0.0005;
scene.add(sun);

// ---------- Ground ----------
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(40, 64),
  new THREE.MeshStandardMaterial({ color: 0x7aa865, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Grass tufts
{
  const count = 900;
  const grass = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.06, 0.4, 3),
    new THREE.MeshStandardMaterial({ flatShading: true }),
    count
  );
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const r = 1.2 + Math.pow(rand(), 0.7) * 14;
    const s = 0.6 + rand() * 0.9;
    m.compose(
      new THREE.Vector3(Math.cos(a) * r, 0.18 * s, Math.sin(a) * r),
      new THREE.Quaternion().setFromEuler(new THREE.Euler((rand() - 0.5) * 0.4, rand() * 3, (rand() - 0.5) * 0.4)),
      new THREE.Vector3(s, s, s)
    );
    grass.setMatrixAt(i, m);
    grass.setColorAt(i, c.setHSL(0.25 + rand() * 0.07, 0.5, 0.3 + rand() * 0.15));
  }
  scene.add(grass);
}

// Little flowers
{
  const count = 160;
  const flowers = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.07, 0),
    new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.6 }),
    count
  );
  const m = new THREE.Matrix4();
  const palette = [0xffffff, 0xffd1dc, 0xffe680, 0xf7b2d9];
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const r = 2 + rand() * 11;
    m.makeTranslation(Math.cos(a) * r, 0.12, Math.sin(a) * r);
    flowers.setMatrixAt(i, m);
    flowers.setColorAt(i, new THREE.Color(palette[Math.floor(rand() * palette.length)]));
  }
  scene.add(flowers);
}

// ---------- The tree ----------
const tree = new THREE.Group();
scene.add(tree);

const barkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.95, flatShading: true });

// Trunk (a lathe = a shape spun around its center)
const trunkProfile = [
  [0.85, 0], [0.55, 0.25], [0.44, 0.8], [0.38, 1.8], [0.33, 2.8], [0.28, 3.3], [0, 3.35],
].map(([x, y]) => new THREE.Vector2(x, y));
const trunk = new THREE.Mesh(new THREE.LatheGeometry(trunkProfile, 12), barkMat);
trunk.castShadow = true;
tree.add(trunk);

function limb(a, b, r1, r2) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, dir.length(), 8), barkMat);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = true;
  tree.add(mesh);
  // a ball at the joint hides the seam
  const joint = new THREE.Mesh(new THREE.SphereGeometry(r2, 8, 6), barkMat);
  joint.position.copy(b);
  tree.add(joint);
}

const CANOPY = new THREE.Vector3(0, 5.3, 0);
const RAD = new THREE.Vector3(3.7, 2.3, 3.0);

// Main branches
const fork = new THREE.Vector3(0, 3.0, 0);
for (let k = 0; k < 7; k++) {
  const a = (k / 7) * Math.PI * 2 + rand() * 0.4;
  const mid = new THREE.Vector3(Math.cos(a) * 1.0, 3.9 + rand() * 0.4, Math.sin(a) * 0.9);
  const end = new THREE.Vector3(Math.cos(a) * RAD.x * 0.62, CANOPY.y + (rand() - 0.3) * 1.0, Math.sin(a) * RAD.z * 0.62);
  limb(fork, mid, 0.24, 0.15);
  limb(mid, end, 0.15, 0.07);
}
// Roots
for (let k = 0; k < 5; k++) {
  const a = (k / 5) * Math.PI * 2 + 0.3;
  limb(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(Math.cos(a) * 1.3, -0.05, Math.sin(a) * 1.3), 0.28, 0.06);
}

// ---------- Apple shape ----------
function makeAppleGeometry() {
  const g = new THREE.SphereGeometry(1, 48, 32);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r2 = x * x + z * z;
    if (y > 0) y -= 0.32 * Math.exp(-r2 / 0.035); // dip at the top
    else y += 0.18 * Math.exp(-r2 / 0.03);        // dip at the bottom
    const widen = 1 + 0.07 * y;                    // a bit wider near the top
    p.setXYZ(i, x * widen, y * 0.9, z * widen);
  }
  g.computeVertexNormals();
  return g;
}
const appleGeo = makeAppleGeometry();
const stemGeo = new THREE.CylinderGeometry(0.035, 0.05, 0.42, 6);
const leafGeo = new THREE.SphereGeometry(1, 12, 8);
const stemMat = new THREE.MeshStandardMaterial({ color: 0x5a3b1f, roughness: 0.9 });
const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f8a3a, roughness: 0.6, flatShading: true });
const hitMat = new THREE.MeshBasicMaterial({ visible: false });

const clickable = []; // invisible hit spheres we test the mouse against
const apples = [];    // everything we animate

function makeApple({ item, radius, material, position, isEarth = false }) {
  const group = new THREE.Group();
  group.position.copy(position);

  const body = new THREE.Mesh(appleGeo, material);
  body.castShadow = true;
  group.add(body);

  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = 0.78;
  stem.rotation.z = 0.25;
  body.add(stem);

  const leaf = new THREE.Mesh(leafGeo, leafMat);
  leaf.scale.set(0.3, 0.035, 0.13);
  leaf.position.set(0.2, 0.88, 0);
  leaf.rotation.z = 0.45;
  body.add(leaf);

  group.scale.setScalar(radius);

  const hit = new THREE.Mesh(new THREE.SphereGeometry(1.35, 12, 8), hitMat);
  group.add(hit);

  const label = document.createElement("div");
  label.className = "apple-label" + (isEarth ? " earth" : "");
  label.textContent = item.label;
  labelLayer.appendChild(label);

  const apple = {
    item, group, body, material, label, radius, isEarth,
    hover: 0, phase: rand() * Math.PI * 2, basePos: position.clone(),
  };
  hit.userData.apple = apple;
  clickable.push(hit);
  apples.push(apple);
  tree.add(group);
  return apple;
}

// ---------- Earth texture (drawn in code, no image needed) ----------
function makeEarthTexture() {
  const w = 512, h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(w, h);
  const waves = [];
  for (let i = 0; i < 9; i++) {
    waves.push({
      k: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize().multiplyScalar(2 + rand() * 5),
      ph: rand() * 6.28, amp: 1 / (1 + i * 0.5),
    });
  }
  const v = new THREE.Vector3();
  for (let y = 0; y < h; y++) {
    const lat = (0.5 - y / h) * Math.PI;
    for (let x = 0; x < w; x++) {
      const lon = (x / w) * Math.PI * 2;
      v.set(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon));
      let n = 0;
      for (const wv of waves) n += Math.sin(v.dot(wv.k) + wv.ph) * wv.amp;
      const i = (y * w + x) * 4;
      let r, g, b;
      if (Math.abs(lat) > 1.22) { r = 240; g = 246; b = 250; }            // ice caps
      else if (n > 0.55) {                                                  // land
        const t = Math.min(1, (n - 0.55) / 1.2);
        r = 60 + t * 90; g = 150 - t * 25; b = 55 + t * 10;
      } else if (n > 0.4) { r = 70; g = 160; b = 190; }                     // shallow water
      else { const t = (n + 2) / 2.4; r = 20 + t * 15; g = 70 + t * 40; b = 150 + t * 40; } // ocean
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- Place the Earth apple in the middle ----------
const EARTH_R = 0.95;
const earthPos = new THREE.Vector3(0, 4.75, RAD.z * 0.82);
const earth = makeApple({
  item: EARTH,
  radius: EARTH_R,
  material: new THREE.MeshStandardMaterial({ map: makeEarthTexture(), roughness: 0.55 }),
  position: earthPos,
  isEarth: true,
});

// ---------- Leaves (clusters of low-poly balls) ----------
const blobs = [];
for (let i = 0; i < 120 && blobs.length < 85; i++) {
  const u = rand() * 2 - 1, th = rand() * Math.PI * 2;
  const dir = new THREE.Vector3(Math.sqrt(1 - u * u) * Math.cos(th), u, Math.sqrt(1 - u * u) * Math.sin(th));
  const r = 0.45 + Math.sqrt(rand()) * 0.5;
  const pos = new THREE.Vector3(dir.x * RAD.x * r, dir.y * RAD.y * r, dir.z * RAD.z * r).add(CANOPY);
  const size = 0.75 + rand() * 0.5;
  // leave a nook so the Earth apple is visible
  if (pos.distanceTo(earthPos) < EARTH_R + size + 0.15) continue;
  blobs.push({ pos, size });
}
{
  const leaves = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.8 }),
    blobs.length
  );
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  blobs.forEach((b, i) => {
    m.compose(b.pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 3, rand() * 3, 0)),
      new THREE.Vector3(b.size, b.size * 0.9, b.size));
    leaves.setMatrixAt(i, m);
    const high = (b.pos.y - (CANOPY.y - RAD.y)) / (RAD.y * 2); // lighter toward the top
    leaves.setColorAt(i, c.setHSL(0.27 + rand() * 0.06, 0.5, 0.22 + high * 0.14 + rand() * 0.06));
  });
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  tree.add(leaves);
}

// ---------- Place the small apples around the front of the tree ----------
const APPLE_R = 0.36;
const LEVELS = [0.3, -0.3, 0.72, 0.25, -0.28, 0.5, 0.05, 0.62];
APPLES.forEach((item, i) => {
  const n = APPLES.length;
  const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1; // -1 .. 1, left to right
  const theta = Math.sign(t) * Math.pow(Math.abs(t), 0.7) * 1.3; // spread the middle ones apart
  let elev = LEVELS[i % LEVELS.length];
  const pos = new THREE.Vector3();
  const place = () => {
    const dir = new THREE.Vector3(Math.sin(theta) * Math.cos(elev), Math.sin(elev), Math.cos(theta) * Math.cos(elev));
    // start inside the canopy and move outward until the apple peeks out of the leaves
    for (let s = 0.6; s < 2; s += 0.02) {
      pos.set(dir.x * RAD.x * s, dir.y * RAD.y * s, dir.z * RAD.z * s).add(CANOPY);
      if (blobs.every((b) => pos.distanceTo(b.pos) > b.size * 0.92 + APPLE_R * 0.4)) break;
    }
  };
  place();
  // keep clear of the Earth apple and its label
  for (let k = 0; k < 4 && pos.distanceTo(earthPos) < EARTH_R + 1.4; k++) { elev += 0.3; place(); }
  makeApple({
    item,
    radius: APPLE_R,
    material: new THREE.MeshStandardMaterial({ color: 0xc81d25, roughness: 0.32, metalness: 0.05 }),
    position: pos,
  });
});

// ---------- Floating golden light ----------
const motes = (() => {
  const count = 140;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rand() - 0.5) * 16;
    pos[i * 3 + 1] = rand() * 9;
    pos[i * 3 + 2] = (rand() - 0.5) * 12;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({
    color: 0xffe9a0, size: 0.09, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
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
  if (moved > 6) return; // it was a drag, not a click
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

// ---------- Resize ----------
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
    tmp.y -= a.group.scale.y * 1.05; // just below the apple
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

  // Intro: glide the camera in
  if (introT < 1) {
    introT = Math.min(1, introT + dt / 2.4);
    const endPos = new THREE.Vector3(0, 5.2, baseDist);
    camera.position.lerpVectors(startPos, endPos, ease(introT));
    camera.lookAt(TARGET);
    if (introT === 1) controls.enabled = true;
  } else {
    controls.update();
  }

  // Gentle breeze
  tree.rotation.z = Math.sin(t * 0.5) * 0.012;
  tree.rotation.x = Math.sin(t * 0.37) * 0.008;

  // Apples: bob, grow on hover, glow
  for (const a of apples) {
    a.hover += ((a === hovered ? 1 : 0) - a.hover) * Math.min(1, dt * 10);
    const bob = Math.sin(t * 1.3 + a.phase) * 0.04;
    a.group.position.set(a.basePos.x, a.basePos.y + bob, a.basePos.z);
    a.group.scale.setScalar(a.radius * (1 + a.hover * (a.isEarth ? 0.12 : 0.3)));
    a.body.rotation.z = Math.sin(t * 0.9 + a.phase) * 0.08;
    if (a.isEarth) a.body.rotation.y += dt * 0.25; // the Earth slowly turns
    a.material.emissive.setRGB(0.35 * a.hover, 0.12 * a.hover, 0.02 * a.hover);
  }

  // Drift the golden motes upward
  const p = motes.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let y = p.getY(i) + dt * 0.25;
    if (y > 9) y = 0;
    p.setY(i, y);
    p.setX(i, p.getX(i) + Math.sin(t + i) * dt * 0.05);
  }
  p.needsUpdate = true;

  renderer.render(scene, camera);
  updateLabels();

  if (!window.__treeReady) {
    window.__treeReady = true;
    document.getElementById("loading").remove();
  }
  requestAnimationFrame(animate);
}
animate();
