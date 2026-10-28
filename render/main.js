// ===== 主循环与合成 =====
let frameNo = 0;
function init(tl) {
  TL = tl; LT = {};
  tl.lines.forEach(l => { (LT[l.sec] = LT[l.sec] || []).push(l.t0); });
  S.forEach(s => { s.t0 = s.t0f(); s.t1 = s.t1f(); });
  return S.map(s => [s.name, +s.t0.toFixed(2), +s.t1.toFixed(2)]);
}
const XF = 0.6;
function drawBG(t) {
  BGX.globalCompositeOperation = 'source-over'; BGX.globalAlpha = 1;
  BGX.drawImage(BG, 0, 0);
  // 星云缓慢漂移
  BGX.globalCompositeOperation = 'lighter';
  const ox = (t * 6) % 1024, oy = (t * 2.5) % 1024;
  BGX.globalAlpha = 0.35;
  for (let x = -ox; x < W; x += 1024) for (let y = -oy; y < H; y += 1024) BGX.drawImage(NEB, x, y);
  BGX.globalAlpha = 0.18;
  const ox2 = (t * -3.5 + 400) % 1024;
  for (let x = ox2 - 1024; x < W; x += 1024) for (let y = -300; y < H; y += 1024) BGX.drawImage(NEB, x, y, 1024, 1024);
  // 浮尘
  for (const d of DUST) {
    const y = ((d.y - t * d.v) % H + H) % H, x = d.x + Math.sin(t * 0.2 + d.p) * 20;
    BGX.globalAlpha = d.a * 0.45; BGX.drawImage(SP.soft, x - d.s / 2, y - d.s / 2, d.s, d.s);
  }
  BGX.globalAlpha = 1; BGX.globalCompositeOperation = 'source-over';
}
function renderFrame(t) {
  NOW = t;
  // 衰减全局特效
  FXS.flash *= 0.86; FXS.shake *= 0.86; FXS.glitch *= 0.9; FXS.bloom *= 0.9; FXS.zoomPunch *= 0.88;
  if (FXS.flash < 0.005) FXS.flash = 0;
  // 本帧活动场景
  const act = [];
  let trail = 0, bloomBase = 0.55;
  for (const s of S) {
    if (t < s.t0 - XF || t > s.t1 + XF) continue;
    const a = ss(s.t0 - XF, s.t0 + XF * 0.5, t) * (1 - ss(s.t1 - XF * 0.5, s.t1 + XF, t));
    act.push([s, a]);
    trail = Math.max(trail, (s.opts.trail || 0) * a);
    bloomBase = Math.max(bloomBase, (s.opts.bloom || 0.55));
  }
  // 切场重拍：场景开头（都在拍点上）给一下推镜 + 闪光
  for (const s of S) { if (s.t0 > 0.5 && t >= s.t0 && t - DT < s.t0) { pump({ flash: 0.14, zoomPunch: 0.9, bloom: 0.35, shake: 3 }); ev('cut', 1); } }
  drawBG(t);
  // FX 层：用背景按 (1-trail) 覆盖 → 自然拖尾
  FX.setTransform(1, 0, 0, 1, 0, 0);
  FX.globalCompositeOperation = 'source-over'; FX.globalAlpha = trail > 0.01 ? 1 - trail : 1;
  FX.drawImage(BGL, 0, 0); FX.globalAlpha = 1;
  UI.setTransform(1, 0, 0, 1, 0, 0); UI.clearRect(0, 0, W, H);
  ctx = FX;
  for (const [s, a] of act) {
    if (!s.inst) s.inst = s.make();
    const u = t - s.t0, dur = s.t1 - s.t0;
    // 转场：入场轻微推近，出场放大
    const zin = 1 + 0.06 * (1 - ss(s.t0 - XF, s.t0 + XF, t));
    const zout = 1 + 0.12 * ss(s.t1 - XF * 0.5, s.t1 + XF, t);
    const z = zin * zout;
    ctx = FX; FX.save(); FX.translate(W / 2, H / 2); FX.scale(z, z); FX.translate(-W / 2, -H / 2);
    s.inst(u, a, dur);
    FX.restore();
    FX.globalAlpha = 1; FX.globalCompositeOperation = 'source-over'; FX.shadowBlur = 0;
  }
  ctx = FX;
  // 屏幕空间冲击波
  add();
  for (let i = RINGS.length - 1; i >= 0; i--) {
    const r = RINGS[i]; r.t += DT; const k = r.t / r.life;
    if (k >= 1) { RINGS.splice(i, 1); continue; }
    const rad = easeOut(k) * r.max, al = (1 - k) * (1 - k);
    ctx.strokeStyle = rgba(r.c, 0.15 * al); ctx.lineWidth = r.w * 8; ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, TAU); ctx.stroke();
    ctx.strokeStyle = rgba(r.c, 0.7 * al); ctx.lineWidth = r.w; ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, TAU); ctx.stroke();
  }
  norm_();
  // 辉光
  B1x.globalCompositeOperation = 'source-over'; B1x.filter = 'none'; B1x.fillStyle = '#000'; B1x.fillRect(0, 0, 480, 270);
  B1x.filter = 'saturate(0.55) brightness(0.95) contrast(2.5) blur(3px)'; B1x.drawImage(FXC, 0, 0, 480, 270); B1x.filter = 'none';
  B2x.fillStyle = '#000'; B2x.fillRect(0, 0, 240, 135);
  B2x.filter = 'blur(5px)'; B2x.drawImage(B1, 0, 0, 240, 135); B2x.filter = 'none';
  // 合成到主画布
  MC.setTransform(1, 0, 0, 1, 0, 0); MC.globalCompositeOperation = 'source-over'; MC.globalAlpha = 1;
  MC.fillStyle = '#000'; MC.fillRect(0, 0, W, H);
  const sh = FXS.shake, zp = 1 + FXS.zoomPunch * 0.04;
  MC.save();
  MC.translate(W / 2 + (Math.sin(t * 91) + Math.sin(t * 57)) * sh * 0.5, H / 2 + (Math.cos(t * 73) + Math.sin(t * 39)) * sh * 0.5);
  MC.scale(zp, zp); MC.translate(-W / 2, -H / 2);
  if (FXS.glitch > 0.03) {
    // 故障：横向错位条 + 色偏残影
    const g = FXS.glitch, r = rng(frameNo * 7 + 1);
    MC.drawImage(FXC, 0, 0);
    MC.globalCompositeOperation = 'lighter';
    MC.globalAlpha = 0.35 * g; MC.filter = 'sepia(1) saturate(6) hue-rotate(-50deg)'; MC.drawImage(FXC, 10 * g, 0);
    MC.filter = 'sepia(1) saturate(6) hue-rotate(150deg)'; MC.drawImage(FXC, -10 * g, 0); MC.filter = 'none';
    MC.globalCompositeOperation = 'source-over'; MC.globalAlpha = 1;
    const n = Math.floor(4 + g * 10);
    for (let i = 0; i < n; i++) { const y = r() * H, h = 6 + r() * 60, dx = (r() - 0.5) * 120 * g; MC.drawImage(FXC, 0, y, W, h, dx, y, W, h); }
  } else MC.drawImage(FXC, 0, 0);
  MC.globalCompositeOperation = 'lighter';
  MC.globalAlpha = Math.min(1.2, bloomBase + FXS.bloom) * 0.75; MC.drawImage(B1, 0, 0, W, H);
  MC.globalAlpha = Math.min(1, (bloomBase + FXS.bloom) * 0.6); MC.drawImage(B2, 0, 0, W, H);
  MC.restore();
  // 前景虚焦光斑
  for (const b of BOK) { const x = ((b.x + t * b.vx) % (W + 300) + W + 300) % (W + 300) - 150, y = ((b.y + t * b.vy) % (H + 300) + H + 300) % (H + 300) - 150; MC.globalAlpha = b.a; MC.drawImage(SP[b.c], x - b.s / 2, y - b.s / 2, b.s, b.s); }
  MC.globalAlpha = 1; MC.globalCompositeOperation = 'source-over';
  if (FXS.glitch > 0.03) { MC.globalAlpha = 0.25 * FXS.glitch; MC.fillStyle = MC.createPattern(SCAN, 'repeat'); MC.fillRect(0, 0, W, H); MC.globalAlpha = 1; }
  // 字幕区压暗，保证可读
  const sg = MC.createLinearGradient(0, H - 300, 0, H); sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,0.6)');
  MC.fillStyle = sg; MC.fillRect(0, H - 300, W, 300);
  MC.drawImage(UIC, 0, 0);
  // 颗粒、暗角、闪光
  MC.globalCompositeOperation = 'overlay'; MC.globalAlpha = 0.05;
  const ox = (frameNo * 137) % 512, oy = (frameNo * 241) % 512;
  for (let x = -ox; x < W; x += 512) for (let y = -oy; y < H; y += 512) MC.drawImage(GRAIN, x, y);
  MC.globalAlpha = 1; MC.globalCompositeOperation = 'source-over';
  MC.drawImage(VIG, 0, 0);
  if (FXS.flash > 0) { MC.globalCompositeOperation = 'lighter'; MC.fillStyle = `rgba(255,240,215,${Math.min(0.8, FXS.flash)})`; MC.fillRect(0, 0, W, H); MC.globalCompositeOperation = 'source-over'; }
  const end = TL.total;
  if (t > end - 1.2) { MC.fillStyle = `rgba(0,0,0,${ss(end - 1.2, end - 0.05, t)})`; MC.fillRect(0, 0, W, H); }
  frameNo++;
}
window.init = init; window.renderFrame = renderFrame; window.EVENTS = EVENTS;
