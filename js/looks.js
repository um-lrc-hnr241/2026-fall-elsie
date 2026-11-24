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
