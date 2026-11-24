// =============================================================
//  Scrolling story: paints each scene, moves its layers as you
//  scroll (parallax), fades text in and out, and tracks chapters.
// =============================================================
import { paintScene } from "./paint.js?v=4";

const scenes = [...document.querySelectorAll(".scene")];
const dots = document.querySelector(".dots");
const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
const LAYERS = ["back", "mid", "front"];
const SPEED = { back: 0.04, mid: 0.1, front: 0.2 }; // how far each layer drifts while scrolling

// ---------- Chapter dots ----------
scenes.forEach((s) => {
  const a = document.createElement("a");
  a.href = "#" + s.id;
  a.innerHTML = `<span>${s.dataset.title}</span>`;
  a.setAttribute("aria-label", s.dataset.title);
  dots.appendChild(a);
});
const dotLinks = [...dots.children];

// ---------- Painting (each scene painted once, when it comes near) ----------
const painted = new Map();
function paint(section) {
  const w = window.innerWidth, h = window.innerHeight;
  const key = `${w}x${h}`;
  if (painted.get(section) === key) return;
  painted.set(section, key);
  const holder = section.querySelector(".layers");
  holder.innerHTML = "";
  const ctxs = {};
  for (const name of LAYERS) {
    const c = document.createElement("canvas");
    c.width = Math.round(w * DPR); c.height = Math.round(h * 1.2 * DPR);
    c.dataset.layer = name;
    holder.appendChild(c);
    const ctx = c.getContext("2d");
    ctx.scale(DPR, DPR);
    ctx.lineCap = ctx.lineJoin = "round";
    ctxs[name] = ctx;
  }
  paintScene(section.dataset.scene, ctxs, w, h, DPR);
}

const near = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) paint(e.target);
}, { rootMargin: "120% 0px" });
scenes.forEach((s) => near.observe(s));

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    painted.clear();
    scenes.forEach((s) => {
      const r = s.getBoundingClientRect();
      if (r.bottom > -window.innerHeight * 1.2 && r.top < window.innerHeight * 2.2) paint(s);
    });
  }, 300);
});

// ---------- Scroll effects ----------
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function update() {
  const vh = window.innerHeight;
  let current = 0;
  scenes.forEach((s, i) => {
    const r = s.getBoundingClientRect();
    if (r.top <= vh * 0.5) current = i;
    if (r.bottom < -50 || r.top > vh + 50) return;
    const p = clamp(-r.top / (r.height - vh), 0, 1); // 0 at the start of the scene, 1 at the end
    for (const c of s.querySelectorAll("canvas")) {
      const sp = SPEED[c.dataset.layer];
      const scale = c.dataset.layer === "back" ? 1.04 + p * 0.04 : 1;
      c.style.transform = `translate3d(0, ${-p * sp * vh}px, 0) scale(${scale})`;
    }
    // text: fade in, hold, fade out
    const panel = s.querySelector(".panel");
    const first = i === 0;
    const o = first ? clamp(1 - (p - 0.45) / 0.3, 0, 1) : Math.min(clamp((p - 0.08) / 0.15, 0, 1), clamp((0.95 - p) / 0.15, 0, 1));
    panel.style.opacity = o.toFixed(3);
  });
  dotLinks.forEach((d, i) => d.classList.toggle("active", i === current));
}
let ticking = false;
window.addEventListener("scroll", () => {
  if (!ticking) { ticking = true; requestAnimationFrame(() => { update(); ticking = false; }); }
}, { passive: true });
window.addEventListener("resize", update);
update();

// ---------- "Read more" links with no page yet ----------
const toast = document.getElementById("toast");
let toastTimer;
document.querySelectorAll(".more").forEach((a) => {
  if (a.getAttribute("href")) return;
  a.addEventListener("click", (e) => {
    e.preventDefault();
    toast.textContent = "This chapter page is coming soon";
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  });
});

window.__storyReady = true;
