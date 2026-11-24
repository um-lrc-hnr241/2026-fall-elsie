// =============================================================
//  Looks: painted backgrounds and texture finishes for each style.
//  Styles: "illustrated" (home page), "stained", "engraving", "tapestry"
// =============================================================

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbHex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");

// ---------- Ridge lines shared by the landscape styles ----------
function ridges(W) {
  const cx = W / 2;
  const wave = (x, f, ph) => {
    const u = (x / W) * Math.PI * 2;
    return Math.sin(u * f[0] + ph[0]) * 0.6 + Math.sin(u * f[1] + ph[1]) * 0.3 + Math.sin(u * f[2] + ph[2]) * 0.1;
  };
  const g = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));
  return {
    // far mountains with a tall central peak (world height units)
    far: (x) => 7.6 + 1.5 * wave(x, [3, 7, 13], [0.4, 2.1, 1.3]) + 13 * g(x, cx, 210) + 5 * g(x, cx - 430, 250)
      + 4 * g(x, cx + 500, 290) + 0.35 * Math.sin(x * 0.05) + 0.22 * Math.sin(x * 0.13),
    mid: (x) => 6.6 + 1.1 * wave(x, [4, 9, 15], [1.1, 0.3, 2.6]) + 4.2 * g(x, cx + 300, 250) + 3.6 * g(x, cx - 340, 220)
      + 0.25 * Math.sin(x * 0.07),
    meadow: (x) => 5.7 + 0.25 * wave(x, [5, 11, 17], [0.7, 1.9, 0.2]),
  };
}

// ---------- 1) Romantic landscape painting (hazy peaks, waterfall, lake) ----------
export function paintLandscape(main, W, H, toCanvas, r) {
  const cx = W / 2;
  const R = ridges(W);
  const both = (x, fn) => { fn(x); if (x < 400) fn(x + W); if (x > W - 400) fn(x - W); };
  // Paint a group of strokes sharp on its own sheet, then lay it down softened in one go (fast)
  const sheet = document.createElement("canvas");
  sheet.width = W; sheet.height = H;
  const ctx = sheet.getContext("2d");
  ctx.lineCap = ctx.lineJoin = "round";
  const layer = (blur, draw) => {
    ctx.clearRect(0, 0, W, H);
    draw();
    main.filter = blur ? `blur(${blur}px)` : "none";
    main.drawImage(sheet, 0, 0);
    main.filter = "none";
  };

  // luminous sky
  const sky = main.createLinearGradient(0, 0, 0, toCanvas(6));
  sky.addColorStop(0, "#8fa8be"); sky.addColorStop(0.45, "#c9d3d3");
  sky.addColorStop(0.8, "#efe8d6"); sky.addColorStop(1, "#f7efdc");
  main.fillStyle = sky; main.fillRect(0, 0, W, H);
  const glow = main.createRadialGradient(cx, toCanvas(14), 0, cx, toCanvas(14), 950);
  glow.addColorStop(0, "rgba(255,249,228,0.9)"); glow.addColorStop(1, "rgba(255,249,228,0)");
  main.fillStyle = glow; main.fillRect(0, 0, W, H);

  // soft clouds
  layer(18, () => {
    for (let i = 0; i < 45; i++) {
      const x = r() * W, y = toCanvas(17 + r() * 16), rw = 80 + r() * 220, a = 0.25 + r() * 0.3;
      both(x, (xx) => {
        ctx.beginPath(); ctx.ellipse(xx, y, rw, rw * 0.28, 0, 0, 7);
        ctx.fillStyle = `rgba(255,255,250,${a})`; ctx.fill();
      });
    }
  });

  // a mountain range, lit on its sunny side
  const range = (fn, top, bottom, light, blur) => {
    layer(blur, () => {
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 4) ctx.lineTo(x, toCanvas(fn(x)));
      ctx.lineTo(W, H); ctx.closePath();
      const g = ctx.createLinearGradient(0, toCanvas(20), 0, toCanvas(6));
      g.addColorStop(0, top); g.addColorStop(1, bottom);
      ctx.fillStyle = g; ctx.fill();
    });
    layer(14, () => { // soft sunlight on the slopes facing the light
      for (let x = 0; x < W; x += 10) {
        if (fn(x + 10) - fn(x) < -0.02) {
          ctx.beginPath(); ctx.ellipse(x, toCanvas(fn(x)) + 30, 14, 34, 0, 0, 7);
          ctx.fillStyle = light; ctx.fill();
        }
      }
    });
  };
  range(R.far, "#e4e1e8", "#b9b9c6", "rgba(255,252,244,0.4)", 1.5);
  const haze = main.createLinearGradient(0, toCanvas(14), 0, toCanvas(6));
  haze.addColorStop(0, "rgba(240,238,230,0)"); haze.addColorStop(1, "rgba(240,238,230,0.75)");
  main.fillStyle = haze; main.fillRect(0, toCanvas(14), W, toCanvas(6) - toCanvas(14));
  range(R.mid, "#c3c7c6", "#97a3a2", "rgba(250,248,236,0.35)", 1);
  const haze2 = main.createLinearGradient(0, toCanvas(9), 0, toCanvas(5.8));
  haze2.addColorStop(0, "rgba(236,236,226,0)"); haze2.addColorStop(1, "rgba(236,236,226,0.8)");
  main.fillStyle = haze2; main.fillRect(0, toCanvas(9), W, toCanvas(5.8) - toCanvas(9));

  // waterfall, mist, and the shining lake
  const wx = cx - 60, wTop = toCanvas(R.mid(wx)) + 10, wBot = toCanvas(6.15);
  layer(3, () => {
    for (let i = 0; i < 14; i++) {
      const x = wx - 16 + r() * 32;
      ctx.beginPath(); ctx.moveTo(x, wTop); ctx.lineTo(x + (r() - 0.5) * 8, wBot);
      ctx.strokeStyle = `rgba(255,255,255,${0.5 + r() * 0.4})`; ctx.lineWidth = 3 + r() * 6; ctx.stroke();
    }
  });
  layer(10, () => { ctx.beginPath(); ctx.ellipse(wx, wBot, 70, 22, 0, 0, 7); ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fill(); });
  layer(2, () => {
    ctx.beginPath(); ctx.ellipse(cx, toCanvas(6.0), 640, 26, 0, 0, 7);
    ctx.fillStyle = "#e9ede6"; ctx.fill();
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillRect(cx - 560 + r() * 1120, toCanvas(6.0) - 14 + r() * 28, 20 + r() * 60, 2);
    }
  });

  // meadow
  const mt = toCanvas(5.85);
  const meadow = main.createLinearGradient(0, mt, 0, H);
  meadow.addColorStop(0, "#8f9d58"); meadow.addColorStop(1, "#4f6a35");
  main.fillStyle = meadow;
  main.beginPath(); main.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) main.lineTo(x, toCanvas(R.meadow(x)) + (Math.abs(x - cx) < 640 ? 22 : 0));
  main.lineTo(W, H); main.closePath(); main.fill();
  layer(16, () => {
    for (let i = 0; i < 50; i++) {
      ctx.beginPath(); ctx.ellipse(r() * W, mt + 30 + r() * (H - mt), 60 + r() * 120, 12 + r() * 20, 0, 0, 7);
      ctx.fillStyle = "rgba(220,215,120,0.28)"; ctx.fill();
    }
  });

  // distant woods along the meadow's edge (lower by the lake)
  const greens = ["#6d7b46", "#7d8a52", "#5d6c3e", "#8b9660", "#4f5f36"];
  layer(1.2, () => {
    for (let i = 0; i < 1600; i++) {
      const x = r() * W, inLake = Math.abs(x - cx) < 560;
      const y = toCanvas(R.meadow(x) + (inLake ? -0.35 : 0.1) + r() * (inLake ? 0.2 : 0.7));
      ctx.beginPath(); ctx.arc(x, y, (inLake ? 5 : 9) + r() * (inLake ? 8 : 18), 0, 7);
      ctx.fillStyle = greens[i % greens.length]; ctx.fill();
    }
  });
  // palms and dark firs
  layer(0.6, () => {
    for (let i = 0; i < 22; i++) {
      const x = r() * W, base = toCanvas(R.meadow(x) + 0.2);
      const lean = (r() - 0.5) * 24, h = 60 + r() * 40;
      both(x, (xx) => {
        if (i % 3 === 0) {
          for (let k = 0; k < 5; k++) {
            const w = 26 - k * 4.5, y = base - k * 14;
            ctx.beginPath(); ctx.moveTo(xx - w / 2, y); ctx.lineTo(xx, y - 28); ctx.lineTo(xx + w / 2, y); ctx.closePath();
            ctx.fillStyle = "#2f4a30"; ctx.fill();
          }
        } else {
          const top = [xx + lean, base - h];
          ctx.beginPath(); ctx.moveTo(xx, base); ctx.quadraticCurveTo(xx + 10, (base + top[1]) / 2, top[0], top[1]);
          ctx.strokeStyle = "#6a5b40"; ctx.lineWidth = 3; ctx.stroke();
          for (let k = 0; k < 9; k++) {
            const a = (k / 9) * Math.PI * 2;
            ctx.beginPath(); ctx.moveTo(top[0], top[1]);
            ctx.quadraticCurveTo(top[0] + Math.cos(a) * 20, top[1] - 10, top[0] + Math.cos(a) * 36, top[1] + 16 + Math.abs(Math.sin(a)) * 10);
            ctx.strokeStyle = k % 2 ? "#55703a" : "#6c8a45"; ctx.lineWidth = 4; ctx.stroke();
          }
        }
      });
    }
  });

  // great framing trees on both sides of the view, hung with red blossoms
  const frame = (fx) => {
    layer(1, () => {
      for (let k = 0; k < 3; k++) {
        const tx = fx + (k - 1) * 160 + (r() - 0.5) * 60;
        ctx.beginPath(); ctx.moveTo(tx, H); ctx.quadraticCurveTo(tx + (r() - 0.5) * 80, toCanvas(14), tx + (r() - 0.5) * 120, toCanvas(26));
        ctx.strokeStyle = "#5a5040"; ctx.lineWidth = 18 + r() * 16; ctx.stroke();
      }
      const cols = ["#2c4524", "#3a5a2b", "#4d6e30", "#64853a", "#7f9a48", "#93ab55"];
      for (let i = 0; i < 2600; i++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r());
        const x = fx + Math.cos(a) * d * 440, y = toCanvas(21) + Math.sin(a) * d * 330;
        const lit = (fx < cx ? x - fx : fx - x) / 440; // brighter on the side toward the light
        ctx.beginPath(); ctx.arc(x, y, 10 + r() * 26, 0, 7);
        ctx.fillStyle = cols[Math.min(5, Math.max(0, Math.floor((lit + 1) * 2.2 + r() * 1.5)))]; ctx.fill();
      }
    });
    for (let i = 0; i < 160; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r());
      main.beginPath(); main.arc(fx + Math.cos(a) * d * 420, toCanvas(21) + Math.sin(a) * d * 320, 3 + r() * 4, 0, 7);
      main.fillStyle = r() < 0.7 ? "#b8402e" : "#e0a040"; main.fill();
    }
  };
  frame(cx - 880);
  frame(cx + 880);

  // foreground flowers
  const fl = ["#c8452e", "#e08a3a", "#f1e6c8", "#e9c14a", "#9a6ab0"];
  for (let i = 0; i < 1500; i++) {
    const y = mt + 40 + Math.pow(r(), 0.6) * (H - mt - 40);
    main.beginPath(); main.arc(r() * W, y, 1 + r() * 2.5, 0, 7);
    main.fillStyle = fl[i % fl.length]; main.fill();
  }
  // colour of the meadow at ground level, for the floor
  const t = (toCanvas(0) - mt) / (H - mt);
  return rgbHex(mix(hexRGB("#8f9d58"), hexRGB("#4f6a35"), Math.min(1, Math.max(0, t))));
}

// ---------- 2) Stained glass: Voronoi glass panes with lead lines ----------
export function paintGlass(ctx, W, H, r, colorAt, cell = 44, lead = 3.5) {
  const gx = Math.ceil(W / cell), gy = Math.ceil(H / cell);
  const px = new Float32Array(gx * gy), py = new Float32Array(gx * gy);
  const col = [];
  for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) {
    const k = j * gx + i;
    px[k] = (i + 0.15 + r() * 0.7) * cell; py[k] = (j + 0.15 + r() * 0.7) * cell;
    col[k] = hexRGB(colorAt(px[k], py[k]));
  }
  const img = ctx.createImageData(W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    const cj = Math.floor(y / cell);
    for (let x = 0; x < W; x++) {
      const ci = Math.floor(x / cell);
      let d1 = 1e9, d2 = 1e9, best = 0;
      for (let j = cj - 1; j <= cj + 1; j++) {
        if (j < 0 || j >= gy) continue;
        for (let i = ci - 1; i <= ci + 1; i++) {
          const ii = (i + gx) % gx;
          const k = j * gx + ii;
          const dx = px[k] + (i - ii) * cell - x, dy = py[k] - y;
          const dd = dx * dx + dy * dy;
          if (dd < d1) { d2 = d1; d1 = dd; best = k; } else if (dd < d2) d2 = dd;
        }
      }
      const o = (y * W + x) * 4;
      const edge = Math.sqrt(d2) - Math.sqrt(d1);
      if (edge < lead) { d[o] = 14; d[o + 1] = 14; d[o + 2] = 16; }
      else {
        const c = col[best];
        const shade = 1.12 - 0.32 * Math.min(1, Math.sqrt(d1) / cell);
        d[o] = Math.min(255, c[0] * shade); d[o + 1] = Math.min(255, c[1] * shade); d[o + 2] = Math.min(255, c[2] * shade);
      }
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function glassLandscape(W, toCanvas, r) {
  const R = ridges(W), cx = W / 2;
  const pick = (a) => a[Math.floor(r() * a.length)];
  return (x, y) => {
    if (Math.hypot(x - (cx - 560), y - toCanvas(22)) < 95) return pick(["#f4c542", "#f7d76a", "#e9a92e"]); // sun
    if (y < toCanvas(R.far(x))) {
      if (y > toCanvas(R.far(x)) - 55) return pick(["#f0b04a", "#f6cf72", "#e8913a"]);               // glowing horizon
      return pick(["#1f4e9c", "#2a63b8", "#3b77c9", "#16407f", "#5b8fd6", "#24589f"]);
    }
    if (y < toCanvas(R.mid(x))) return pick(["#6c4fa3", "#5a3f8f", "#7d62b8", "#4a3578"]);
    if (y < toCanvas(R.meadow(x))) return pick(["#3a6ab0", "#4b5fa8", "#5a4f9a"]);
    if (r() < 0.07) return pick(["#d4202a", "#f0b030", "#e8e0c8"]);
    return pick(["#2f7a3a", "#3d9447", "#24622f", "#5aa83a", "#2b6e4a"]);
  };
}

// ---------- 3) Millefleur tapestry ground ----------
export function paintMillefleur(ctx, w, h, r, count, squeeze = false, bg = "#1e2c1d") {
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const leafCols = ["#3f5f3a", "#55744a", "#6b8a5a", "#2f4a2e", "#7d9a62"];
  const flowerCols = ["#f1e6c8", "#e9d9a6", "#d8503a", "#e8873a", "#e9c14a", "#9fb7d6", "#c98fb0", "#f6f0e0"];
  const star = (x, y, o, i, n) => {
    ctx.beginPath();
    for (let k = 0; k < n * 2; k++) {
      const rr = k % 2 ? i : o, a = (k / (n * 2)) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  };
  for (let n = 0; n < count; n++) {
    const y = r() * h, x = r() * w, size = 7 + r() * 10;
    const sx = squeeze ? Math.min(4, 0.7 / Math.max(0.15, Math.sin((y / h) * Math.PI / 2))) : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1);
    ctx.strokeStyle = "#141c12"; ctx.lineWidth = Math.max(0.8, size * 0.12);
    const k = r();
    if (k < 0.5) {
      ctx.rotate((r() - 0.5) * 1.2);
      ctx.strokeStyle = pick(leafCols); ctx.lineWidth = size * 0.12;
      ctx.beginPath(); ctx.moveTo(0, size); ctx.lineTo(0, -size); ctx.stroke();
      ctx.fillStyle = pick(leafCols);
      for (let i = 0; i < 4; i++) {
        const yy = size * (0.6 - i * 0.45), side = i % 2 ? 1 : -1;
        ctx.beginPath(); ctx.ellipse(side * size * 0.28, yy, size * 0.32, size * 0.13, side * 0.6, 0, 7); ctx.fill();
      }
    } else if (k < 0.78) {
      const c = pick(flowerCols);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(Math.cos(a) * size * 0.42, Math.sin(a) * size * 0.42, size * 0.36, 0, 7);
        ctx.fillStyle = c; ctx.fill(); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, 0, size * 0.22, 0, 7);
      ctx.fillStyle = c === "#e9c14a" ? "#b5502a" : "#e9c14a"; ctx.fill();
    } else if (k < 0.87) {
      ctx.strokeStyle = "#55744a"; ctx.lineWidth = size * 0.1;
      ctx.beginPath(); ctx.moveTo(0, size); ctx.lineTo(0, -size * 0.2); ctx.stroke();
      ctx.strokeStyle = "#141c12"; ctx.lineWidth = Math.max(0.8, size * 0.08);
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.arc((r() - 0.5) * size, -size * 0.3 - r() * size * 0.6, size * 0.22, 0, 7);
        ctx.fillStyle = pick(["#c8352a", "#d8503a", "#a82a24"]); ctx.fill(); ctx.stroke();
      }
    } else if (k < 0.94) {
      star(0, 0, size * 0.7, size * 0.28, 6);
      ctx.fillStyle = pick(["#f6f0e0", "#e9c14a", "#9fb7d6"]); ctx.fill(); ctx.stroke();
    } else {
      ctx.strokeStyle = "#55744a"; ctx.lineWidth = size * 0.1;
      ctx.beginPath(); ctx.moveTo(-size * 0.6, -size * 0.8); ctx.quadraticCurveTo(0, -size * 1.2, size * 0.6, -size * 0.6); ctx.stroke();
      ctx.strokeStyle = "#141c12"; ctx.lineWidth = Math.max(0.8, size * 0.08);
      const c = pick(["#f1e6c8", "#c98fb0", "#9fb7d6"]);
      for (const bx of [-0.4, 0.1, 0.55]) {
        ctx.beginPath(); ctx.ellipse(bx * size, -size * 0.35, size * 0.18, size * 0.3, 0, 0, 7);
        ctx.fillStyle = c; ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();
  }
}

// ---------- Finishing touches applied to every drawn texture ----------
// Woven threads (tapestry), hatching (engraving), lead lines (stained glass)
export function finish(style, ctx, w, h, r) {
  ctx.save();
  ctx.globalCompositeOperation = "source-atop"; // only on what's already painted
  if (style === "tapestry") {
    for (let y = 0; y < h; y += 3) { ctx.fillStyle = "rgba(0,0,0,0.13)"; ctx.fillRect(0, y, w, 1); }
    for (let x = 0; x < w; x += 3) { ctx.fillStyle = "rgba(255,240,210,0.06)"; ctx.fillRect(x, 0, 1, h); }
    for (let i = 0; i < (w * h) / 300; i++) {           // stray fibres
      ctx.fillStyle = r() < 0.5 ? "rgba(255,240,210,0.10)" : "rgba(0,0,0,0.10)";
      ctx.fillRect(r() * w, r() * h, 2 + r() * 5, 1);
    }
  } else if (style === "engraving") {
    ctx.strokeStyle = "rgba(20,16,12,0.22)"; ctx.lineWidth = 1.2;
    const step = 5;
    for (let x = -h; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.stroke(); }
  } else if (style === "stained") {
    ctx.strokeStyle = "#0b0b0d"; ctx.lineWidth = Math.max(2, w * 0.035);
    for (let i = 0; i < 3; i++) {                        // lead cames across the piece
      ctx.beginPath(); ctx.moveTo(r() * w, 0); ctx.lineTo(r() * w, h); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(0, r() * h); ctx.lineTo(w, r() * h); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = Math.max(1, w * 0.02);
    ctx.beginPath(); ctx.moveTo(w * 0.2, h * 0.1); ctx.lineTo(w * 0.45, h * 0.6); ctx.stroke();
  }
  ctx.restore();
}

// ---------- 4) Flat decorative panel, drawn in the same style as the 3D tree ----------
// Parchment ground, ink outlines, sage serrated leaves with cream veins, curling
// sage branches, red apples, orange berries, purple star flowers, olive mounds.
export function paintFrieze(ctx, W, H, toCanvas, r) {
  const pick = (a) => a[Math.floor(r() * a.length)];
  const both = (x, fn) => { fn(x); if (x < 500) fn(x + W); if (x > W - 500) fn(x - W); };
  const INK = "#23241a", BARK = "#7f8d6c", APPLE = "#cf3b26";
  const LEAVES = ["#5f8f78", "#4f7f68", "#6a9a7e", "#56856c"];
  const BERRIES = ["#e8692f", "#f08d3a", "#d9482b"];
  const ink = (w = 2) => { ctx.strokeStyle = INK; ctx.lineWidth = w; ctx.stroke(); };
  ctx.lineCap = ctx.lineJoin = "round";

  // parchment
  const bg = ctx.createRadialGradient(W / 2, toCanvas(12), 0, W / 2, toCanvas(12), W * 0.6);
  bg.addColorStop(0, "#faf3e2"); bg.addColorStop(0.6, "#f4ead2"); bg.addColorStop(1, "#eadcb9");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const base = toCanvas(-3.6);

  // serrated leaf, like the tree's leaves
  const leaf = (x, y, len, ang, col) => {
    const half = len * 0.24, n = 10;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const L = [], R = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, yy = -t * len;
      const w = Math.sin(Math.PI * Math.pow(t, 0.75)) * half;
      const tooth = i % 2 && t > 0.15 && t < 0.9 ? half * 0.14 : 0;
      L.push([-w - tooth, yy]); R.push([w + tooth, yy]);
    }
    ctx.beginPath(); ctx.moveTo(0, 0);
    L.forEach(([a, b]) => ctx.lineTo(a, b)); ctx.lineTo(0, -len);
    R.reverse().forEach(([a, b]) => ctx.lineTo(a, b)); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ink(1.6);
    ctx.beginPath(); ctx.moveTo(0, -len * 0.05); ctx.quadraticCurveTo(-1, -len * 0.5, 0, -len * 0.9);
    ctx.strokeStyle = "#f4f1df"; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  };
  const star = (x, y, o) => {
    const path = (outer, inner) => {
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const rr = k % 2 ? inner : outer, a = (k / 10) * Math.PI * 2 - Math.PI / 2;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
    };
    path(o, o * 0.4); ctx.fillStyle = "#8f74c0"; ctx.fill(); ink(1.4);
    path(o * 0.5, o * 0.2); ctx.fillStyle = "#b9a4e0"; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, o * 0.16, 0, 7); ctx.fillStyle = "#f2c14e"; ctx.fill();
  };
  const apple = (x, y, s) => {
    ctx.beginPath(); ctx.moveTo(x, y - s * 0.6);
    ctx.bezierCurveTo(x + s * 1.1, y - s * 1.2, x + s * 1.2, y + s * 0.9, x, y + s * 0.85);
    ctx.bezierCurveTo(x - s * 1.2, y + s * 0.9, x - s * 1.1, y - s * 1.2, x, y - s * 0.6);
    ctx.fillStyle = APPLE; ctx.fill(); ink(1.6);
    ctx.beginPath(); ctx.ellipse(x - s * 0.4, y - s * 0.15, s * 0.16, s * 0.28, 0.3, 0, 7);
    ctx.fillStyle = "rgba(255,230,210,0.55)"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y - s * 0.6); ctx.lineTo(x + s * 0.2, y - s * 1.1); ink(2);
  };
  const berries = (x, y) => {
    for (let k = 0; k < 4 + Math.floor(r() * 3); k++) {
      ctx.beginPath(); ctx.arc(x + (r() - 0.5) * 14, y + (r() - 0.5) * 12, 3.6, 0, 7);
      ctx.fillStyle = pick(BERRIES); ctx.fill(); ink(1.1);
    }
  };

  // a curling, scroll-ended branch (sage with ink edges)
  const branch = (x0, y0, x1, y1, w, curl) => {
    const mx = (x0 + x1) / 2 + (r() - 0.5) * 30, my = (y0 + y1) / 2 - 25;
    const draw = () => {
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1);
      // a small spiral at the tip, like the scrolls on the tree
      let a = Math.atan2(y1 - my, x1 - mx), rad = 14;
      for (let k = 0; k < 14; k++) {
        a += curl * 0.45; rad *= 0.86;
        ctx.lineTo(x1 + Math.cos(a) * (14 - rad) * 0.9, y1 + Math.sin(a) * (14 - rad) * 0.9);
      }
    };
    draw(); ctx.strokeStyle = INK; ctx.lineWidth = w + 3; ctx.stroke();
    draw(); ctx.strokeStyle = BARK; ctx.lineWidth = w; ctx.stroke();
  };

  // a small tree in the same style as the big one
  const tree = (x, h) => {
    const cy = base - h * 0.62, rx = h * 0.42, ry = h * 0.34;
    ctx.beginPath();
    ctx.moveTo(x - 12, base + 6);
    ctx.quadraticCurveTo(x - 8, base - h * 0.3, x - 6, cy + ry * 0.2);
    ctx.lineTo(x + 6, cy + ry * 0.2);
    ctx.quadraticCurveTo(x + 8, base - h * 0.3, x + 12, base + 6);
    ctx.closePath();
    ctx.fillStyle = BARK; ctx.fill(); ink(2.2);
    // roots
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(x + s * 8, base); ctx.quadraticCurveTo(x + s * 18, base + 2, x + s * 26, base + 8);
      ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = BARK; ctx.lineWidth = 3; ctx.stroke();
    }
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (1.05 + (i / 8) * 0.9);
      branch(x, cy + ry * 0.25 - i * 5, x + Math.cos(a) * rx * (0.75 + r() * 0.25),
        cy + Math.sin(a) * ry * (0.75 + r() * 0.25), 3, i < 4 ? -1 : 1);
    }
    for (let i = 0; i < 210; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r());
      leaf(x + Math.cos(a) * d * rx, cy + Math.sin(a) * d * ry, 15 + r() * 7, a + Math.PI / 2 + (r() - 0.5) * 0.8, pick(LEAVES));
    }
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2, d = 0.3 + Math.sqrt(r()) * 0.65;
      const fx = x + Math.cos(a) * d * rx, fy = cy + Math.sin(a) * d * ry;
      const k = i % 3;
      if (k === 0) apple(fx, fy, 7 + r() * 2);
      else if (k === 1) berries(fx, fy);
      else star(fx, fy, 7 + r() * 3);
    }
  };

  // a flowering stem (sprigs between the trees)
  const flowerStem = (x, h) => {
    ctx.beginPath(); ctx.moveTo(x, base + 4);
    ctx.bezierCurveTo(x + 24, base - h * 0.3, x - 24, base - h * 0.65, x + 4, base - h);
    ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = "#4f7a55"; ctx.lineWidth = 2.5; ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const t = i / 8, y = base - h * t, xx = x + Math.sin(t * 6) * 12;
      leaf(xx, y, 15, (i % 2 ? 1 : -1) * 1.1, pick(LEAVES));
      if (i % 3 === 2) star(xx + (i % 2 ? -16 : 16), y - 4, 9);
    }
    star(x + 4, base - h - 6, 11);
  };

  // drifting petals on the parchment, like the 3D ones
  for (let i = 0; i < 260; i++) {
    ctx.beginPath(); ctx.arc(r() * W, toCanvas(6 + r() * 26), 1.5 + r() * 1.5, 0, 7);
    ctx.fillStyle = pick(["#8f74c0", "#e8692f", "#f2c14e", "#7aa58a"]); ctx.fill();
  }

  // the row of trees, with flowering stems between
  const n = 15, gap = W / n;
  for (let k = 0; k < n; k++) {
    const tx = (W / 2 + k * gap) % W, mx = (tx + gap / 2) % W;
    const hs = 170 + r() * 60;
    both(mx, (x) => flowerStem(x, hs));
    const h = 270 + r() * 50;
    both(tx, (x) => tree(x, h));
  }

  // olive mounds with dotted texture, like the hill
  const moundTop = (x) => base - 8 - 22 * Math.abs(Math.sin((x / W) * Math.PI * 24));
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 6) ctx.lineTo(x, moundTop(x));
  ctx.lineTo(W, H); ctx.closePath();
  ctx.fillStyle = "#6f6a3c"; ctx.fill();
  ctx.save(); ctx.clip();
  const dots = ["#5e5a31", "#7d7745", "#857f4b", "#5a5a35"];
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = dots[i % 4];
    ctx.beginPath(); ctx.arc(r() * W, base - 40 + r() * (H - base + 40), 1 + r() * 2, 0, 7); ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
  for (let x = 0; x <= W; x += 6) x ? ctx.lineTo(x, moundTop(x)) : ctx.moveTo(x, moundTop(x));
  ink(3);

  // a winding stream, same blue as the pond
  const ry1 = (x) => base + 60 + 12 * Math.sin((x / W) * Math.PI * 16);
  ctx.beginPath();
  for (let x = 0; x <= W; x += 6) x ? ctx.lineTo(x, ry1(x)) : ctx.moveTo(x, ry1(x));
  for (let x = W; x >= 0; x -= 6) ctx.lineTo(x, ry1(x) + 28);
  ctx.closePath();
  ctx.fillStyle = "#7fa4b8"; ctx.fill(); ink(3);
  for (let i = 0; i < 200; i++) {
    const x = r() * W, y = ry1(x) + 8 + r() * 14;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 8, y - 5, x + 16, y);
    ctx.strokeStyle = "rgba(240,246,250,0.7)"; ctx.lineWidth = 1.5; ctx.stroke();
  }

  // little flowers on the mounds, like the ones on the hill
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y = moundTop(x) + 6 + r() * 12;
    both(x, (fx) => {
      ctx.beginPath(); ctx.moveTo(fx, y + 10); ctx.lineTo(fx, y - 10); ink(4);
      ctx.beginPath(); ctx.moveTo(fx, y + 10); ctx.lineTo(fx, y - 10); ctx.strokeStyle = "#4f7a55"; ctx.lineWidth = 2; ctx.stroke();
      const c = pick(["#3f5fa6", "#e2893a", "#8a6aa8", "#e9b33a", "#f3e7c9"]);
      if (r() < 0.5) { ctx.beginPath(); ctx.arc(fx, y - 13, 4.5, 0, 7); ctx.fillStyle = c; ctx.fill(); ink(1.3); }
      else star(fx, y - 13, 6);
    });
  }
}
