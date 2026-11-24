// =============================================================
//  Paper cut-out scenes. Every shape is a sheet of colored paper,
//  with a soft shadow on the layers behind it and a paper texture.
//  Each scene paints three layers (back, mid, front) for parallax.
// =============================================================

export function paintScene(name, layers, w, h, dpr) {
  let seed = [...name].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 2147483647 || 1;
  const r = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const P = paper(w, h, h * 1.2, dpr, r);
  SCENES[name]?.(layers, P, w, h, r);
}

// ---------- Paper texture (made once) ----------
let grain = null;
function paperGrain() {
  if (grain) return grain;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const img = g.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data.set([v, v, v, Math.random() < 0.5 ? 10 : 0], i);
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 140; i++) { // fibres
    g.strokeStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)";
    g.lineWidth = 0.6;
    const x = Math.random() * 256, y = Math.random() * 256, a = Math.random() * 6.28, l = 4 + Math.random() * 10;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  grain = c;
  return c;
}

// ---------- Paper tools ----------
function paper(w, h, H, dpr, r) {
  const scratch = document.createElement("canvas");
  scratch.width = Math.round(w * dpr); scratch.height = Math.round(H * dpr);
  const s = scratch.getContext("2d");
  const pick = (a) => a[Math.floor(r() * a.length)];
  let pattern = null;

  const P = {
    r, pick, w, h, H,

    // Cut one sheet of paper: draw its outline with path(), fill with color,
    // add texture, then lay it down with a shadow (bigger depth = more lift).
    sheet(ctx, color, path, depth = 1) {
      s.setTransform(1, 0, 0, 1, 0, 0);
      s.clearRect(0, 0, scratch.width, scratch.height);
      s.setTransform(dpr, 0, 0, dpr, 0, 0);
      s.lineCap = s.lineJoin = "round";
      s.globalCompositeOperation = "source-over";
      s.beginPath(); path(s);
      s.fillStyle = color; s.fill();
      s.globalCompositeOperation = "source-atop";
      pattern ||= s.createPattern(paperGrain(), "repeat");
      s.fillStyle = pattern; s.fillRect(0, 0, w, H);
      s.globalCompositeOperation = "source-over";
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.shadowColor = `rgba(30,20,10,${0.22 + depth * 0.04})`;
      ctx.shadowBlur = (6 + depth * 7) * dpr;
      ctx.shadowOffsetY = (2 + depth * 3) * dpr;
      ctx.shadowOffsetX = depth * 1 * dpr;
      ctx.drawImage(scratch, 0, 0);
      ctx.restore();
    },

    // flat background color (no shadow)
    fill(ctx, color) { ctx.fillStyle = color; ctx.fillRect(0, 0, w, H); },

    // a wavy band of land from a height function down to the bottom
    hill(c, fy) {
      c.moveTo(-20, H + 20); c.lineTo(-20, fy(-20));
      for (let x = -20; x <= w + 20; x += 6) c.lineTo(x, fy(x));
      c.lineTo(w + 20, H + 20); c.closePath();
    },

    // pointed mountains: a zigzag of peaks
    peaks(c, base, pts) {
      c.moveTo(-20, H + 20); c.lineTo(-20, base);
      pts.forEach(([x, y]) => c.lineTo(x, y));
      c.lineTo(w + 20, base); c.lineTo(w + 20, H + 20); c.closePath();
    },

    // scalloped cloud
    cloud(c, x, y, s) {
      c.moveTo(x - s, y);
      c.arc(x - s * 0.55, y, s * 0.42, Math.PI, Math.PI * 1.75);
      c.arc(x, y - s * 0.15, s * 0.55, Math.PI * 1.2, Math.PI * 1.85);
      c.arc(x + s * 0.55, y, s * 0.45, Math.PI * 1.3, 0);
      c.lineTo(x - s, y); c.closePath();
    },

    // concentric rings, like a cut-paper sun or glow
    rings(ctx, x, y, radii, cols, depth = 0.6) {
      radii.forEach((rad, i) => P.sheet(ctx, cols[i], (c) => c.arc(x, y, rad, 0, 7), depth));
    },

    // a rounded tree: trunk, a darker back canopy, a lighter front canopy
    tree(ctx, x, base, s, cols, fruit) {
      s = Math.min(s, w * 0.32); // keep trees in proportion on narrow screens
      const [trunk, dark, light] = cols;
      P.sheet(ctx, trunk, (c) => {
        c.moveTo(x - s * 0.07, base); c.lineTo(x - s * 0.04, base - s * 0.75);
        c.lineTo(x + s * 0.04, base - s * 0.75); c.lineTo(x + s * 0.07, base); c.closePath();
        c.moveTo(x, base - s * 0.55); c.lineTo(x + s * 0.2, base - s * 0.78); c.lineTo(x + s * 0.17, base - s * 0.8); c.lineTo(x - s * 0.01, base - s * 0.62);
      }, 1);
      const cy = base - s * 0.95;
      const blobs = [[0, 0, 0.42], [-0.28, 0.1, 0.3], [0.28, 0.08, 0.32], [-0.12, -0.22, 0.3], [0.16, -0.2, 0.3]];
      P.sheet(ctx, dark, (c) => blobs.forEach(([dx, dy, rr]) => { c.moveTo(x + dx * s + rr * s, cy + dy * s); c.arc(x + dx * s, cy + dy * s, rr * s, 0, 7); }), 1.2);
      P.sheet(ctx, light, (c) => blobs.slice(1).forEach(([dx, dy, rr]) => {
        c.moveTo(x + dx * s * 0.9 - s * 0.03 + rr * s * 0.7, cy + dy * s * 0.9 - s * 0.05);
        c.arc(x + dx * s * 0.9 - s * 0.03, cy + dy * s * 0.9 - s * 0.05, rr * s * 0.7, 0, 7);
      }), 1.4);
      if (fruit) P.sheet(ctx, fruit, (c) => {
        for (let i = 0; i < 7; i++) {
          const a = r() * 6.28, d = Math.sqrt(r()) * 0.4 * s;
          c.moveTo(x + Math.cos(a) * d + s * 0.045, cy + Math.sin(a) * d * 0.8); c.arc(x + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, s * 0.045, 0, 7);
        }
      }, 1.6);
    },

    // a tall pointed tree (cypress / pine)
    pine(ctx, x, base, s, col, trunk = "#5a4030") {
      P.sheet(ctx, trunk, (c) => c.rect(x - s * 0.03, base - s * 0.2, s * 0.06, s * 0.2), 0.8);
      P.sheet(ctx, col, (c) => {
        c.moveTo(x, base - s);
        for (let k = 0; k < 4; k++) {
          const y = base - s + (k + 1) * s * 0.2, wd = s * (0.1 + k * 0.06);
          c.lineTo(x + wd, y); c.lineTo(x + wd * 0.5, y - s * 0.04);
        }
        c.lineTo(x + s * 0.3, base - s * 0.15); c.lineTo(x - s * 0.3, base - s * 0.15);
        for (let k = 3; k >= 0; k--) {
          const y = base - s + (k + 1) * s * 0.2, wd = s * (0.1 + k * 0.06);
          c.lineTo(x - wd * 0.5, y - s * 0.04); c.lineTo(x - wd, y);
        }
        c.closePath();
      }, 1.1);
    },

    // a small cut-paper flower on a stem
    flower(ctx, x, base, s, col, center = "#f6d36b", stem = "#4f7a55") {
      P.sheet(ctx, stem, (c) => {
        c.rect(x - s * 0.04, base - s, s * 0.08, s);
        c.moveTo(x, base - s * 0.35); c.quadraticCurveTo(x + s * 0.35, base - s * 0.55, x + s * 0.4, base - s * 0.3); c.quadraticCurveTo(x + s * 0.2, base - s * 0.25, x, base - s * 0.3);
      }, 0.5);
      P.sheet(ctx, col, (c) => {
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * 6.28;
          c.moveTo(x + Math.cos(a) * s * 0.22 + s * 0.17, base - s + Math.sin(a) * s * 0.22);
          c.arc(x + Math.cos(a) * s * 0.22, base - s + Math.sin(a) * s * 0.22, s * 0.17, 0, 7);
        }
      }, 0.7);
      P.sheet(ctx, center, (c) => c.arc(x, base - s, s * 0.1, 0, 7), 0.8);
    },

    // a four-pointed star
    star(c, x, y, s) {
      c.moveTo(x, y - s);
      c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s);
      c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s); c.closePath();
    },

    // a simple standing person, seen from afar
    person(c, x, base, ht, hair) {
      c.moveTo(x + ht * 0.07, base - ht * 0.88); c.arc(x, base - ht * 0.88, ht * 0.07, 0, 7);
      c.moveTo(x - ht * 0.09, base - ht * 0.78); c.lineTo(x + ht * 0.09, base - ht * 0.78);
      c.lineTo(x + ht * 0.08, base - ht * 0.42); c.lineTo(x + ht * 0.07, base); c.lineTo(x + ht * 0.01, base);
      c.lineTo(x, base - ht * 0.42); c.lineTo(x - ht * 0.01, base); c.lineTo(x - ht * 0.07, base);
      c.lineTo(x - ht * 0.08, base - ht * 0.42); c.closePath();
      if (hair) { c.moveTo(x + ht * 0.08, base - ht * 0.78); c.ellipse(x, base - ht * 0.78, ht * 0.08, ht * 0.17, 0, 0, 7); }
    },

    deer(c, x, base, s, dir = 1) {
      c.ellipse(x, base - s * 0.7, s * 0.45, s * 0.18, 0, 0, 7);
      c.moveTo(x + dir * s * 0.3, base - s * 0.8); c.lineTo(x + dir * s * 0.48, base - s * 1.2);
      c.lineTo(x + dir * s * 0.62, base - s * 1.16); c.lineTo(x + dir * s * 0.44, base - s * 0.75);
      c.moveTo(x + dir * s * 0.55 + s * 0.12, base - s * 1.2); c.ellipse(x + dir * s * 0.55, base - s * 1.2, s * 0.13, s * 0.08, dir * 0.3, 0, 7);
      for (const lx of [-0.32, -0.2, 0.2, 0.32]) c.rect(x + lx * s - s * 0.025, base - s * 0.62, s * 0.05, s * 0.62);
    },

    // birds as little paper chevrons
    birds(ctx, n, x0, x1, y0, y1, col) {
      P.sheet(ctx, col, (c) => {
        for (let i = 0; i < n; i++) {
          const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), s = 6 + r() * 6;
          c.moveTo(x - s, y - s * 0.3); c.quadraticCurveTo(x - s * 0.5, y - s * 0.6, x, y);
          c.quadraticCurveTo(x + s * 0.5, y - s * 0.6, x + s, y - s * 0.3);
          c.quadraticCurveTo(x + s * 0.5, y - s * 0.3, x, y + s * 0.15);
          c.quadraticCurveTo(x - s * 0.5, y - s * 0.3, x - s, y - s * 0.3); c.closePath();
        }
      }, 0.5);
    },
  };
  return P;
}

// ---------- The scenes ----------
const wave = (x, w, f, ph) => Math.sin((x / w) * Math.PI * 2 * f + ph);

const SCENES = {
  // Opening: Eden at sunrise, layered hills, a lake, trees and clouds
  dawn({ back, mid, front }, P, w, h, r) {
    P.fill(back, "#f7e9d3");
    P.rings(back, w * 0.5, h * 0.58, [h * 0.62, h * 0.48, h * 0.36, h * 0.25, h * 0.15], ["#f8dfbf", "#f7d2a6", "#f5c08c", "#f3a873", "#ef8f5e"]);
    for (const [x, y, s] of [[0.15, 0.18, 70], [0.78, 0.12, 90], [0.6, 0.3, 55], [0.3, 0.34, 48]]) P.sheet(back, "#fffaf0", (c) => P.cloud(c, w * x, h * y, s), 1);
    P.sheet(back, "#c9b6d6", (c) => P.peaks(c, h * 0.58, [[w * 0.05, h * 0.5], [w * 0.2, h * 0.38], [w * 0.32, h * 0.47], [w * 0.5, h * 0.26], [w * 0.66, h * 0.44], [w * 0.8, h * 0.34], [w * 0.95, h * 0.5]]), 1);
    P.sheet(back, "#ffffff", (c) => { c.moveTo(w * 0.5, h * 0.26); c.lineTo(w * 0.465, h * 0.31); c.lineTo(w * 0.49, h * 0.3); c.lineTo(w * 0.5, h * 0.33); c.lineTo(w * 0.515, h * 0.3); c.lineTo(w * 0.537, h * 0.31); c.closePath(); }, 0.6);
    P.sheet(back, "#a996c2", (c) => P.hill(c, (x) => h * 0.56 + h * 0.03 * wave(x, w, 2.2, 1)), 1.2);
    P.sheet(mid, "#9cc68e", (c) => P.hill(c, (x) => h * 0.62 + h * 0.035 * wave(x, w, 1.6, 0.4)), 1.4);
    P.sheet(mid, "#8fc3cf", (c) => c.ellipse(w * 0.5, h * 0.68, w * 0.28, h * 0.035, 0, 0, 7), 0.6);
    P.sheet(mid, "#b9dde2", (c) => c.ellipse(w * 0.5, h * 0.675, w * 0.2, h * 0.018, 0, 0, 7), 0.4);
    for (const x of [0.1, 0.2, 0.76, 0.86]) P.pine(mid, w * x, h * 0.66, h * (0.12 + r() * 0.05), "#4f8a66");
    P.sheet(mid, "#6fa57a", (c) => P.hill(c, (x) => h * 0.74 + h * 0.04 * wave(x, w, 1.2, 2)), 1.6);
    P.sheet(front, "#4c8a66", (c) => P.hill(c, (x) => h * 0.86 + h * 0.05 * wave(x, w, 0.9, 0.2)), 2);
    P.tree(front, w * 0.08, h * 0.95, h * 0.42, ["#6b4b36", "#2f6b55", "#3f8a64"], "#e0554a");
    P.tree(front, w * 0.93, h * 0.97, h * 0.5, ["#6b4b36", "#2f6b55", "#3f8a64"], "#e0554a");
    P.sheet(front, "#2f6b55", (c) => P.hill(c, (x) => h * 1.02 + h * 0.04 * wave(x, w, 1.4, 1)), 2.4);
    for (let i = 0; i < 9; i++) P.flower(front, w * (0.2 + r() * 0.6), h * (1.0 + r() * 0.1), h * (0.04 + r() * 0.03), P.pick(["#f6f1e4", "#f3a873", "#e0554a", "#b7a0d8"]));
  },

  // I. Creation: a paper starburst of light in a deep night, land rising from the waters
  creation({ back, mid, front }, P, w, h, r) {
    const cx = w * 0.62, cy = h * 0.42;
    P.fill(back, "#14163a");
    P.rings(back, cx, cy, [h * 1.1, h * 0.85, h * 0.62], ["#1d2150", "#272c66", "#34397d"], 0.8);
    P.sheet(back, "#f4d58a", (c) => { for (let i = 0; i < 60; i++) P.star(c, r() * w, r() * h * 0.9, 2 + r() * 5); }, 0.4);
    // sunburst of long paper rays
    P.sheet(mid, "#f7c66a", (c) => {
      const n = 28;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, b = a + Math.PI / n * 0.55, len = h * (0.5 + (i % 2) * 0.22);
        c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); c.lineTo(cx + Math.cos(b) * len, cy + Math.sin(b) * len); c.closePath();
      }
    }, 1);
    P.rings(mid, cx, cy, [h * 0.2, h * 0.15, h * 0.1, h * 0.055], ["#f6a85c", "#f8c470", "#fbe09a", "#fff6dc"], 1.2);
    // swirling bands of the deep
    for (const [rad, col, d] of [[0.34, "#6a5ab0", 1.3], [0.27, "#8a6fc4", 1.5]]) {
      P.sheet(mid, col, (c) => {
        c.moveTo(cx + rad * h, cy);
        for (let a = 0; a <= Math.PI * 1.3; a += 0.05) c.lineTo(cx + Math.cos(a) * rad * h * (1 + a * 0.08), cy + Math.sin(a) * rad * h * 0.75);
        for (let a = Math.PI * 1.3; a >= 0; a -= 0.05) c.lineTo(cx + Math.cos(a) * (rad * h * (1 + a * 0.08) - h * 0.025), cy + Math.sin(a) * (rad * h * 0.75 - h * 0.02));
        c.closePath();
      }, d);
    }
    // waters and the first land
    P.sheet(front, "#2b4f7e", (c) => P.hill(c, (x) => h * 0.82 + h * 0.012 * wave(x, w, 8, 0)), 1.5);
    P.sheet(front, "#3d6b9a", (c) => P.hill(c, (x) => h * 0.88 + h * 0.012 * wave(x, w, 7, 1.5)), 1.7);
    P.sheet(front, "#2f5a4e", (c) => { c.moveTo(-10, h * 1.2); c.lineTo(-10, h * 0.7); c.quadraticCurveTo(w * 0.18, h * 0.6, w * 0.38, h * 0.86); c.lineTo(w * 0.42, h * 1.2); c.closePath(); }, 2);
    P.sheet(front, "#3f7a5e", (c) => { c.moveTo(-10, h * 1.2); c.lineTo(-10, h * 0.8); c.quadraticCurveTo(w * 0.14, h * 0.72, w * 0.3, h * 0.92); c.lineTo(w * 0.3, h * 1.2); c.closePath(); }, 2.2);
    P.sheet(front, "#4f8fb8", (c) => P.hill(c, (x) => h * 0.98 + h * 0.015 * wave(x, w, 6, 3)), 2.4);
  },

  // II. The Garden: a waterfall, a lake, fruit trees, deer, Adam and Eve
  garden({ back, mid, front }, P, w, h, r) {
    P.fill(back, "#d8eee9");
    P.rings(back, w * 0.72, h * 0.22, [h * 0.2, h * 0.13, h * 0.08], ["#e9f4e6", "#fbefc4", "#f9d97c"], 0.6);
    for (const [x, y, s] of [[0.2, 0.15, 80], [0.5, 0.1, 60], [0.88, 0.32, 70]]) P.sheet(back, "#ffffff", (c) => P.cloud(c, w * x, h * y, s), 1);
    P.sheet(back, "#a9c3c9", (c) => P.peaks(c, h * 0.55, [[w * 0.1, h * 0.48], [w * 0.28, h * 0.3], [w * 0.4, h * 0.42], [w * 0.55, h * 0.22], [w * 0.7, h * 0.4], [w * 0.88, h * 0.3], [w, h * 0.45]]), 1);
    // waterfall
    // waterfall: a narrow ribbon spilling from a cleft in two tiers, with a splash at the foot
    const fall = (c, x, y0, y1, w0, w1) => {
      c.moveTo(x - w0, y0);
      for (let t = 0; t <= 1.001; t += 0.1) c.lineTo(x - (w0 + (w1 - w0) * t) + Math.sin(t * 9) * w * 0.002, y0 + (y1 - y0) * t);
      for (let t = 1; t >= -0.001; t -= 0.1) c.lineTo(x + (w0 + (w1 - w0) * t) + Math.sin(t * 7 + 1) * w * 0.002, y0 + (y1 - y0) * t);
      c.closePath();
    };
    P.sheet(back, "#eaf6fa", (c) => { fall(c, w * 0.552, h * 0.25, h * 0.42, w * 0.006, w * 0.011); fall(c, w * 0.55, h * 0.44, h * 0.6, w * 0.01, w * 0.017); }, 0.8);
    P.sheet(back, "#bfe3ee", (c) => { fall(c, w * 0.553, h * 0.27, h * 0.41, w * 0.002, w * 0.004); fall(c, w * 0.551, h * 0.46, h * 0.59, w * 0.003, w * 0.006); }, 0.2);
    P.sheet(back, "#a9c3c9", (c) => c.ellipse(w * 0.551, h * 0.432, w * 0.03, h * 0.012, 0, 0, 7), 0.6);
    P.sheet(back, "#ffffff", (c) => { for (const dx of [-0.02, 0, 0.02]) { c.moveTo(w * (0.551 + dx) + w * 0.012, h * 0.605); c.arc(w * (0.551 + dx), h * 0.605, w * 0.012, Math.PI, 0); } }, 0.6);
    P.sheet(mid, "#8fc68a", (c) => P.hill(c, (x) => h * 0.58 + h * 0.04 * wave(x, w, 1.8, 2)), 1.3);
    P.sheet(mid, "#7cc0d8", (c) => c.ellipse(w * 0.55, h * 0.66, w * 0.24, h * 0.045, 0, 0, 7), 0.6);
    P.sheet(mid, "#b8e2ee", (c) => { c.ellipse(w * 0.55, h * 0.655, w * 0.16, h * 0.016, 0, 0, 7); }, 0.3);
    for (const [x, s] of [[0.12, 0.26], [0.27, 0.22], [0.8, 0.24], [0.92, 0.2]]) P.tree(mid, w * x, h * 0.66, h * s, ["#7a5a40", "#4a9a5f", "#6cbf73"], P.pick(["#e0554a", "#f3a43c", "#e0554a"]));
    P.sheet(mid, "#6aae6e", (c) => P.hill(c, (x) => h * 0.72 + h * 0.03 * wave(x, w, 1.3, 0.5)), 1.6);
    // Adam, Eve and the animals
    P.sheet(mid, "#e9c4a0", (c) => { P.person(c, w * 0.47, h * 0.75, h * 0.09); P.person(c, w * 0.495, h * 0.75, h * 0.085); }, 1.4);
    P.sheet(mid, "#8a5a36", (c) => { c.ellipse(w * 0.47, h * 0.75 - h * 0.09 * 0.9, h * 0.09 * 0.08, h * 0.09 * 0.06, 0, Math.PI, 0); c.moveTo(w * 0.495 + h * 0.007, h * 0.75 - h * 0.085 * 0.8); c.ellipse(w * 0.495, h * 0.75 - h * 0.085 * 0.8, h * 0.085 * 0.08, h * 0.085 * 0.17, 0, 0, 7); }, 1.5);
    P.sheet(mid, "#a0704a", (c) => { P.deer(c, w * 0.66, h * 0.76, h * 0.06, -1); P.deer(c, w * 0.32, h * 0.77, h * 0.05, 1); }, 1.4);
    P.sheet(front, "#4f9a62", (c) => P.hill(c, (x) => h * 0.88 + h * 0.04 * wave(x, w, 1.1, 1)), 2);
    for (let i = 0; i < 14; i++) P.flower(front, w * (0.03 + r() * 0.94), h * (0.95 + r() * 0.12), h * (0.04 + r() * 0.035), P.pick(["#f6f1e4", "#f3a873", "#e0554a", "#b7a0d8", "#f6d36b"]));
    P.sheet(front, "#367a52", (c) => P.hill(c, (x) => h * 1.06 + h * 0.03 * wave(x, w, 1.7, 2)), 2.4);
  },

  // III. The Serpent: dusk bands, the Tree of Knowledge, the serpent, Eve
  serpent({ back, mid, front }, P, w, h, r) {
    P.fill(back, "#3a2a5a");
    P.rings(back, w * 0.3, h * 0.66, [h * 0.9, h * 0.7, h * 0.52, h * 0.36, h * 0.22, h * 0.1], ["#523466", "#7a3f6e", "#a84e6a", "#d86a5e", "#f09a62", "#fbd27c"], 0.6);
    P.sheet(back, "#f3c7d2", (c) => { for (let i = 0; i < 25; i++) P.star(c, r() * w, r() * h * 0.35, 1.5 + r() * 3); }, 0.3);
    P.sheet(back, "#6b4778", (c) => P.peaks(c, h * 0.66, [[w * 0.1, h * 0.6], [w * 0.25, h * 0.52], [w * 0.42, h * 0.6], [w * 0.6, h * 0.5], [w * 0.8, h * 0.58], [w, h * 0.52]]), 1.2);
    P.sheet(mid, "#3e3554", (c) => P.hill(c, (x) => h * 0.68 + h * 0.025 * wave(x, w, 1.5, 1)), 1.4);
    // the Tree of Knowledge
    const tx = w * 0.64, base = h * 0.8;
    P.sheet(mid, "#3a2a22", (c) => {
      c.moveTo(tx - w * 0.03, base); c.quadraticCurveTo(tx - w * 0.015, base - h * 0.2, tx - w * 0.012, base - h * 0.38);
      c.lineTo(tx + w * 0.012, base - h * 0.38); c.quadraticCurveTo(tx + w * 0.015, base - h * 0.2, tx + w * 0.03, base); c.closePath();
    }, 1.4);
    const cy = base - h * 0.5;
    const blobs = [[0, 0, 0.17], [-0.12, 0.05, 0.12], [0.12, 0.04, 0.13], [-0.05, -0.1, 0.12], [0.07, -0.09, 0.12], [-0.17, -0.02, 0.09], [0.18, -0.03, 0.09]];
    P.sheet(mid, "#1f3a33", (c) => blobs.forEach(([dx, dy, rr]) => { c.moveTo(tx + dx * w + rr * w, cy + dy * w); c.arc(tx + dx * w, cy + dy * w, rr * w, 0, 7); }), 1.6);
    P.sheet(mid, "#2c5246", (c) => blobs.slice(1).forEach(([dx, dy, rr]) => { c.moveTo(tx + dx * w * 0.85 - w * 0.01 + rr * w * 0.65, cy + dy * w * 0.85 - h * 0.02); c.arc(tx + dx * w * 0.85 - w * 0.01, cy + dy * w * 0.85 - h * 0.02, rr * w * 0.65, 0, 7); }), 1.8);
    P.sheet(mid, "#e0443a", (c) => {
      for (let i = 0; i < 16; i++) {
        const a = r() * 6.28, d = Math.sqrt(r()) * 0.2 * w;
        const x = tx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.75, s = w * 0.009;
        c.moveTo(x + s, y); c.arc(x, y, s, 0, 7);
      }
    }, 2);
    // serpent spiralling up the trunk
    P.sheet(mid, "#7aae4a", (c) => {
      const pts = [];
      for (let i = 0; i <= 80; i++) { const t = i / 80; pts.push([tx + Math.sin(t * Math.PI * 4.5) * w * 0.035, base - h * 0.02 - t * h * 0.34]); }
      pts.push([tx + w * 0.06, base - h * 0.4], [tx + w * 0.09, base - h * 0.38]);
      const th = (i) => w * 0.006 * (0.4 + Math.min(1, i / 20));
      c.moveTo(pts[0][0] - th(0), pts[0][1]);
      pts.forEach(([x, y], i) => c.lineTo(x - th(i), y - th(i) * 0.4));
      for (let i = pts.length - 1; i >= 0; i--) c.lineTo(pts[i][0] + th(i), pts[i][1] + th(i) * 0.4);
      c.closePath();
      c.moveTo(tx + w * 0.1, base - h * 0.38); c.ellipse(tx + w * 0.095, base - h * 0.38, w * 0.012, w * 0.007, 0.2, 0, 7);
    }, 2.2);
    P.sheet(mid, "#c8402e", (c) => { c.moveTo(tx + w * 0.106, base - h * 0.378); c.lineTo(tx + w * 0.12, base - h * 0.372); c.lineTo(tx + w * 0.116, base - h * 0.378); c.lineTo(tx + w * 0.12, base - h * 0.384); c.closePath(); }, 1);
    // Eve
    P.sheet(mid, "#e3b590", (c) => P.person(c, tx - w * 0.1, base + h * 0.01, h * 0.1), 1.8);
    P.sheet(mid, "#c9923e", (c) => { const x = tx - w * 0.1, b = base + h * 0.01, ht = h * 0.1; c.ellipse(x, b - ht * 0.8, ht * 0.08, ht * 0.18, 0, 0, 7); }, 1.9);
    P.sheet(front, "#241f33", (c) => P.hill(c, (x) => h * 0.9 + h * 0.05 * wave(x, w, 0.8, 1.2)), 2.2);
    P.sheet(front, "#171424", (c) => {
      for (const x of [0.02, 0.97]) for (let k = 0; k < 6; k++) {
        const bx = w * x + (k - 2.5) * w * 0.02, top = h * (0.55 + r() * 0.2);
        c.moveTo(bx - w * 0.008, h * 1.2); c.quadraticCurveTo(bx + (r() - 0.5) * w * 0.05, (top + h) / 2, bx, top); c.lineTo(bx + w * 0.008, h * 1.2); c.closePath();
      }
    }, 2.6);
  },

  // IV. The Fall: storm clouds, a paper lightning bolt, bending trees, falling leaves
  fall({ back, mid, front }, P, w, h, r) {
    P.fill(back, "#2c3140");
    P.sheet(back, "#b8543a", (c) => P.hill(c, (x) => h * 0.6 + h * 0.01 * wave(x, w, 2, 0)), 0.2);
    P.sheet(back, "#7a3a34", (c) => P.hill(c, () => h * 0.64), 0.2);
    for (let i = 0; i < 4; i++) {
      const y = h * (0.05 + i * 0.12), col = ["#3a4052", "#474e63", "#565e75", "#666e86"][i];
      P.sheet(back, col, (c) => { for (let k = 0; k < 6; k++) P.cloud(c, w * (k / 5) + (r() - 0.5) * w * 0.1, y + (r() - 0.5) * h * 0.05, w * (0.1 + r() * 0.06)); }, 1 + i * 0.3);
    }
    // lightning
    P.sheet(mid, "#fbe07a", (c) => {
      const x = w * 0.3;
      c.moveTo(x, h * 0.18); c.lineTo(x + w * 0.04, h * 0.18); c.lineTo(x + w * 0.015, h * 0.32); c.lineTo(x + w * 0.05, h * 0.32);
      c.lineTo(x - w * 0.01, h * 0.58); c.lineTo(x + w * 0.005, h * 0.38); c.lineTo(x - w * 0.025, h * 0.38); c.closePath();
    }, 1.6);
    P.sheet(mid, "#3a3a30", (c) => P.hill(c, (x) => h * 0.66 + h * 0.03 * wave(x, w, 1.4, 2)), 1.4);
    // trees bent by the wind
    for (const [x, s] of [[0.15, 0.32], [0.55, 0.22], [0.85, 0.36]]) {
      const bx = w * x, base = h * 0.7, ht = h * s;
      P.sheet(mid, "#241c16", (c) => {
        c.moveTo(bx - ht * 0.05, base); c.quadraticCurveTo(bx, base - ht * 0.5, bx + ht * 0.3, base - ht);
        c.lineTo(bx + ht * 0.34, base - ht * 0.97); c.quadraticCurveTo(bx + ht * 0.06, base - ht * 0.5, bx + ht * 0.05, base); c.closePath();
      }, 1.6);
      P.sheet(mid, "#2f3a26", (c) => { for (let k = 0; k < 5; k++) { const ex = bx + ht * (0.3 + k * 0.08), ey = base - ht * (0.95 - k * 0.04); c.moveTo(ex + ht * 0.14, ey); c.ellipse(ex, ey, ht * 0.15, ht * 0.08, -0.3, 0, 7); } }, 1.8);
    }
    // rain
    P.sheet(mid, "rgba(200,210,230,0.5)", (c) => { for (let i = 0; i < 160; i++) { const x = r() * w * 1.1, y = r() * h * 1.1; c.moveTo(x, y); c.lineTo(x + 1.5, y); c.lineTo(x - 5, y + 18); c.lineTo(x - 6.5, y + 18); c.closePath(); } }, 0.1);
    P.sheet(front, "#1d1d18", (c) => P.hill(c, (x) => h * 0.92 + h * 0.05 * wave(x, w, 0.9, 2.5)), 2.2);
    // windblown leaves
    for (const col of ["#c46a2c", "#8a9a3a", "#d0a040"]) {
      P.sheet(front, col, (c) => { for (let i = 0; i < 12; i++) { const x = r() * w, y = r() * h, a = r() * 6.28; c.moveTo(x + 8, y); c.ellipse(x, y, 8, 3.5, a, 0, 7); } }, 1.2);
    }
  },

  // V. The Expulsion: a gateway of paper flames with the angel; Adam and Eve walk away
  expulsion({ back, mid, front }, P, w, h, r) {
    P.fill(back, "#3c2a3e");
    P.rings(back, w * 0.2, h * 0.55, [h * 0.9, h * 0.7, h * 0.52, h * 0.36], ["#5a3046", "#8a3a46", "#c04e3e", "#e67a3e"], 0.5);
    for (const [x, y, s] of [[0.55, 0.15, 90], [0.8, 0.28, 70], [0.4, 0.3, 50]]) P.sheet(back, "#7a4058", (c) => P.cloud(c, w * x, h * y, s), 1);
    P.sheet(back, "#6a3a4e", (c) => P.peaks(c, h * 0.62, [[w * 0.3, h * 0.6], [w * 0.5, h * 0.5], [w * 0.65, h * 0.56], [w * 0.82, h * 0.46], [w, h * 0.55]]), 1.2);
    // gateway of flames
    const gx = w * 0.2, gy = h * 0.64;
    for (const [k, col] of [[1.0, "#c0392b"], [0.8, "#e8692f"], [0.6, "#f5a442"], [0.42, "#fbd27c"], [0.26, "#fff4d6"]]) {
      P.sheet(mid, col, (c) => {
        const wd = w * 0.11 * k, ht = h * 0.42 * k;
        c.moveTo(gx - wd, gy);
        for (let i = 0; i <= 12; i++) {
          const t = i / 12, x = gx - wd + t * wd * 2;
          c.lineTo(x, gy - ht * Math.sin(Math.PI * t) - (i % 2 ? h * 0.05 * k : 0));
        }
        c.lineTo(gx + wd, gy); c.closePath();
      }, 1.2);
    }
    // the angel with raised wings and the sword
    P.sheet(mid, "#5a2a24", (c) => {
      const ax = gx, ab = gy, ah = h * 0.14;
      c.moveTo(ax - ah * 0.12, ab); c.lineTo(ax - ah * 0.05, ab - ah * 0.75); c.lineTo(ax + ah * 0.05, ab - ah * 0.75); c.lineTo(ax + ah * 0.12, ab); c.closePath();
      c.moveTo(ax + ah * 0.07, ab - ah * 0.83); c.arc(ax, ab - ah * 0.83, ah * 0.07, 0, 7);
      for (const s2 of [-1, 1]) {
        c.moveTo(ax + s2 * ah * 0.04, ab - ah * 0.7);
        c.quadraticCurveTo(ax + s2 * ah * 0.45, ab - ah * 1.2, ax + s2 * ah * 0.24, ab - ah * 1.5);
        c.quadraticCurveTo(ax + s2 * ah * 0.3, ab - ah * 0.9, ax + s2 * ah * 0.08, ab - ah * 0.45); c.closePath();
      }
    }, 1.6);
    P.sheet(mid, "#fff4d6", (c) => { const ax = gx, ab = gy, ah = h * 0.14; c.moveTo(ax + ah * 0.04, ab - ah * 0.7); c.lineTo(ax + ah * 0.22, ab - ah * 1.42); c.lineTo(ax + ah * 0.25, ab - ah * 1.4); c.lineTo(ax + ah * 0.08, ab - ah * 0.68); c.closePath(); }, 1.8);
    // the land and the path out
    P.sheet(mid, "#8a5a3e", (c) => P.hill(c, (x) => h * 0.64 + h * 0.015 * wave(x, w, 1.5, 0)), 1.4);
    P.sheet(mid, "#c89a6a", (c) => { c.moveTo(w * 0.24, h * 0.65); c.quadraticCurveTo(w * 0.42, h * 0.74, w * 0.38, h * 1.2); c.lineTo(w * 0.52, h * 1.2); c.quadraticCurveTo(w * 0.48, h * 0.72, w * 0.27, h * 0.645); c.closePath(); }, 0.5);
    // Adam and Eve, hand in hand, walking away
    P.sheet(front, "#3a2420", (c) => {
      const fx = w * 0.4, fb = h * 0.86, fh = h * 0.16;
      P.person(c, fx, fb, fh); P.person(c, fx + fh * 0.22, fb, fh * 0.93, true);
      c.moveTo(fx + fh * 0.06, fb - fh * 0.52); c.lineTo(fx + fh * 0.16, fb - fh * 0.5); c.lineTo(fx + fh * 0.16, fb - fh * 0.47); c.lineTo(fx + fh * 0.06, fb - fh * 0.49); c.closePath();
    }, 2);
    P.sheet(front, "#4a2c26", (c) => P.hill(c, (x) => h * 0.98 + h * 0.04 * wave(x, w, 1, 1.5)), 2.4);
  },

  // Closing: the wide world, a river winding to the horizon under a soft morning sky
  world({ back, mid, front }, P, w, h, r) {
    P.fill(back, "#eef0e6");
    P.rings(back, w * 0.5, h * 0.56, [h * 0.55, h * 0.4, h * 0.27, h * 0.15], ["#f3eedb", "#f7e7c2", "#f7d9a2", "#f6c77e"], 0.5);
    for (const [x, y, s] of [[0.2, 0.2, 80], [0.75, 0.16, 70], [0.6, 0.34, 50]]) P.sheet(back, "#ffffff", (c) => P.cloud(c, w * x, h * y, s), 1);
    P.birds(back, 7, w * 0.6, w * 0.85, h * 0.2, h * 0.35, "#5a6070");
    P.sheet(back, "#c4cad8", (c) => P.hill(c, (x) => h * 0.56 + h * 0.025 * wave(x, w, 2.5, 0.3)), 1);
    P.sheet(mid, "#b5cf9a", (c) => P.hill(c, (x) => h * 0.6 + h * 0.02 * wave(x, w, 2, 1)), 1.2);
    P.sheet(mid, "#9fc4d4", (c) => {
      c.moveTo(w * 0.49, h * 0.6); c.bezierCurveTo(w * 0.38, h * 0.68, w * 0.66, h * 0.78, w * 0.36, h * 1.2);
      c.lineTo(w * 0.56, h * 1.2); c.bezierCurveTo(w * 0.8, h * 0.8, w * 0.44, h * 0.68, w * 0.51, h * 0.6); c.closePath();
    }, 0.8);
    for (const x of [0.12, 0.2, 0.78, 0.88]) P.tree(mid, w * x, h * 0.7, h * (0.12 + r() * 0.05), ["#7a5a40", "#5a9a62", "#7cbf7a"]);
    P.sheet(front, "#6aa36e", (c) => P.hill(c, (x) => h * 0.92 + h * 0.03 * wave(x, w, 1.2, 1)), 2);
    for (let i = 0; i < 10; i++) P.flower(front, w * (0.03 + r() * 0.94), h * (0.98 + r() * 0.1), h * (0.035 + r() * 0.03), P.pick(["#f6f1e4", "#f6d36b", "#f3a873"]));
  },
};
