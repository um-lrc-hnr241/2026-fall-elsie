// =============================================================
//  The Garden of Eden: two painted images brought to life.
//  The garden and the tree are shown with depth (a slowly drifting
//  camera makes near things move more than far things), flowing
//  waterfalls, pulsing light, sparkles and mist. Only the fruit is
//  clickable.
// =============================================================

// ---------- The fruit on the tree (edit names and links here) ----------
// x / y are positions on the tree picture: 0 = left/top edge, 1 = right/bottom edge.
const FRUIT = [
  { label: "Introduction", href: "essays/introduction.html", x: 0.31, y: 0.2 },
  { label: "Build 3", href: "essays/build-3.html", x: 0.69, y: 0.18 },
  { label: "Build 4", href: "essays/build-4.html", x: 0.17, y: 0.39 },
  { label: "Build 5", href: "essays/build-5.html", x: 0.84, y: 0.37 },
  { label: "Conclusion", href: "essays/conclusion.html", x: 0.35, y: 0.55 },
];
const FORBIDDEN = { label: "The Forbidden Fruit", x: 0.5, y: 0.74 };

const INK = "#082019";
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- Canvases ----------
const canvas = document.getElementById("scene");
const fx = document.getElementById("fx");
const fctx = fx.getContext("2d");
const gl = canvas.getContext("webgl", { premultipliedAlpha: false, antialias: false });
let W = 0, H = 0, DPR = 1;
let tree = { x: 0, y: 0, s: 0 }; // where the tree picture sits on screen (px)
let drift = [0, 0];               // the slowly drifting camera

function layout() {
  W = canvas.clientWidth; H = canvas.clientHeight;
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  for (const c of [canvas, fx]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); }
  const top = W < 700 ? 175 : 195, bottom = W < 700 ? 64 : 74;
  const s = Math.min(W * (W < 700 ? 1.25 : 0.8), (H - top - bottom) * 1.22);
  tree = { s, x: W / 2 - s / 2, y: H - bottom - s * 0.93 };
  if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
}

// ---------- Depth and glow maps, worked out from each picture ----------
// R = depth (1 = near), G = waterfall / glowing-vein mask
function makeMaps(img, kind) {
  const N = 256;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0, N, N);
  const d = g.getImageData(0, 0, N, N);
  const px = d.data;
  const depth = new Float32Array(N * N), mask = new Float32Array(N * N);
  const sm = (a, b, v) => Math.min(1, Math.max(0, (v - a) / (b - a)));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, r = px[i * 4], gg = px[i * 4 + 1], b = px[i * 4 + 2];
    const lum = (0.3 * r + 0.59 * gg + 0.11 * b) / 255;
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), sat = mx ? (mx - mn) / mx : 0;
    const fy = y / N, fxp = x / N;
    if (kind === "bg") {
      const haze = sm(0.45, 0.85, lum) * (1 - sat * 0.8);               // misty and bright = far away
      const edge = Math.abs(fxp - 0.5) * 2;
      depth[i] = 0.15 + 0.45 * fy * fy + 0.3 * (1 - haze) * (0.4 + 0.6 * edge) + 0.15 * edge;
      mask[i] = sm(60, 110, gg - r) * sm(165, 215, gg);                   // bright aqua = waterfall
    } else {
      const cx = Math.abs(fxp - 0.5) * 2;
      depth[i] = 0.25 + 0.55 * fy + 0.25 * Math.max(0, 1 - cx * 1.6) * (fy > 0.45 ? 1 : 0.4) + 0.15 * (1 - lum);
      mask[i] = sm(70, 130, b - r) * sm(160, 220, b);                     // glowing cyan veins
    }
  }
  // soften the depth so nothing tears
  const blur = (src, rad) => {
    const tmp = new Float32Array(N * N), out = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let s = 0, n = 0; for (let k = -rad; k <= rad; k++) { const xx = x + k; if (xx >= 0 && xx < N) { s += src[y * N + xx]; n++; } } tmp[y * N + x] = s / n;
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let s = 0, n = 0; for (let k = -rad; k <= rad; k++) { const yy = y + k; if (yy >= 0 && yy < N) { s += tmp[yy * N + x]; n++; } } out[y * N + x] = s / n;
    }
    return out;
  };
  const dep = blur(blur(depth, 10), 6), msk = blur(mask, 1);
  for (let i = 0; i < N * N; i++) {
    px[i * 4] = Math.min(255, dep[i] * 255); px[i * 4 + 1] = Math.min(255, msk[i] * 255); px[i * 4 + 2] = 0; px[i * 4 + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  return c;
}

// ---------- WebGL ----------
const VS = `
attribute vec2 p;
varying vec2 v;
void main() { v = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }`;
const FS = `
precision mediump float;
varying vec2 v;
uniform sampler2D img, maps;
uniform vec2 res, drift;
uniform vec4 rect;     // where the picture sits, in screen fractions (x, y, w, h)
uniform float t, amount, isTree, aspect;
float hash(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 q) {
  vec2 i = floor(q), f = fract(q); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  vec2 uv = (v - rect.xy) / rect.zw;
  if (isTree < 0.5) {                 // garden: cover the screen, slightly zoomed for room to move
    float ia = 1.0;
    vec2 sc = aspect > ia ? vec2(1.0, ia / aspect) : vec2(aspect / ia, 1.0);
    uv = 0.5 + (v - 0.5) * sc * 0.9;
  }
  float d = texture2D(maps, uv).r;
  vec2 shift = drift * (d - 0.5) * amount;
  uv += shift;
  d = texture2D(maps, uv).r;          // second look for a cleaner result
  uv = (uv - shift) + drift * (d - 0.5) * amount;
  vec4 m = texture2D(maps, uv);
  vec3 col = texture2D(img, uv).rgb;

  // flowing water: bright streaks sliding down inside the waterfalls (or pulsing veins on the tree)
  float flow = noise(vec2(uv.x * 160.0, uv.y * 9.0 - t * 1.6)) * noise(vec2(uv.x * 60.0, uv.y * 4.0 - t * 1.1));
  if (isTree < 0.5) col += m.g * (flow * 0.55 + 0.05 * sin(t * 3.0 + uv.y * 40.0)) * vec3(0.85, 1.0, 0.95);
  else col += m.g * (0.25 + 0.25 * sin(t * 1.6 + uv.y * 12.0)) * vec3(0.4, 1.0, 0.95);

  // light shafts that slowly brighten and fade
  float sh = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float c = 0.22 + fi * 0.19 + 0.02 * sin(t * 0.2 + fi);
    float x = uv.x - c + (uv.y - 0.1) * (0.18 - fi * 0.1);
    sh += exp(-x * x / 0.0012) * (0.5 + 0.5 * sin(t * 0.5 + fi * 1.7)) * (1.0 - uv.y * 0.8);
  }
  col += sh * (isTree < 0.5 ? 0.12 : 0.08) * vec3(0.9, 1.0, 0.95);

  float a = 1.0;
  if (isTree > 0.5) {                 // blend the tree picture softly into the garden
    vec2 e = (uv - vec2(0.5, 0.5)) / vec2(0.5, 0.52);
    a = 1.0 - smoothstep(0.62, 1.0, length(e));
    a *= smoothstep(0.0, 0.08, uv.y) * smoothstep(1.0, 0.94, uv.y);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) a = 0.0;
  }
  gl_FragColor = vec4(col, a);
}`;

let prog, quad, layers = [];
function setupGL() {
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s); return s; };
  prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog); gl.useProgram(prog);
  quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}
function texture(source) {
  const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
  return tx;
}
const loadImg = (src) => new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });

// ---------- Sparkles, rising motes and drifting mist (drawn on top) ----------
let seed = 99;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const motes = Array.from({ length: 70 }, () => ({ x: rand(), y: rand(), s: 0.8 + rand() * 1.8, v: 0.01 + rand() * 0.025, p: rand() * 6.28, violet: rand() < 0.3 }));
const mists = Array.from({ length: 6 }, () => ({ x: rand(), y: 0.55 + rand() * 0.35, r: 0.12 + rand() * 0.12, v: 0.004 + rand() * 0.006 }));
function drawFx(t, dt) {
  const c = fctx;
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  c.clearRect(0, 0, W, H);
  for (const m of mists) {
    m.x += m.v * dt; if (m.x > 1.3) m.x = -0.3;
    const x = m.x * W, y = m.y * H, r = m.r * Math.max(W, H);
    const gr = c.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, "rgba(230,255,248,0.18)"); gr.addColorStop(1, "rgba(230,255,248,0)");
    c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  c.globalCompositeOperation = "lighter";
  for (const p of motes) {
    p.y -= p.v * dt; if (p.y < -0.05) { p.y = 1.05; p.x = rand(); }
    const x = (p.x + Math.sin(t * 0.6 + p.p) * 0.01) * W + drift[0] * 30, y = p.y * H + drift[1] * 20;
    const a = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.5 + p.p));
    const col = p.violet ? "200,170,255" : "170,255,230";
    c.fillStyle = `rgba(${col},${a * 0.25})`; c.beginPath(); c.arc(x, y, p.s * 4, 0, 7); c.fill();
    c.fillStyle = `rgba(${col},${a})`; c.beginPath(); c.arc(x, y, p.s, 0, 7); c.fill();
  }
  c.globalCompositeOperation = "source-over";
}

// ---------- Animation ----------
let last = 0;
function frame(now) {
  const t = now / 1000, dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
  drift = [Math.sin(t * 0.17) * 0.9 + Math.sin(t * 0.07) * 0.3, Math.cos(t * 0.13) * 0.5];
  if (gl && layers.length) {
    gl.clearColor(0.05, 0.2, 0.17, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    const U = (n) => gl.getUniformLocation(prog, n);
    gl.uniform1f(U("t"), t); gl.uniform1f(U("aspect"), W / H); gl.uniform2f(U("drift"), drift[0], drift[1]);
    gl.uniform1i(U("img"), 0); gl.uniform1i(U("maps"), 1);
    for (const L of layers) {
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, L.img);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, L.maps);
      gl.uniform1f(U("isTree"), L.tree ? 1 : 0);
      gl.uniform1f(U("amount"), L.tree ? 0.022 : 0.03);
      const ox = L.tree ? drift[0] * 10 : 0, oy = L.tree ? drift[1] * 6 : 0; // the tree layer floats in front
      gl.uniform4f(U("rect"), L.tree ? (tree.x + ox) / W : 0, L.tree ? (tree.y + oy) / H : 0, L.tree ? tree.s / W : 1, L.tree ? tree.s / H : 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }
  drawFx(t, dt);
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
  const ox = drift[0] * 10, oy = drift[1] * 6;
  for (const a of appleEls) {
    if (a.el.classList.contains("falling")) continue;
    const size = Math.max(a.golden ? 46 : 34, tree.s * (a.golden ? 0.085 : 0.058));
    a.el.style.setProperty("--size", size + "px");
    const fxr = W < 700 ? 0.5 + (a.f.x - 0.5) * 0.82 : a.f.x; // keep labels on narrow screens
    a.el.style.left = tree.x + fxr * tree.s + ox + "px";
    a.el.style.top = tree.y + a.f.y * tree.s + oy + "px";
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
async function start() {
  layout();
  try {
    if (!gl) throw new Error("no WebGL");
    setupGL();
    const [bg, tr] = await Promise.all([loadImg("images/garden-bg.jpg"), loadImg("images/tree.jpg")]);
    layers = [
      { img: texture(bg), maps: texture(makeMaps(bg, "bg")) },
      { img: texture(tr), maps: texture(makeMaps(tr, "tree")), tree: true },
    ];
  } catch (e) {
    document.body.classList.add("no-gl"); // plain pictures instead
  }
  document.getElementById("loading").classList.add("done");
  window.__gardenReady = true;
}
let resizeTimer;
window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { layout(); if (atEarth) window.scrollTo(0, earth.offsetTop); }, 150); });
window.scrollTo(0, 0);
start();
requestAnimationFrame(frame);
