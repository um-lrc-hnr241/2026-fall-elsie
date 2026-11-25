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

// ---------- Palette (bright, lush and luminous) ----------
const INK = "#082019";
const C = {
  bark: "#3b6a5e", bark2: "#467b6d", barkHi: "#86cdb3", barkLine: "#24493f",
  leaf: ["#125c40", "#21885a", "#52c084", "#eafff6"],       // shade, base, light, rim
  bush: ["#145a40", "#1f7d54", "#4cb57c", "#d0ffe6"],
  dark: ["#0f3f30", "#16573f", "#2a8560", "#a8f5d0"],
  stone: "#6aa79a", stoneHi: "#b2e6d8", marble: "#e4f7f0", marbleShade: "#a9d4c8",
  water: "#effffa", flower: "#8fb4ff",
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
  // leave room for the heading above and the island link below
  const top = W < 700 ? 190 : 215, bottom = W < 700 ? 70 : 80;
  S = Math.min(W / 840, (H - top - bottom) / 900);
  OX = W / 2 - 800 * S;
  OY = top + 40 * S + Math.max(0, (H - top - bottom - 900 * S) * 0.4);
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

// a pointed leaf from a base point, pointing at angle a
function leafShape(g, x, y, len, wid, a) {
  const tx = x + Math.cos(a) * len, ty = y + Math.sin(a) * len;
  const nx = -Math.sin(a) * wid, ny = Math.cos(a) * wid;
  const mx = (x + tx) / 2, my = (y + ty) / 2;
  g.beginPath(); g.moveTo(x, y);
  g.quadraticCurveTo(mx + nx, my + ny, tx, ty);
  g.quadraticCurveTo(mx - nx, my - ny, x, y);
  g.closePath();
}

// A crisp cluster of foliage: overlapping puffs with leaf tips around the edge,
// one clean outline, three-tone shading and a glowing rim on the side facing the light.
function cluster(g, cx, cy, rad, pal, light = [800, 360], opts = {}) {
  const { lw = 5, inkCol = INK, blossoms = 0, edge = true } = opts;
  const puffs = [];
  const n = 5 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.5, d = rad * (0.35 + rand() * 0.25);
    puffs.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, rad * (0.42 + rand() * 0.18)]);
  }
  puffs.push([cx, cy, rad * 0.62]);
  // leaf tips peeking out around the edge
  if (edge) {
    for (let k = 0; k < 9 + rad / 10; k++) {
      const [px, py, pr] = puffs[Math.floor(rand() * (puffs.length - 1))];
      const a = Math.atan2(py - cy, px - cx) + (rand() - 0.5) * 1.6;
      const bx = px + Math.cos(a) * pr * 0.8, by = py + Math.sin(a) * pr * 0.8;
      leafShape(g, bx, by, pr * (0.45 + rand() * 0.25), pr * 0.16, a);
      g.fillStyle = rand() < 0.5 ? pal[1] : pal[2]; g.fill();
      g.strokeStyle = inkCol; g.lineWidth = lw * 0.55; g.stroke();
    }
  }
  const shape = () => { g.beginPath(); puffs.forEach(([x, y, r]) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2); }); };
  shape(); g.strokeStyle = inkCol; g.lineWidth = lw; g.stroke();
  shape(); g.fillStyle = pal[1]; g.fill();
  g.save(); shape(); g.clip();
  g.fillStyle = pal[0];
  g.beginPath(); g.arc(cx + rad * 0.2, cy + rad * 0.6, rad * 0.9, 0, Math.PI * 2); g.fill();
  g.fillStyle = pal[2];
  puffs.forEach(([x, y, r]) => { g.beginPath(); g.arc(x - r * 0.18, y - r * 0.32, r * 0.5, 0, Math.PI * 2); g.fill(); });
  // a few crisp inner leaves for texture
  for (let k = 0; k < 3 + rad / 25; k++) {
    const [px, py, pr] = puffs[Math.floor(rand() * puffs.length)];
    leafShape(g, px + (rand() - 0.5) * pr, py + (rand() - 0.2) * pr * 0.6, pr * 0.32, pr * 0.1, -Math.PI / 2 + (rand() - 0.5) * 1.6);
    g.fillStyle = pal[2]; g.fill(); g.strokeStyle = pal[0]; g.lineWidth = 1.5; g.stroke();
  }
  const la = Math.atan2(light[1] - cy, light[0] - cx);
  g.strokeStyle = pal[3]; g.lineWidth = 3; g.globalAlpha = 0.9;
  puffs.forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r - 2.5, la - 0.55, la + 0.55); g.stroke(); });
  g.globalAlpha = 1;
  g.restore();
  // little blossoms
  for (let k = 0; k < blossoms; k++) {
    const [px, py, pr] = puffs[Math.floor(rand() * puffs.length)];
    blossom(g, px + (rand() - 0.5) * pr * 1.2, py - rand() * pr * 0.7, 4 + rand() * 3, rand() < 0.6 ? "#ffffff" : "#ffc6e2");
  }
}

function blossom(g, x, y, r, col) {
  g.beginPath();
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.moveTo(x + Math.cos(a) * r + r * 0.6, y + Math.sin(a) * r); g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.6, 0, Math.PI * 2); }
  g.fillStyle = col; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke();
  g.beginPath(); g.arc(x, y, r * 0.45, 0, Math.PI * 2); g.fillStyle = "#ffd970"; g.fill();
}

// a big tropical leaf with a midrib and veins, two-tone
function bigLeaf(g, x, y, len, a, light, dark) {
  const wid = len * 0.32;
  leafShape(g, x, y, len, wid, a);
  g.fillStyle = dark; g.fill();
  g.save(); g.clip();
  const tx = x + Math.cos(a) * len, ty = y + Math.sin(a) * len;
  g.beginPath(); g.moveTo(x, y); g.lineTo(tx, ty);
  g.lineTo(tx - Math.sin(a) * wid * 2, ty + Math.cos(a) * wid * 2); g.lineTo(x - Math.sin(a) * wid * 2, y + Math.cos(a) * wid * 2); g.closePath();
  g.fillStyle = light; g.fill();
  g.restore();
  leafShape(g, x, y, len, wid, a); g.strokeStyle = INK; g.lineWidth = 4; g.stroke();
  g.beginPath(); g.moveTo(x, y); g.lineTo(tx, ty); g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke();
  for (let k = 1; k < 7; k++) {
    const t = k / 7, px = x + Math.cos(a) * len * t, py = y + Math.sin(a) * len * t, vl = wid * 0.9 * Math.sin(Math.PI * t);
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(px, py);
      g.lineTo(px + Math.cos(a + s * 0.9) * vl, py + Math.sin(a + s * 0.9) * vl);
      g.strokeStyle = "rgba(8,32,25,0.55)"; g.lineWidth = 1.6; g.stroke();
    }
  }
}

// a curling fern frond
function fern(g, x, y, len, a, col) {
  const pts = [];
  for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push([x + Math.cos(a + t * 0.9) * len * t, y + Math.sin(a + t * 0.9) * len * t]); }
  polyline(g, pts); g.strokeStyle = INK; g.lineWidth = 4; g.stroke();
  polyline(g, pts); g.strokeStyle = col; g.lineWidth = 2; g.stroke();
  pts.forEach(([px, py], i) => {
    if (i < 1 || i > 13) return;
    const t = i / 14, d = a + t * 0.9, l = len * 0.16 * Math.sin(Math.PI * t) + 4;
    for (const s of [-1, 1]) { leafShape(g, px, py, l, l * 0.3, d + s * 1.2); g.fillStyle = col; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.3; g.stroke(); }
  });
}

// a sparkle: four-pointed star
function sparkle(g, x, y, r) {
  g.beginPath(); g.moveTo(x, y - r);
  g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r);
  g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.closePath();
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

// ---------- 1) Background: sky, terraced misty cliffs, winding waterfalls, temples ----------
function paintBackground() {
  seed = 1234;
  const g = layers.bg.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, layers.bg.width, layers.bg.height);
  // light blue sky fading to pale mint at the horizon
  const sky = g.createLinearGradient(0, 0, 0, layers.bg.height);
  sky.addColorStop(0, "#9fd4ee"); sky.addColorStop(0.35, "#c8ecf2"); sky.addColorStop(0.6, "#dcf7ee"); sky.addColorStop(1, "#bfeedd");
  g.fillStyle = sky; g.fillRect(0, 0, layers.bg.width, layers.bg.height);
  view(g);

  const LINE = "#2c6f60";
  // Greek-style curling clouds in the sky
  for (const [x, y, r] of [[120, -230, 46], [330, -330, 36], [1270, -330, 36], [1480, -210, 40], [-140, -120, 40], [1760, -110, 42]]) {
    curl(g, x, y, r, "rgba(255,255,255,0.95)", "#8cc9dc");
  }

  // a terrace band: wavy top, ledge line, drippy bottom edge like hanging stone
  const band = (top, height, fill, light, x0 = -900, x1 = 2500, lw = 2) => {
    g.beginPath();
    g.moveTo(x0, top(x0));
    for (let x = x0; x <= x1; x += 20) g.lineTo(x, top(x));
    let x = x1;
    while (x > x0) { // jagged drips along the bottom
      const w = 14 + rand() * 30, y = top(x) + height;
      g.lineTo(x, y); g.lineTo(x - w * 0.5, y + 6 + rand() * 28); g.lineTo(x - w, y);
      x -= w;
    }
    g.closePath();
    g.fillStyle = fill; g.fill(); g.strokeStyle = LINE; g.lineWidth = lw; g.stroke();
    // ledge rim and cracks
    g.beginPath();
    for (let xx = x0; xx <= x1; xx += 20) xx === x0 ? g.moveTo(xx, top(xx) + 7) : g.lineTo(xx, top(xx) + 7);
    g.strokeStyle = light; g.lineWidth = 2.5; g.stroke();
    for (let k = 0; k < (x1 - x0) / 70; k++) {
      const cx = x0 + rand() * (x1 - x0), cy = top(cx) + 12 + rand() * height * 0.5;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + (rand() - 0.5) * 8, cy + 10 + rand() * height * 0.4);
      g.strokeStyle = LINE; g.lineWidth = 1.2; g.stroke();
    }
  };
  const valley = (x, depth) => depth * Math.exp(-(((x - 800) / 520) ** 2)); // terraces dip toward the middle

  // far terraces: palest, stepping down into the valley
  const farCols = [["#d4f3ea", "#f2fffb"], ["#c3ede2", "#e8fff8"], ["#b1e6d8", "#e0fbf2"], ["#9fdccd", "#d6f7ec"], ["#8ed3c2", "#ccf3e6"]];
  farCols.forEach(([fill, light], i) => {
    const base = -40 + i * 95;
    band((x) => base + valley(x, 140 - i * 10) + Math.sin(x * 0.013 + i) * 10, 70 + i * 8, fill, light, -900, 2500, 1.6);
  });
  // misty light pooling in the valley
  const glow = g.createRadialGradient(800, 380, 0, 800, 380, 560);
  glow.addColorStop(0, "rgba(240,255,250,0.75)"); glow.addColorStop(1, "rgba(240,255,250,0)");
  g.fillStyle = glow; g.fillRect(200, -200, 1200, 1100);

  // winding streams on the valley floor
  for (const [sx, dir] of [[700, -1], [900, 1]]) {
    const pts = curve([[sx, 470], [sx + dir * 60, 520], [sx - dir * 40, 570], [sx + dir * 90, 620], [sx + dir * 20, 680]], 10);
    taperPath(g, pts, 18, 46);
    g.fillStyle = "rgba(240,255,252,0.9)"; g.fill(); g.strokeStyle = LINE; g.lineWidth = 1.6; g.stroke();
  }

  // towering rock formations left and right: stacks of rounded stone lobes at three depths,
  // each with a lit top, a shaded side and dripping stone beneath
  const lobe = (x, top, w, h, fill, topCol, shade) => {
    const L = x - w / 2, R = x + w / 2, peak = top - 10 - rand() * 14;
    const path = () => {
      g.beginPath();
      g.moveTo(L, top + h);
      g.quadraticCurveTo(L - 8, top + h * 0.5, L + 6, top + 22);
      g.quadraticCurveTo(L + w * 0.2, peak, x + (rand() - 0.5) * 10, peak + 4);
      g.quadraticCurveTo(R - w * 0.15, peak - 2, R - 6, top + 20);
      g.quadraticCurveTo(R + 8, top + h * 0.5, R, top + h);
      let xx = R;
      while (xx > L) { const dw = 10 + rand() * 18; g.lineTo(xx - dw * 0.5, top + h + 8 + rand() * 26); g.lineTo(xx - dw, top + h); xx -= dw; }
      g.closePath();
    };
    path(); g.fillStyle = fill; g.fill();
    g.save(); g.clip();
    g.fillStyle = shade; g.fillRect(x + w * 0.18, top - 40, w, h + 80);           // shaded side
    g.beginPath(); g.ellipse(x - w * 0.05, top + 8, w * 0.55, 26, 0, 0, Math.PI * 2); g.fillStyle = topCol; g.fill(); // lit top
    for (let k = 0; k < 3; k++) {                                                   // cracks and drips
      const cy = top + 40 + rand() * (h - 60), cx = L + 14 + rand() * (w - 28);
      g.beginPath(); g.moveTo(cx - 16, cy); g.lineTo(cx + 18, cy + 2);
      for (let d = -12; d < 16; d += 7 + rand() * 5) { g.moveTo(cx + d, cy + 1); g.lineTo(cx + d + 3, cy + 8 + rand() * 12); }
      g.strokeStyle = LINE; g.lineWidth = 1.2; g.stroke();
    }
    g.restore();
    g.strokeStyle = LINE; g.lineWidth = 2.2; g.stroke();
  };
  for (const side of [-1, 1]) {
    const X = (x) => (side < 0 ? x : 1600 - x);
    const tiers = [
      { cols: ["#bfece0", "#ecfdf7", "#a4dccd"], xs: [40, 160, 280, 395, 500], top: [-260, -180, -300, -120, -40], w: 140, h: 240 },
      { cols: ["#94d6c3", "#d0f5e9", "#77c3ad"], xs: [-20, 100, 215, 330, 440], top: [-160, -60, -200, 20, 120], w: 150, h: 250 },
      { cols: ["#68bca5", "#a9e8d4", "#4fa38d"], xs: [-60, 60, 175, 290, 380], top: [-40, 80, -80, 200, 330], w: 160, h: 260 },
    ];
    for (const t of tiers) {
      t.xs.forEach((x, i) => {
        for (let k = 0; k < 4; k++) {
          const top = t.top[i] + k * (t.h - 20) + (rand() - 0.5) * 30;
          if (top > 720) break;
          lobe(X(x + (rand() - 0.5) * 20), top, t.w * (0.85 + rand() * 0.3), t.h, ...t.cols);
        }
      });
    }
  }

  // little Greek temples on the left cliffs
  const temple = (x, y, s) => {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.beginPath(); g.rect(-34, -6, 68, 8); g.rect(-30, -10, 60, 4); g.fillStyle = "#e8f7f2"; g.fill(); g.strokeStyle = LINE; g.lineWidth = 1.6; g.stroke();
    for (let k = 0; k < 4; k++) { g.beginPath(); g.rect(-26 + k * 16, -40, 7, 30); g.fillStyle = "#f4fffb"; g.fill(); g.stroke(); }
    g.beginPath(); g.rect(-32, -46, 64, 6); g.fillStyle = "#e8f7f2"; g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-36, -46); g.lineTo(0, -64); g.lineTo(36, -46); g.closePath(); g.fillStyle = "#dff3ec"; g.fill(); g.stroke();
    g.beginPath(); g.ellipse(-6, -60, 22, 6, -0.2, 0, Math.PI * 2); g.fillStyle = "#6dc69b"; g.fill(); g.stroke();
    g.restore();
  };
  temple(395, -128, 0.75); temple(160, -188, 0.8); temple(290, 206, 0.8); temple(1205, -128, 0.7);

  // wide winding waterfalls with dashed edges and swirling curls
  const fall = (pts0, w0, w1) => {
    const pts = curve(pts0, 14);
    taperPath(g, pts, w0, w1);
    g.fillStyle = "rgba(236,255,250,0.92)"; g.fill();
    g.setLineDash([7, 6]); g.strokeStyle = "#5fae98"; g.lineWidth = 2; g.stroke(); g.setLineDash([]);
    for (let k = 0; k < 3; k++) {
      polyline(g, pts.map(([x, y], i) => [x + (k - 1) * lerp(w0, w1, i / pts.length) * 0.25, y]));
      g.strokeStyle = "rgba(150,215,200,0.6)"; g.lineWidth = 1.4; g.stroke();
    }
    for (let i = 4; i < pts.length; i += 9) { // spiral curls along the edges
      const [x, y] = pts[i], wd = lerp(w0, w1, i / pts.length) / 2;
      for (const s of [-1, 1]) {
        g.beginPath();
        for (let a = 0; a < Math.PI * 3; a += 0.25) {
          const r = 9 * (1 - a / (Math.PI * 3.3));
          const px = x + s * wd * 0.75 + Math.cos(a * s) * r, py = y + Math.sin(a * s) * r;
          a ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.strokeStyle = "#7cc3b0"; g.lineWidth = 1.5; g.stroke();
      }
    }
    const [bx, by] = pts[pts.length - 1];
    for (let k = 0; k < 4; k++) curl(g, bx - 54 + k * 36, by + (k % 2) * 10, 20 + rand() * 8, "rgba(250,255,253,0.95)", "#8fd6c2");
  };
  fall([[230, -230], [270, -40], [300, 150], [380, 360], [500, 590]], 56, 100);
  fall([[1370, -200], [1330, -10], [1300, 170], [1220, 370], [1100, 590]], 52, 96);
  fall([[455, -60], [470, 120], [520, 300], [600, 500]], 34, 60);
  fall([[800, -120], [790, 60], [810, 240], [800, 420]], 30, 50);

  // soft mist drifting through the valley
  for (const [y0, y1, a] of [[200, 520, 0.4], [420, 700, 0.5]]) {
    const f = g.createLinearGradient(0, y0, 0, y1);
    f.addColorStop(0, "rgba(245,255,252,0)"); f.addColorStop(0.6, `rgba(245,255,252,${a})`); f.addColorStop(1, "rgba(245,255,252,0)");
    g.fillStyle = f; g.fillRect(-1000, y0, 3600, y1 - y0);
  }

  // a lush ridge behind the clearing
  g.beginPath(); g.moveTo(-900, 1300);
  for (let x = -900; x <= 2500; x += 30) g.lineTo(x, 610 + Math.sin(x * 0.01) * 24 + Math.sin(x * 0.027) * 12);
  g.lineTo(2500, 1300); g.closePath();
  g.fillStyle = "#3f9e78"; g.fill(); ink(g, 3);
  for (let i = 0; i < 20; i++) {
    const x = -100 + i * 95 + rand() * 30;
    if (Math.abs(x - 800) < 150) continue;
    cluster(g, x, 640 + rand() * 40, 46 + rand() * 24, C.bush, [800, 380], { lw: 4.5, blossoms: 3 });
  }
  // vines trailing from the cliff tops
  for (let i = 0; i < 16; i++) {
    const side = i % 2 ? 1 : -1, x = side < 0 ? 200 + rand() * 260 : 1400 - rand() * 260, top = -300 + rand() * 200, len = 120 + rand() * 220;
    const pts = curve([[x, top], [x + (rand() - 0.5) * 40, top + len * 0.5], [x + (rand() - 0.5) * 50, top + len]], 8);
    polyline(g, pts); g.strokeStyle = INK; g.lineWidth = 4.5; g.stroke();
    polyline(g, pts); g.strokeStyle = "#4fae86"; g.lineWidth = 2.2; g.stroke();
    for (let k = 2; k < pts.length; k += 2) {
      const [px, py] = pts[k];
      leafShape(g, px, py, 12, 4, k % 4 ? 0.5 : Math.PI - 0.5);
      g.fillStyle = "#6dd49b"; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.4; g.stroke();
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

  const aura = g.createRadialGradient(800, 330, 0, 800, 330, 560);
  aura.addColorStop(0, "rgba(240,255,250,0.6)"); aura.addColorStop(0.45, "rgba(170,255,225,0.2)"); aura.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = aura; g.fillRect(200, -250, 1200, 1100);

  const roots = [[470, 830], [560, 860], [660, 880], [740, 900], [860, 900], [940, 880], [1040, 860], [1130, 830], [610, 805], [1000, 805]];
  for (const [ex, ey] of roots) {
    const pts = curve([[800 + (ex - 800) * 0.08, 735], [lerp(800, ex, 0.5), lerp(745, ey, 0.4) - 12], [ex, ey]], 12);
    taperPath(g, pts, 46, 6);
    g.fillStyle = C.bark; g.fill(); ink(g, 3);
    polyline(g, pts.slice(1, -2).map(([x, y]) => [x, y - 6])); g.strokeStyle = C.barkHi; g.lineWidth = 2.5; g.stroke();
    veins.push(pts.slice(0, -1).map(([x, y]) => [x, y + 2]));
  }
  const strand = (dir) => curve([[800 + dir * 70, 770], [800 + dir * 30, 660], [800 - dir * 40, 560], [800 + dir * 20, 470], [800 - dir * 10, 400]], 12);
  for (const [dir, col] of [[1, C.bark], [-1, C.bark2]]) {
    const pts = strand(dir);
    taperPath(g, pts, 120, 62);
    g.fillStyle = col; g.fill(); ink(g, 3.5);
    for (let k = 0; k < 3; k++) {
      polyline(g, pts.map(([x, y], i) => [x + (k - 1) * lerp(22, 10, i / pts.length), y]));
      g.strokeStyle = C.barkLine; g.lineWidth = 1.8; g.stroke();
    }
    polyline(g, pts.map(([x, y], i) => [x - lerp(38, 18, i / pts.length), y])); g.strokeStyle = C.barkHi; g.lineWidth = 3; g.stroke();
    veins.push(pts.map(([x, y], i) => [x + Math.sin(i * 0.5) * 8, y]));
  }
  const ends = [[470, 300], [600, 190], [700, 120], [800, 90], [900, 120], [1000, 190], [1130, 300], [560, 330], [1040, 330]];
  for (const [ex, ey] of ends) {
    const pts = curve([[800, 420], [lerp(800, ex, 0.4), lerp(420, ey, 0.55) + 20], [ex, ey]], 12);
    taperPath(g, pts, 40, 8);
    g.fillStyle = C.bark2; g.fill(); ink(g, 3);
    polyline(g, pts.slice(0, -2).map(([x, y]) => [x, y - 5])); g.strokeStyle = C.barkHi; g.lineWidth = 2; g.stroke();
  }
  // the crown, back to front, bursting with blossoms
  const spots = [];
  for (let i = 0; i < 40; i++) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand());
    spots.push([800 + Math.cos(a) * d * 430, 225 + Math.sin(a) * d * 175, 58 + rand() * 46]);
  }
  spots.push([800, 55, 92], [600, 125, 82], [1000, 125, 82], [440, 270, 72], [1160, 270, 72], [800, 160, 80]);
  spots.sort((a, b) => Math.abs(b[0] - 800) - Math.abs(a[0] - 800) || a[1] - b[1]);
  for (const [x, y, r] of spots) cluster(g, x, y, r, C.leaf, [800, 380], { lw: 5, blossoms: 3 });
  // glowing tendrils with luminous flowers
  for (let i = 0; i < 24; i++) {
    const x = 480 + rand() * 640, y = 300 + rand() * 90, len = 50 + rand() * 120;
    const pts = curve([[x, y], [x + (rand() - 0.5) * 20, y + len * 0.5], [x + (rand() - 0.5) * 30, y + len]], 8);
    polyline(g, pts); g.strokeStyle = INK; g.lineWidth = 4; g.stroke();
    polyline(g, pts); g.strokeStyle = "#6dd49b"; g.lineWidth = 2; g.stroke();
    const [tx, ty] = pts[pts.length - 1];
    star(g, tx, ty + 4, 7); g.fillStyle = "#d6efff"; g.fill(); ink(g, 1.4);
  }
}

// ---------- 3) Foreground: glowing spring, stone path, flowers, big leaves ----------
function paintForeground() {
  seed = 4321;
  const g = layers.fg.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, layers.fg.width, layers.fg.height);
  view(g);
  // lush ground
  g.beginPath(); g.moveTo(-900, 1500); g.lineTo(-900, 800);
  g.bezierCurveTo(200, 790, 500, 745, 800, 745); g.bezierCurveTo(1100, 745, 1400, 790, 2500, 800);
  g.lineTo(2500, 1500); g.closePath();
  const gg = g.createLinearGradient(0, 740, 0, 1080);
  gg.addColorStop(0, "#5cc08e"); gg.addColorStop(0.35, "#349a6c"); gg.addColorStop(1, "#155240");
  g.fillStyle = gg; g.fill(); ink(g, 3.5);
  // the glowing spring at the foot of the tree
  const sp = g.createRadialGradient(800, 798, 0, 800, 798, 180);
  sp.addColorStop(0, "#ffffff"); sp.addColorStop(0.5, "#c8fbec"); sp.addColorStop(1, "#7fdcc0");
  g.beginPath(); g.ellipse(800, 798, 175, 30, 0, 0, Math.PI * 2); g.fillStyle = sp; g.fill(); ink(g, 3);
  for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(800, 798, 60 + k * 38, 8 + k * 6, 0, 0, Math.PI * 2); g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 1.6; g.stroke(); }
  // stone path toward the spring
  for (let row = 0; row < 6; row++) {
    const y0 = 838 + row * row * 9 + row * 20, y1 = 838 + (row + 1) * (row + 1) * 9 + (row + 1) * 20 - 4;
    const w0 = 50 + row * 44, w1 = 50 + (row + 1) * 44, n = 2 + Math.floor(row / 2);
    for (let k = 0; k < n; k++) {
      const a0 = -w0 + (2 * w0 * k) / n + 3, a1 = -w0 + (2 * w0 * (k + 1)) / n - 3;
      const b0 = -w1 + (2 * w1 * k) / n + 3, b1 = -w1 + (2 * w1 * (k + 1)) / n - 3;
      g.beginPath(); g.moveTo(800 + a0, y0); g.lineTo(800 + a1, y0); g.lineTo(800 + b1, y1); g.lineTo(800 + b0, y1); g.closePath();
      g.fillStyle = rand() < 0.5 ? C.stone : "#5e9a8d"; g.fill(); ink(g, 2.5);
      g.beginPath(); g.moveTo(800 + a0 + 4, y0 + 3); g.lineTo(800 + a1 - 4, y0 + 3); g.strokeStyle = C.stoneHi; g.lineWidth = 2; g.stroke();
      if (rand() < 0.5) { g.beginPath(); g.ellipse(800 + lerp(b0, b1, rand()), y1 - 3, 12, 4, 0, 0, Math.PI * 2); g.fillStyle = "#4fb47c"; g.fill(); }
    }
  }
  // marble columns wrapped in ivy and flowers
  const column = (x, base, ht, tilt) => {
    g.save(); g.translate(x, base); g.rotate(tilt);
    g.beginPath(); g.rect(-26, -ht, 52, ht); g.fillStyle = C.marble; g.fill(); ink(g, 3);
    g.beginPath(); g.rect(10, -ht, 16, ht); g.fillStyle = C.marbleShade; g.fill();
    for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(k * 9, -ht + 6); g.lineTo(k * 9, -6); g.strokeStyle = C.marbleShade; g.lineWidth = 2; g.stroke(); }
    g.beginPath(); g.moveTo(-26, -ht); g.lineTo(-12, -ht - 16); g.lineTo(0, -ht - 6); g.lineTo(12, -ht - 22); g.lineTo(26, -ht); g.closePath();
    g.fillStyle = C.marble; g.fill(); ink(g, 3);
    g.beginPath(); g.rect(-34, -12, 68, 14); g.fillStyle = C.marbleShade; g.fill(); ink(g, 3);
    for (let k = 0; k < 9; k++) {
      leafShape(g, -22 + rand() * 44, -rand() * ht, 14, 5, rand() * 6.28);
      g.fillStyle = rand() < 0.5 ? "#4fb47c" : "#6dd49b"; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.3; g.stroke();
    }
    for (let k = 0; k < 3; k++) blossom(g, -18 + rand() * 36, -rand() * ht * 0.8, 4, "#ffffff");
    g.restore();
  };
  column(330, 800, 170, -0.04);
  column(1270, 805, 120, 0.12);
  // grass tufts
  for (let i = 0; i < 140; i++) {
    const x = -200 + rand() * 2000, y = 760 + Math.pow(rand(), 0.7) * 260;
    if (Math.abs(x - 800) < 40 + (y - 790) * 1.6 && y > 820) continue;
    const s = 0.6 + (y - 760) / 260;
    g.beginPath();
    for (let k = -2; k <= 2; k++) { g.moveTo(x + k * 4 * s, y); g.quadraticCurveTo(x + k * 6 * s, y - 14 * s, x + k * 9 * s, y - (16 + rand() * 10) * s); }
    g.strokeStyle = INK; g.lineWidth = 4 * s; g.stroke();
    g.strokeStyle = rand() < 0.5 ? "#7fe0a8" : "#5cc98e"; g.lineWidth = 2 * s; g.stroke();
  }
  // patches of white flowers, blue stars and pink buds
  for (let p = 0; p < 34; p++) {
    const px = -200 + rand() * 2000, py = 770 + Math.pow(rand(), 0.8) * 230;
    if (Math.abs(px - 800) < 60 + (py - 790) * 1.6 && py > 820) continue;
    const s = 0.7 + (py - 770) / 230;
    for (let k = 0; k < 7; k++) blossom(g, px + (rand() - 0.5) * 50 * s, py + (rand() - 0.5) * 16 * s, (3 + rand() * 2) * s, "#ffffff");
  }
  for (let i = 0; i < 160; i++) {
    const x = -200 + rand() * 2000, y = 770 + Math.pow(rand(), 0.8) * 240;
    if (Math.abs(x - 800) < 60 + (y - 790) * 1.6 && y > 820) continue;
    const r = 4 + (y - 770) / 45 + rand() * 2;
    if (rand() < 0.8) { star(g, x, y, r); g.fillStyle = C.flower; g.fill(); ink(g, 1.3); g.beginPath(); g.arc(x, y, r * 0.22, 0, Math.PI * 2); g.fillStyle = "#fff8d0"; g.fill(); }
    else blossom(g, x, y, r * 0.6, "#ffb3d9");
  }
  // bushes, ferns and big tropical leaves framing the bottom corners
  for (const [x, y, r] of [[80, 870, 130], [250, 915, 100], [1520, 870, 130], [1350, 915, 100], [440, 935, 80], [1160, 940, 80]]) {
    cluster(g, x, y, r, C.bush, [800, 500], { lw: 5, blossoms: 5 });
  }
  for (const side of [-1, 1]) {
    const X = (x) => (side < 0 ? x : 1600 - x), A = (a) => (side < 0 ? a : Math.PI - a);
    for (let i = 0; i < 5; i++) fern(g, X(-20 + i * 40), 980, 150 + rand() * 60, A(-1.2 + i * 0.12), "#6dd49b");
    for (const [x, y, len, a, l, d] of [[-60, 1000, 300, -0.9, "#6fd39a", "#36a06e"], [40, 1020, 260, -0.55, "#5cc98e", "#2a8a5c"], [-40, 880, 240, -0.25, "#7fe0a8", "#3fae78"], [120, 1040, 220, -1.25, "#5cc98e", "#2f9a6c"]]) {
      bigLeaf(g, X(x), y, len, A(a), l, d);
    }
    // leaves hanging into the top corners
    for (const [x, y, len, a] of [[-40, -60, 260, 0.55], [60, -80, 220, 0.95], [-60, 80, 200, 0.2]]) bigLeaf(g, X(x), y, len, A(a), "#6fd39a", "#2f9a6c");
  }
}

// ---------- Live effects: light shafts, pulsing veins, sparks, mist ----------
const motes = Array.from({ length: 190 }, () => ({
  x: rand() * 1600, y: rand() * 900, s: 0.6 + rand() * 1.8, v: 6 + rand() * 18, p: rand() * 6.28, gold: rand() < 0.25,
}));
const mists = Array.from({ length: 9 }, (_, i) => ({ x: rand() * 1800 - 100, y: 690 + rand() * 120, r: 30 + rand() * 26, v: 4 + rand() * 6, d: i % 2 ? 1 : -1 }));
const twinkles = Array.from({ length: 34 }, () => ({ x: 250 + rand() * 1100, y: 40 + rand() * 820, r: 5 + rand() * 7, v: 0.8 + rand() * 1.5, p: rand() * 6.28 }));
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
    const a = 0.1 + 0.06 * Math.sin(t * 0.6 + s.p);
    const g = ctx.createLinearGradient(0, -300, 0, 820);
    g.addColorStop(0, `rgba(225,255,245,${a * 1.7})`); g.addColorStop(1, "rgba(225,255,245,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(s.x - s.w * 0.35, -300); ctx.lineTo(s.x + s.w * 0.35, -300); ctx.lineTo(s.x + s.w, 820); ctx.lineTo(s.x - s.w, 820); ctx.closePath(); ctx.fill();
    for (const [dx, col] of [[-1, "255,170,210"], [1, "150,210,255"]]) { // faint rainbow edges
      ctx.beginPath(); ctx.moveTo(s.x + dx * s.w * 0.35, -300); ctx.lineTo(s.x + dx * s.w, 820);
      ctx.strokeStyle = `rgba(${col},${a * 1.4})`; ctx.lineWidth = 3; ctx.stroke();
    }
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
    curl(ctx, m.x, m.y, m.r, "rgba(250,255,253,0.75)", "rgba(140,215,195,0.7)");
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
  for (const tw of twinkles) {
    const k = Math.max(0, Math.sin(t * tw.v + tw.p));
    if (k < 0.05) continue;
    ctx.fillStyle = `rgba(255,255,240,${k})`;
    sparkle(ctx, tw.x, tw.y, tw.r * k); ctx.fill();
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
