// =============================================================
//  The Garden of Eden: a glowing grove with a grand tree.
//  Original artwork drawn in code: bold ink outlines, flat
//  shading, deep teal shadows and glowing light.
// =============================================================

// ---------- The fruit on the tree (edit names and links here) ----------
// x / y are positions in the 1600 x 900 painting.
const FRUIT = [
  { label: "Introduction", href: "essays/introduction.html", x: 505, y: 335 },
  { label: "Build 3", href: "essays/build-3.html", x: 618, y: 198 },
  { label: "Build 4", href: "essays/build-4.html", x: 800, y: 128 },
  { label: "Build 5", href: "essays/build-5.html", x: 982, y: 198 },
  { label: "Conclusion", href: "essays/conclusion.html", x: 1095, y: 335 },
];
const FORBIDDEN = { label: "The Forbidden Fruit", x: 800, y: 345 };

// ---------- Palette ----------
const INK = "#06110f";
const C = {
  bark: "#24453e", bark2: "#2e544b", barkHi: "#4f8a78", barkLine: "#13302a",
  leaf: ["#143f33", "#1f5c48", "#3f9470", "#9cf2cf"],      // shade, base, light, rim
  bush: ["#0a1f1a", "#0e2a22", "#1c4a3a", "#3f8a6a"],
  rock: "#123630", rockHi: "#2b6a5a", rockMoss: "#1f5a4a",
  stone: "#3b6b63", stoneHi: "#5d968a", marble: "#a9c7c4", marbleShade: "#7c9e9b",
  water: "#c6f6ea", flower: "#86a8ff",
};

// ---------- Seeded random (the scene looks the same each visit) ----------
let seed = 1234;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- Canvas and view ----------
const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const layers = { bg: document.createElement("canvas"), tree: document.createElement("canvas"), fg: document.createElement("canvas") };
let W = 0, H = 0, DPR = 1, S = 1, OX = 0, OY = 0;

function computeView() {
  W = canvas.clientWidth; H = canvas.clientHeight;
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  // fit the whole tree (from the top of the crown to the ground) below the title
  const top = W < 700 ? 86 : 104;
  S = Math.min(W / 840, (H - top) / 960);
  OX = W / 2 - 800 * S;
  OY = top + 70 * S + Math.max(0, (H - top - 960 * S) * 0.35);
  for (const c of [canvas, ...Object.values(layers)]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); }
}
// draw in painting coordinates
function view(g, dx = 0, dy = 0) {
  g.setTransform(DPR * S, 0, 0, DPR * S, DPR * (OX + dx), DPR * (OY + dy));
  g.lineCap = g.lineJoin = "round";
}

// ---------- Drawing helpers ----------
// smooth curve through points (Catmull-Rom), returned as a list of points
function curve(pts, steps = 10) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    for (let k = 0; k < steps; k++) {
      const t = k / steps, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
// a tapered limb along a curve, as a closed outline
function taperPath(g, pts, w0, w1) {
  const L = [], R = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
    const wd = lerp(w0, w1, i / (pts.length - 1)) / 2;
    L.push([p[0] + nx * wd, p[1] + ny * wd]); R.push([p[0] - nx * wd, p[1] - ny * wd]);
  });
  g.beginPath();
  L.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  R.reverse().forEach(([x, y]) => g.lineTo(x, y));
  g.closePath();
}
function ink(g, w = 3) { g.strokeStyle = INK; g.lineWidth = w; g.stroke(); }
function polyline(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); }

// A cluster of foliage: several overlapping puffs with one bold outline,
// shaded underneath, lit on top, and rimmed with glow on the side facing the light.
function cluster(g, cx, cy, rad, pal, light = [800, 360], leafMarks = true) {
  const puffs = [];
  const n = 5 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.5, d = rad * (0.35 + rand() * 0.25);
    puffs.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, rad * (0.42 + rand() * 0.18)]);
  }
  puffs.push([cx, cy, rad * 0.62]);
  const shape = () => { g.beginPath(); puffs.forEach(([x, y, r]) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2); }); };
  // outline, then fill over the inner lines
  shape(); g.strokeStyle = INK; g.lineWidth = 7; g.stroke();
  shape(); g.fillStyle = pal[1]; g.fill();
  g.save(); shape(); g.clip();
  g.fillStyle = pal[0];
  g.beginPath(); g.arc(cx + rad * 0.18, cy + rad * 0.55, rad * 0.95, 0, Math.PI * 2); g.fill();
  g.fillStyle = pal[2];
  puffs.forEach(([x, y, r]) => { g.beginPath(); g.arc(x - r * 0.22, y - r * 0.3, r * 0.55, 0, Math.PI * 2); g.fill(); });
  g.fillStyle = pal[1];
  puffs.forEach(([x, y, r]) => { g.beginPath(); g.arc(x - r * 0.05, y - r * 0.05, r * 0.42, 0, Math.PI * 2); g.fill(); });
  if (leafMarks) { // little leaf strokes
    for (let i = 0; i < rad * 0.35; i++) {
      const x = cx + (rand() - 0.5) * rad * 1.8, y = cy + (rand() - 0.5) * rad * 1.5, a = rand() * 6.28, l = 6 + rand() * 7;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.6, y + Math.sin(a + 0.6) * l * 0.6, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.strokeStyle = rand() < 0.5 ? pal[0] : pal[2]; g.lineWidth = 2; g.stroke();
    }
  }
  // rim glow on the side facing the light
  const la = Math.atan2(light[1] - cy, light[0] - cx);
  g.strokeStyle = pal[3]; g.lineWidth = 3.5; g.globalAlpha = 0.85;
  puffs.forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r - 3, la - 0.6, la + 0.6); g.stroke(); });
  g.globalAlpha = 1;
  g.restore();
}

// Greek-style curling cloud of mist
function curl(g, x, y, r, fill, line) {
  g.beginPath();
  for (const [dx, dy, rr] of [[-0.9, 0.15, 0.55], [-0.3, -0.25, 0.7], [0.45, -0.1, 0.65], [1.0, 0.2, 0.45]]) {
    g.moveTo(x + dx * r + rr * r, y + dy * r); g.arc(x + dx * r, y + dy * r, rr * r, 0, Math.PI * 2);
  }
  g.fillStyle = fill; g.fill();
  g.strokeStyle = line; g.lineWidth = 2;
  for (const [dx, dy, rr] of [[-0.3, -0.25, 0.42], [0.45, -0.1, 0.36]]) { // spirals
    g.beginPath();
    for (let a = 0; a < Math.PI * 3.2; a += 0.2) {
      const k = rr * r * (1 - a / (Math.PI * 3.6));
      a ? g.lineTo(x + dx * r + Math.cos(a) * k, y + dy * r + Math.sin(a) * k) : g.moveTo(x + dx * r + k, y + dy * r);
    }
    g.stroke();
  }
}

function star(g, x, y, r, n = 5) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 ? r * 0.45 : r, a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
}

// ---------- Glowing veins (drawn live so they can pulse) ----------
let veins = [];

// ---------- 1) Background: the grove, cliffs, waterfalls, hanging vines ----------
function paintBackground() {
  seed = 1234;
  const g = layers.bg.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, layers.bg.width, layers.bg.height);
  // deep glow behind everything
  const cx = (OX + 800 * S) * DPR, cy = (OY + 360 * S) * DPR, R = Math.max(W, H) * DPR;
  const grad = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.85);
  grad.addColorStop(0, "#2f8670"); grad.addColorStop(0.22, "#1b5a4c"); grad.addColorStop(0.5, "#0e302a"); grad.addColorStop(1, "#030a09");
  g.fillStyle = grad; g.fillRect(0, 0, layers.bg.width, layers.bg.height);

  view(g);
  // distant rock shelves behind the tree
  for (const [base, col, line] of [[430, "#2a6f5e", "#3f8f7a"], [520, "#22604f", "#3a8a72"]]) {
    g.beginPath(); g.moveTo(-900, 1400);
    for (let x = -900; x <= 2500; x += 40) g.lineTo(x, base + Math.sin(x * 0.012) * 30 + Math.sin(x * 0.031) * 14 + (Math.abs(x - 800) < 260 ? 40 : 0));
    g.lineTo(2500, 1400); g.closePath();
    g.fillStyle = col; g.fill(); ink(g, 3);
    for (let i = 0; i < 14; i++) { // ledges
      const x = -200 + rand() * 2000, y = base + 30 + rand() * 120;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 60, y - 10, x + 140 + rand() * 80, y + 6);
      g.strokeStyle = line; g.lineWidth = 3; g.stroke();
    }
  }
  // waterfalls
  for (const [x, top, bot, wd] of [[640, -60, 560, 46], [968, -40, 540, 60]]) {
    const pts = curve([[x, top], [x - 12, (top + bot) * 0.4], [x + 10, (top + bot) * 0.7], [x - 4, bot]], 12);
    taperPath(g, pts, wd * 0.6, wd);
    g.fillStyle = C.water; g.globalAlpha = 0.82; g.fill(); g.globalAlpha = 1;
    g.strokeStyle = "#4fae96"; g.lineWidth = 2.5; g.stroke();
    for (let k = 0; k < 5; k++) { // falling streaks
      const off = (k - 2) * wd * 0.16;
      polyline(g, pts.map(([px, py]) => [px + off, py]));
      g.strokeStyle = "rgba(255,255,255,0.75)"; g.lineWidth = 1.8; g.stroke();
    }
    for (let k = 0; k < 4; k++) curl(g, x - 60 + k * 40, bot + (k % 2) * 14, 26 + rand() * 10, "rgba(220,252,244,0.85)", "#7cc8b4");
  }
  // great cliffs framing the left and right
  for (const side of [-1, 1]) {
    const X = (x) => (side < 0 ? x : 1600 - x);
    const pts = [[-900, -600], [380, -600], [360, -200], [300, 60], [330, 260], [250, 470], [210, 700], [120, 900], [-900, 1400]];
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), y) : g.moveTo(X(x), y))); g.closePath();
    g.fillStyle = C.rock; g.fill(); ink(g, 4);
    for (let i = 0; i < 26; i++) { // stony ledges and moss
      const y = -100 + rand() * 900, x = 60 + rand() * 260;
      g.beginPath(); g.moveTo(X(x), y); g.quadraticCurveTo(X(x + 40), y - 14, X(x + 90 + rand() * 60), y + 4);
      g.strokeStyle = C.rockHi; g.lineWidth = 3; g.stroke();
      if (rand() < 0.4) { g.beginPath(); g.ellipse(X(x + 50), y - 4, 30, 8, 0, 0, Math.PI * 2); g.fillStyle = C.rockMoss; g.fill(); }
    }
  }
  // foliage clinging to the cliffs, and bushes along the far edge of the clearing
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const y = -60 + i * 95 + rand() * 30, x = 300 - i * 18 + rand() * 40;
      cluster(g, side < 0 ? x : 1600 - x, y, 40 + rand() * 30, ["#0f2f28", "#174539", "#2a6a54", "#7fd6b4"], [800, 360]);
    }
  }
  for (let i = 0; i < 14; i++) {
    const x = 120 + i * 105 + rand() * 30;
    if (Math.abs(x - 800) < 170) continue;
    cluster(g, x, 690 + rand() * 30, 44 + rand() * 26, ["#11352d", "#1a4c3f", "#2f7a5e", "#9cf2cf"], [800, 400]);
  }
  // hanging vines from the canopy above
  for (let i = 0; i < 40; i++) {
    const x = -300 + rand() * 2200, len = 80 + rand() * 260;
    const pts = curve([[x, -120], [x + (rand() - 0.5) * 40, len * 0.5], [x + (rand() - 0.5) * 50, len]], 8);
    polyline(g, pts); g.strokeStyle = INK; g.lineWidth = 5; g.stroke();
    polyline(g, pts); g.strokeStyle = "#1b4a3e"; g.lineWidth = 2.5; g.stroke();
    for (let k = 2; k < pts.length; k += 3) {
      const [px, py] = pts[k];
      g.beginPath(); g.ellipse(px + (k % 2 ? 6 : -6), py, 7, 3.5, k % 2 ? 0.6 : -0.6, 0, Math.PI * 2);
      g.fillStyle = "#2a6e58"; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.5; g.stroke();
    }
  }
}

// ---------- 2) The grand tree ----------
function paintTree() {
  seed = 777;
  veins = [];
  const g = layers.tree.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, layers.tree.width, layers.tree.height);
  view(g);

  // aura of light behind the tree
  const aura = g.createRadialGradient(800, 330, 0, 800, 330, 520);
  aura.addColorStop(0, "rgba(170,255,225,0.45)"); aura.addColorStop(0.5, "rgba(120,230,200,0.12)"); aura.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = aura; g.fillRect(200, -200, 1200, 1000);

  // roots spreading over the ground
  const roots = [[470, 830], [560, 860], [660, 880], [740, 900], [860, 900], [940, 880], [1040, 860], [1130, 830], [610, 805], [1000, 805]];
  for (const [ex, ey] of roots) {
    const mx = lerp(800, ex, 0.5), pts = curve([[800 + (ex - 800) * 0.08, 735], [mx, lerp(745, ey, 0.4) - 12], [ex, ey]], 12);
    taperPath(g, pts, 46, 6);
    g.fillStyle = C.bark; g.fill(); ink(g, 3.5);
    polyline(g, pts.slice(1, -2).map(([x, y]) => [x, y - 6])); g.strokeStyle = C.barkHi; g.lineWidth = 2.5; g.stroke();
    veins.push(pts.slice(0, -1).map(([x, y]) => [x, y + 2]));
  }
  // twisted trunk: two strands winding around each other
  const strand = (dir) => curve([[800 + dir * 70, 770], [800 + dir * 30, 660], [800 - dir * 40, 560], [800 + dir * 20, 470], [800 - dir * 10, 400]], 12);
  for (const [dir, col] of [[1, C.bark], [-1, C.bark2]]) {
    const pts = strand(dir);
    taperPath(g, pts, 120, 62);
    g.fillStyle = col; g.fill(); ink(g, 4);
    for (let k = 0; k < 4; k++) { // bark grain
      polyline(g, pts.map(([x, y], i) => [x + (k - 1.5) * lerp(20, 10, i / pts.length), y]));
      g.strokeStyle = C.barkLine; g.lineWidth = 2; g.stroke();
    }
    polyline(g, pts.map(([x, y], i) => [x - lerp(38, 18, i / pts.length), y])); g.strokeStyle = C.barkHi; g.lineWidth = 3; g.stroke();
    veins.push(pts.map(([x, y], i) => [x + Math.sin(i * 0.5) * 8, y]));
  }
  // great branches reaching into the crown
  const ends = [[470, 300], [600, 190], [700, 120], [800, 90], [900, 120], [1000, 190], [1130, 300], [560, 330], [1040, 330]];
  for (const [ex, ey] of ends) {
    const pts = curve([[800, 420], [lerp(800, ex, 0.4), lerp(420, ey, 0.55) + 20], [ex, ey]], 12);
    taperPath(g, pts, 40, 8);
    g.fillStyle = C.bark2; g.fill(); ink(g, 3.5);
    polyline(g, pts.slice(0, -2).map(([x, y]) => [x, y - 5])); g.strokeStyle = C.barkHi; g.lineWidth = 2; g.stroke();
  }
  // the crown: clusters drawn from the back to the front
  const spots = [];
  for (let i = 0; i < 34; i++) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand());
    const x = 800 + Math.cos(a) * d * 420, y = 230 + Math.sin(a) * d * 170;
    spots.push([x, y, 62 + rand() * 46]);
  }
  spots.push([800, 60, 90], [600, 130, 80], [1000, 130, 80], [450, 270, 70], [1150, 270, 70]);
  spots.sort((a, b) => Math.abs(b[0] - 800) - Math.abs(a[0] - 800) || a[1] - b[1]);
  for (const [x, y, r] of spots) cluster(g, x, y, r, C.leaf, [800, 380]);
  // glowing tendrils hanging from the crown
  for (let i = 0; i < 26; i++) {
    const x = 480 + rand() * 640, y = 300 + rand() * 90, len = 50 + rand() * 120;
    const pts = curve([[x, y], [x + (rand() - 0.5) * 20, y + len * 0.5], [x + (rand() - 0.5) * 30, y + len]], 8);
    polyline(g, pts); g.strokeStyle = INK; g.lineWidth = 4.5; g.stroke();
    polyline(g, pts); g.strokeStyle = "#3f9470"; g.lineWidth = 2; g.stroke();
    const [tx, ty] = pts[pts.length - 1];
    star(g, tx, ty + 4, 7); g.fillStyle = "#bfe6ff"; g.fill(); ink(g, 1.5);
  }
}

// ---------- 3) Foreground: ground, stone path, ruins, flowers, bushes ----------
function paintForeground() {
  seed = 4321;
  const g = layers.fg.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, layers.fg.width, layers.fg.height);
  view(g);
  // ground
  g.beginPath(); g.moveTo(-900, 1500); g.lineTo(-900, 800);
  g.bezierCurveTo(200, 790, 500, 745, 800, 745); g.bezierCurveTo(1100, 745, 1400, 790, 2500, 800);
  g.lineTo(2500, 1500); g.closePath();
  const gg = g.createLinearGradient(0, 740, 0, 1100);
  gg.addColorStop(0, "#1d5244"); gg.addColorStop(0.4, "#123a31"); gg.addColorStop(1, "#06140f");
  g.fillStyle = gg; g.fill(); ink(g, 4);
  // mossy glow around the roots
  const pool = g.createRadialGradient(800, 790, 0, 800, 790, 360);
  pool.addColorStop(0, "rgba(140,250,210,0.45)"); pool.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = pool; g.fillRect(400, 700, 800, 300);
  // stone path toward the tree
  for (let row = 0; row < 7; row++) {
    const y0 = 800 + row * row * 9 + row * 22, y1 = 800 + (row + 1) * (row + 1) * 9 + (row + 1) * 22 - 4;
    const w0 = 60 + row * 46, w1 = 60 + (row + 1) * 46, n = 2 + Math.floor(row / 2);
    for (let k = 0; k < n; k++) {
      const a0 = -w0 + (2 * w0 * k) / n + 3, a1 = -w0 + (2 * w0 * (k + 1)) / n - 3;
      const b0 = -w1 + (2 * w1 * k) / n + 3, b1 = -w1 + (2 * w1 * (k + 1)) / n - 3;
      g.beginPath(); g.moveTo(800 + a0, y0); g.lineTo(800 + a1, y0); g.lineTo(800 + b1, y1); g.lineTo(800 + b0, y1); g.closePath();
      g.fillStyle = rand() < 0.5 ? C.stone : "#335f58"; g.fill(); ink(g, 2.5);
      g.beginPath(); g.moveTo(800 + a0 + 4, y0 + 3); g.lineTo(800 + a1 - 4, y0 + 3); g.strokeStyle = C.stoneHi; g.lineWidth = 2; g.stroke();
      if (rand() < 0.4) { // crack with a glint
        const cx = 800 + lerp(a0, b1, 0.5);
        g.beginPath(); g.moveTo(cx - 10, y0 + 6); g.lineTo(cx, (y0 + y1) / 2); g.lineTo(cx + 8, y1 - 4);
        g.strokeStyle = "#8ff7dc"; g.lineWidth = 1.5; g.stroke();
      }
    }
  }
  // broken marble columns, overgrown
  const column = (x, base, ht, tilt) => {
    g.save(); g.translate(x, base); g.rotate(tilt);
    g.beginPath(); g.rect(-26, -ht, 52, ht); g.fillStyle = C.marble; g.fill(); ink(g, 3);
    for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(k * 9, -ht + 6); g.lineTo(k * 9, -6); g.strokeStyle = C.marbleShade; g.lineWidth = 2.5; g.stroke(); }
    g.beginPath(); g.moveTo(-26, -ht); g.lineTo(-12, -ht - 16); g.lineTo(0, -ht - 6); g.lineTo(12, -ht - 22); g.lineTo(26, -ht); g.closePath();
    g.fillStyle = C.marble; g.fill(); ink(g, 3);
    g.beginPath(); g.rect(-34, -12, 68, 14); g.fillStyle = C.marbleShade; g.fill(); ink(g, 3);
    for (let k = 0; k < 6; k++) { // ivy
      g.beginPath(); g.ellipse(-20 + rand() * 40, -rand() * ht, 9, 5, rand() * 3, 0, Math.PI * 2);
      g.fillStyle = "#2f7a5a"; g.fill(); ink(g, 1.5);
    }
    g.restore();
  };
  column(330, 800, 170, -0.04);
  column(1270, 805, 120, 0.12);
  // bushes in the corners
  for (const [x, y, r] of [[60, 860, 140], [230, 900, 110], [-60, 760, 150], [1540, 860, 140], [1370, 905, 110], [1660, 760, 150], [430, 930, 90], [1170, 935, 90]]) {
    cluster(g, x, y, r, C.bush, [800, 500]);
  }
  // blue star flowers over the ground
  for (let i = 0; i < 260; i++) {
    const x = -200 + rand() * 2000, y = 770 + Math.pow(rand(), 0.8) * 240;
    if (Math.abs(x - 800) < 60 + (y - 790) * 1.6 && y > 800) continue; // keep the path clear
    const r = 4 + (y - 770) / 40 + rand() * 3;
    star(g, x, y, r); g.fillStyle = rand() < 0.8 ? C.flower : "#e6f2ff"; g.fill(); ink(g, 1.4);
    g.beginPath(); g.arc(x, y, r * 0.22, 0, Math.PI * 2); g.fillStyle = "#fff8d0"; g.fill();
  }
  // dark leaves hanging into the top corners
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) cluster(g, side < 0 ? -40 + i * 50 : 1640 - i * 50, -70 + rand() * 60 - i * 6, 90 - i * 8, ["#071713", "#0a1f1a", "#12342b", "#2f6e58"], [800, 400], false);
  }
}

// ---------- Live effects: light shafts, pulsing veins, sparks, mist ----------
const motes = Array.from({ length: 150 }, () => ({
  x: rand() * 1600, y: rand() * 900, s: 0.6 + rand() * 1.8, v: 6 + rand() * 18, p: rand() * 6.28, gold: rand() < 0.25,
}));
const mists = Array.from({ length: 9 }, (_, i) => ({ x: rand() * 1800 - 100, y: 690 + rand() * 120, r: 30 + rand() * 26, v: 4 + rand() * 6, d: i % 2 ? 1 : -1 }));
const shafts = [330, 560, 705, 905, 1060, 1280].map((x, i) => ({ x, w: 26 + (i % 3) * 18, p: i * 1.7 }));

let mx = 0, my = 0, pmx = 0, pmy = 0;
window.addEventListener("pointermove", (e) => { mx = (e.clientX / W) * 2 - 1; my = (e.clientY / H) * 2 - 1; });
const PAR = { bg: 6, tree: 11, fg: 18 };

function frame(t) {
  t /= 1000;
  pmx += (mx - pmx) * 0.05; pmy += (my - pmy) * 0.05;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const off = (k) => [-pmx * PAR[k] * DPR, -pmy * PAR[k] * DPR * 0.6];
  ctx.drawImage(layers.bg, ...off("bg"));

  // light shafts falling through the canopy
  view(ctx, -pmx * PAR.bg, -pmy * PAR.bg * 0.6);
  ctx.globalCompositeOperation = "lighter";
  for (const s of shafts) {
    const a = 0.07 + 0.05 * Math.sin(t * 0.6 + s.p);
    const g = ctx.createLinearGradient(0, -300, 0, 820);
    g.addColorStop(0, `rgba(170,255,235,${a * 1.6})`); g.addColorStop(1, "rgba(170,255,235,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(s.x - s.w * 0.35, -300); ctx.lineTo(s.x + s.w * 0.35, -300); ctx.lineTo(s.x + s.w, 820); ctx.lineTo(s.x - s.w, 820); ctx.closePath(); ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(layers.tree, ...off("tree"));

  // glowing veins pulse through the tree
  view(ctx, -pmx * PAR.tree, -pmy * PAR.tree * 0.6);
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowColor = "#7ff5d6"; ctx.shadowBlur = 14 * S * DPR;
  veins.forEach((v, i) => {
    ctx.globalAlpha = 0.35 + 0.3 * Math.sin(t * 1.4 + i * 0.7);
    polyline(ctx, v); ctx.strokeStyle = "#8ff7dc"; ctx.lineWidth = 2.2; ctx.stroke();
  });
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  const pulse = ctx.createRadialGradient(800, 330, 0, 800, 330, 430);
  pulse.addColorStop(0, `rgba(160,255,220,${0.08 + 0.05 * Math.sin(t * 0.9)})`); pulse.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = pulse; ctx.fillRect(300, -100, 1000, 900);
  ctx.globalCompositeOperation = "source-over";

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(layers.fg, ...off("fg"));

  // drifting mist and rising sparks
  view(ctx, -pmx * PAR.fg, -pmy * PAR.fg * 0.6);
  ctx.globalAlpha = 0.35;
  for (const m of mists) {
    m.x += m.d * m.v * 0.016; if (m.x > 1900) m.x = -300; if (m.x < -300) m.x = 1900;
    curl(ctx, m.x, m.y, m.r, "rgba(200,250,235,0.55)", "rgba(120,200,180,0.6)");
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "lighter";
  for (const p of motes) {
    p.y -= p.v * 0.016; p.x += Math.sin(t + p.p) * 0.2;
    if (p.y < -40) { p.y = 920; p.x = rand() * 1600; }
    const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + p.p));
    const col = p.gold ? "255,220,140" : "160,255,230";
    ctx.fillStyle = `rgba(${col},${a * 0.25})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(${col},${a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";

  placeApples();
  requestAnimationFrame(frame);
}

// ---------- The apples (real buttons over the painting) ----------
const holder = document.getElementById("apples");
const APPLE_SVG = (fill) => `
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M50 8 C52 16 52 22 50 30" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M50 8 C52 16 52 22 50 30" stroke="#6a4a2a" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M50 30 C32 12 6 24 10 54 C13 80 34 98 50 90 C66 98 87 80 90 54 C94 24 68 12 50 30 Z" fill="url(#${fill})" stroke="${INK}" stroke-width="5.5"/>
    <path d="M26 44 C24 36 30 30 36 30" stroke="#fff" stroke-opacity="0.75" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M52 22 C62 8 80 8 86 14 C78 26 62 28 52 22 Z" fill="url(#leafGreen)" stroke="${INK}" stroke-width="4"/>
    <path d="M55 21 C64 16 74 14 82 15" stroke="${INK}" stroke-width="1.8" fill="none" opacity="0.6"/>
  </svg>`;

const appleEls = [];
function makeApple(f, golden = false) {
  const b = document.createElement(golden ? "button" : "a");
  b.className = "apple" + (golden ? " golden" : "");
  if (!golden) b.href = f.href;
  b.setAttribute("aria-label", golden ? "The Forbidden Fruit: go to Earth" : `${f.label} essay`);
  b.innerHTML = (golden ? '<span class="rays"></span>' : "") + APPLE_SVG(golden ? "appleGold" : "appleRed") + `<span class="plaque">${f.label}</span>`;
  holder.appendChild(b);
  appleEls.push({ el: b, f, golden });
  return b;
}
FRUIT.forEach((f) => makeApple(f));
const goldenBtn = makeApple(FORBIDDEN, true);

function placeApples() {
  const dx = -pmx * PAR.tree, dy = -pmy * PAR.tree * 0.6;
  for (const a of appleEls) {
    if (a.el.classList.contains("falling")) continue;
    const size = Math.max(a.golden ? 40 : 30, (a.golden ? 86 : 58) * S);
    a.el.style.setProperty("--size", size + "px");
    a.el.style.left = OX + a.f.x * S + dx + "px";
    a.el.style.top = OY + a.f.y * S + dy + "px";
  }
}

// ---------- The Forbidden Fruit: it falls, and carries you down to Earth ----------
const earth = document.getElementById("earth");
const flash = document.getElementById("flash");
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let atEarth = false, busy = false;

function animate(duration, step) {
  return new Promise((done) => {
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      step(p);
      p < 1 ? requestAnimationFrame(tick) : done();
    };
    requestAnimationFrame(tick);
  });
}

goldenBtn.addEventListener("click", async () => {
  if (busy) return;
  busy = true;
  const r = goldenBtn.getBoundingClientRect();
  const sx = r.left + r.width / 2, sy = r.top + r.height / 2;
  goldenBtn.classList.add("falling");
  goldenBtn.style.left = sx + "px"; goldenBtn.style.top = sy + "px";
  // 1. a bright pulse as it is plucked
  await animate(450, (p) => { goldenBtn.style.transform = `scale(${1 + Math.sin(p * Math.PI) * 0.35})`; });
  // 2. it falls while the page sinks down to Earth
  const start = window.scrollY, end = earth.offsetTop;
  await animate(2200, (p) => {
    const e = easeInOut(p);
    window.scrollTo(0, start + (end - start) * e);
    goldenBtn.style.left = lerp(sx, W / 2, e) + "px";
    goldenBtn.style.top = lerp(sy, H * 0.5, e) + "px";
    goldenBtn.style.transform = `rotate(${Math.sin(e * Math.PI * 2) * 18}deg) scale(${1 + e * 1.4})`;
  });
  // 3. a golden flash, and Earth appears
  await animate(500, (p) => { flash.style.opacity = p; });
  goldenBtn.style.visibility = "hidden";
  earth.classList.add("shown");
  await animate(900, (p) => { flash.style.opacity = 1 - p; });
  atEarth = true; busy = false;
  document.getElementById("return").focus({ preventScroll: true });
});

document.getElementById("return").addEventListener("click", async () => {
  if (busy) return;
  busy = true;
  const start = window.scrollY;
  await animate(1600, (p) => window.scrollTo(0, start * (1 - easeInOut(p))));
  earth.classList.remove("shown");
  goldenBtn.classList.remove("falling");
  goldenBtn.style.transform = ""; goldenBtn.style.visibility = "";
  atEarth = false; busy = false;
});

// ---------- Start ----------
function paintAll() {
  computeView();
  paintBackground(); paintTree(); paintForeground();
  if (atEarth) window.scrollTo(0, earth.offsetTop);
}
let resizeTimer;
window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(paintAll, 200); });
paintAll();
requestAnimationFrame(frame);
window.scrollTo(0, 0);
document.getElementById("loading").classList.add("done");
window.__gardenReady = true;
