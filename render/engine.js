// ===== 引擎：分层合成 + 辉光 + 拖尾 + 震动 + 闪光 + 故障 + 3D 镜头 =====
const W = 1920, H = 1080, FPS = 30, DT = 1 / FPS;
const TAU = Math.PI * 2;
const main = document.getElementById('c'); main.width = W; main.height = H;
const MC = main.getContext('2d');
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const FXC = mk(W, H), FX = FXC.getContext('2d');      // 主画面层（会被拖尾、辉光）
const UIC = mk(W, H), UI = UIC.getContext('2d');      // 文字/HUD 层（清晰）
const BGL = mk(W, H), BGX = BGL.getContext('2d');     // 背景层
const B1 = mk(480, 270), B1x = B1.getContext('2d');
const B2 = mk(240, 135), B2x = B2.getContext('2d');
let ctx = FX;

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
const easeIO = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function gauss(r) { const u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
const wrap = a => { a = a % TAU; return a < 0 ? a + TAU : a; };
const angd = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

// ---------- 节拍网格（114 BPM，第一拍 0.1s） ----------
const BPM = 114, BEAT = 60 / BPM, B0 = 0.1;
const gph = (t, beats) => TAU * (t - B0) / (beats * BEAT);          // 每 beats 拍走一圈的音乐相位
const ceilB = (t, step = 1) => B0 + Math.ceil((t - B0) / (BEAT * step) - 1e-6) * BEAT * step;
const snapB = (t, step = 1) => B0 + Math.round((t - B0) / (BEAT * step)) * BEAT * step;
const SERIF = '"Noto Serif CJK SC", serif';
const MONO = '"DejaVu Sans Mono", monospace';
const GOLD = [232, 196, 128], TEAL = [120, 205, 215], WHITE = [238, 242, 252], AMBER = [255, 156, 84], ROSE = [245, 140, 120], FLY = [210, 236, 130];
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

// ---------- 精灵 ----------
function makeGlow(c, size = 64, core = 0.12) {
  const cc = mk(size, size), x = cc.getContext('2d');
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(core * 0.6, rgba(c, 1)); g.addColorStop(core, rgba(c, 0.8));
  g.addColorStop(0.32, rgba(c, 0.2)); g.addColorStop(0.6, rgba(c, 0.05)); g.addColorStop(1, rgba(c, 0));
  x.fillStyle = g; x.fillRect(0, 0, size, size); return cc;
}
function makeBokeh(c, size = 128) {
  const cc = mk(size, size), x = cc.getContext('2d');
  const g = x.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size / 2);
  g.addColorStop(0, rgba(c, 0.35)); g.addColorStop(0.8, rgba(c, 0.5)); g.addColorStop(1, rgba(c, 0));
  x.fillStyle = g; x.beginPath(); x.arc(size / 2, size / 2, size / 2, 0, TAU); x.fill(); return cc;
}
const SP = {
  white: makeGlow(WHITE), gold: makeGlow(GOLD), teal: makeGlow(TEAL), fly: makeGlow(FLY),
  amber: makeGlow(AMBER), red: makeGlow([255, 90, 80]), rose: makeGlow(ROSE),
  soft: makeGlow(WHITE, 128, 0.04), softGold: makeGlow(GOLD, 256, 0.03), softTeal: makeGlow(TEAL, 256, 0.03),
  bokGold: makeBokeh(GOLD), bokTeal: makeBokeh(TEAL), bokWhite: makeBokeh(WHITE), bokFly: makeBokeh(FLY),
};
function dot(s, x, y, size, a) { if (a <= 0.004 || size < 0.5) return; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(s, x - size / 2, y - size / 2, size, size); ctx.globalAlpha = 1; }
function add() { ctx.globalCompositeOperation = 'lighter'; }
function norm_() { ctx.globalCompositeOperation = 'source-over'; }
function line(x1, y1, x2, y2, c, a, w = 1) { if (a <= 0.004) return; ctx.globalAlpha = 1; ctx.strokeStyle = rgba(c, Math.min(1, a)); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function poly(pts, c, a, w = 1, close = false) { if (a <= 0.004 || pts.length < 2) return; ctx.globalAlpha = 1; ctx.strokeStyle = rgba(c, Math.min(1, a)); ctx.lineWidth = w; ctx.beginPath(); let started = false; for (const p of pts) { if (!p) { started = false; continue; } if (!started) { ctx.moveTo(p[0], p[1]); started = true; } else ctx.lineTo(p[0], p[1]); } if (close) ctx.closePath(); ctx.stroke(); }
// 发光线：粗淡 + 细亮
function gline(pts, c, a, w = 1.4, close = false) { add(); poly(pts, c, a * 0.18, w * 6, close); poly(pts, c, a * 0.35, w * 2.5, close); poly(pts, c, a, w, close); norm_(); }

// ---------- 文字 ----------
function txt(s, x, y, font, color, align = 'center', ls = '0px', glow = 0) {
  ctx.globalAlpha = 1; ctx.font = font; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = ls; ctx.fillStyle = color;
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
  ctx.fillText(s, x, y); ctx.shadowBlur = 0; ctx.letterSpacing = '0px';
}
function onUI(fn) { const p = ctx; ctx = UI; ctx.globalCompositeOperation = 'source-over'; fn(); ctx = p; }
function hudTR(lines, a) { if (a <= 0.01) return; onUI(() => lines.forEach((s, i) => txt(s, W - 96, 92 + i * 25, '14px ' + MONO, rgba(GOLD, 0.55 * a), 'right', '3px'))); }
function hudTL(zh, en, a, y = 96) { if (a <= 0.01) return; onUI(() => { txt(zh, 96, y, '22px ' + SERIF, rgba(GOLD, 0.85 * a), 'left', '2px'); if (en) txt(en, 96, y + 26, '12px ' + MONO, rgba(GOLD, 0.42 * a), 'left', '3px'); }); }
function heading(zh, en, a, y = 150) {
  if (a <= 0.01) return;
  onUI(() => {
    const k = easeOut(a); ctx.save(); ctx.translate(W / 2, y); ctx.scale(lerp(1.08, 1, k), lerp(1.08, 1, k)); ctx.translate(-W / 2, -y);
    txt(zh, W / 2, y, '42px ' + SERIF, rgba(WHITE, 0.95 * a), 'center', lerp(18, 7, k) + 'px', 22);
    if (en) txt(en, W / 2, y + 32, '12px ' + MONO, rgba(WHITE, 0.4 * a), 'center', '4px');
    ctx.restore();
  });
}
function brackets(x, y, w, h, a, c = GOLD) {
  if (a <= 0.01) return; ctx.globalAlpha = 1; ctx.strokeStyle = rgba(c, 0.4 * a); ctx.lineWidth = 1.2; const L = 18;
  ctx.beginPath();
  ctx.moveTo(x, y + L); ctx.lineTo(x, y); ctx.lineTo(x + L, y);
  ctx.moveTo(x + w - L, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + L);
  ctx.moveTo(x + w, y + h - L); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - L, y + h);
  ctx.moveTo(x + L, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - L);
  ctx.stroke();
}
const fmt = (v, d = 2) => v.toFixed(d);

// ---------- 全局特效状态 ----------
const FXS = { bloom: 0, flash: 0, shake: 0, glitch: 0, trail: 0, zoomPunch: 0, tint: null };
function pump(o) { for (const k in o) FXS[k] = Math.max(FXS[k] || 0, o[k]); }
const RINGS = [];   // 屏幕空间冲击波 {x,y,t,max,c,w}
function shock(x, y, max = 600, c = GOLD, w = 3, life = 1.2) { RINGS.push({ x, y, t: 0, max, c, w, life }); }

// ---------- 3D 镜头 ----------
function Cam(pos, tgt, fov = 0.9) {
  const f = nrm([tgt[0] - pos[0], tgt[1] - pos[1], tgt[2] - pos[2]]);
  const r = nrm([f[2], 0, -f[0]]);             // cross(up, f)
  const u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]];
  const F = (W / 2) / Math.tan(fov / 2);
  return {
    pos, F,
    p(x, y, z) {
      const dx = x - pos[0], dy = y - pos[1], dz = z - pos[2];
      const zc = dx * f[0] + dy * f[1] + dz * f[2]; if (zc < 5) return null;
      const s = F / zc;
      return [W / 2 + (dx * r[0] + dy * r[1] + dz * r[2]) * s, H / 2 - (dx * u[0] + dy * u[1] + dz * u[2]) * s, s, zc];
    }
  };
}
function nrm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
const V = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
// 关键帧镜头：keys = [[t, pos, tgt, fov]]
function camKeys(keys, u) {
  if (u <= keys[0][0]) return Cam(keys[0][1], keys[0][2], keys[0][3]);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (u <= b[0]) { const t = easeIO((u - a[0]) / (b[0] - a[0])); return Cam(V(a[1], b[1], t), V(a[2], b[2], t), lerp(a[3], b[3], t)); }
  }
  const k = keys[keys.length - 1]; return Cam(k[1], k[2], k[3]);
}
// 深度雾：越远越暗
const fog = (zc, near = 300, far = 2400) => clamp(1 - (zc - near) / (far - near), 0.12, 1);

// ---------- 背景素材 ----------
const BG = (() => {
  const c = mk(W, H), x = c.getContext('2d');
  const g = x.createRadialGradient(W / 2, H * 0.45, 50, W / 2, H * 0.5, 1150);
  g.addColorStop(0, '#101a2c'); g.addColorStop(0.55, '#090f1c'); g.addColorStop(1, '#03050a');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const r = rng(3);
  for (let i = 0; i < W; i += 3) { x.fillStyle = `rgba(150,170,200,${0.005 + r() * 0.008})`; x.fillRect(i, 0, 1, H); }
  return c;
})();
const NEB = (() => {   // 星云纹理
  const c = mk(1024, 1024), x = c.getContext('2d'); const r = rng(42);
  for (let i = 0; i < 70; i++) {
    const px = r() * 1024, py = r() * 1024, rad = 80 + r() * 260;
    const col = r() < 0.5 ? [40, 90, 140] : (r() < 0.6 ? [30, 60, 110] : [90, 70, 50]);
    for (const [ox, oy] of [[0, 0], [1024, 0], [-1024, 0], [0, 1024], [0, -1024], [1024, 1024], [-1024, -1024], [1024, -1024], [-1024, 1024]]) {
      const g = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, rad);
      g.addColorStop(0, rgba(col, 0.10 + r() * 0.05)); g.addColorStop(1, rgba(col, 0));
      x.fillStyle = g; x.fillRect(px + ox - rad, py + oy - rad, rad * 2, rad * 2);
    }
  }
  return c;
})();
const GRAIN = (() => {
  const c = mk(512, 512), x = c.getContext('2d'); const d = x.createImageData(512, 512); const r = rng(11);
  for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0); return c;
})();
const VIG = (() => {
  const c = mk(W, H), x = c.getContext('2d');
  const g = x.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 1.0);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.68)');
  x.fillStyle = g; x.fillRect(0, 0, W, H); return c;
})();
const SCAN = (() => { const c = mk(4, 4), x = c.getContext('2d'); x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(0, 0, 4, 2); return c; })();
const DUST = (() => { const r = rng(5); return Array.from({ length: 160 }, () => ({ x: r() * W, y: r() * H, v: 4 + r() * 12, a: 0.05 + r() * 0.12, s: 5 + r() * 9, p: r() * TAU, z: r() })); })();
const BOK = (() => { const r = rng(6); return Array.from({ length: 14 }, () => ({ x: r() * W, y: r() * H, s: 60 + r() * 140, a: 0.03 + r() * 0.05, vx: (r() - 0.5) * 8, vy: -2 - r() * 6, c: r() < 0.5 ? 'bokGold' : 'bokTeal' })); })();

// ---------- 事件（配乐用） ----------
const EVENTS = []; let NOW = 0;
function ev(type, v = 1, extra) { EVENTS.push([+NOW.toFixed(3), type, v, extra || 0]); }

// ---------- 时间轴 ----------
let TL = null, LT = {};
const lt = (sec, k) => LT[sec][k];
const secEnd = sec => TL.secs[sec][1];   // 这一段结束 = 下一段开头（段落顺序可以随意调整）

// ---------- 场景注册 ----------
const S = [];
// opts: trail(0..1), bloom(基线), xf(交叉时长)
function scene(name, t0f, t1f, make, opts = {}) { S.push({ name, t0f, t1f, make, opts, inst: null }); }

// ---------- 粒子拼字 ----------
function textPoints(str, font, step = 4, ls = '0px') {
  const c = mk(1400, 360), x = c.getContext('2d');
  x.fillStyle = '#fff'; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.letterSpacing = ls;
  x.fillText(str, 700, 180);
  const d = x.getImageData(0, 0, 1400, 360).data, pts = [];
  for (let y = 0; y < 360; y += step) for (let xx = 0; xx < 1400; xx += step) if (d[(y * 1400 + xx) * 4 + 3] > 128) pts.push([xx - 700, y - 180]);
  return pts;
}
