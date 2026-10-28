// ===== 开场：结果先行 → 倒带 → 混乱 → 自发对齐 =====
function Metro3D(seed, mode) {
  const r = rng(seed), M = [];
  const p0 = -TAU * 0.95 * 0.1;   // 第一拍落在 0.1s
  const devs = Array.from({ length: 32 }, () => gauss(r) * 0.045), dm = devs.reduce((x, y) => x + y) / 32;
  for (let i = 0; i < 32; i++) {
    const c = i % 8, row = Math.floor(i / 8);
    const om = TAU * (0.95 + devs[i] - dm);   // 平均频率严格等于 0.95Hz → 114 BPM
    M.push({ x: -420 + c * 120, z: -200 + row * 135, om, chaos: r() * TAU, ph: p0 + gauss(r) * 0.03, s: 0, flash: 0, tgt: 0, from: 0 });
  }
  if (mode === 'chaos') M.forEach(m => m.ph = m.chaos);
  const WR = [];  // 木板上的冲击波
  const DU = Array.from({ length: 260 }, () => [(r() - 0.5) * 1600, r() * 520, (r() - 0.5) * 1400 + 100, r() * TAU]);
  const st = { M, WR, R: 1, psi: 0 };
  st.mean = () => { let cx = 0, sy = 0; M.forEach(m => { cx += Math.cos(m.ph); sy += Math.sin(m.ph); }); st.R = Math.hypot(cx, sy) / 32; st.psi = Math.atan2(sy, cx); };
  st.step = (K, dt, pace = 0) => {
    st.mean(); const tk = []; const pm = gph(NOW + dt, 2);
    M.forEach((m, i) => { m.ph += (m.om + K * st.R * Math.sin(st.psi - m.ph) + pace * Math.sin(pm - m.ph)) * dt; });
    st.detect(tk); return tk;
  };
  st.detect = tk => { M.forEach((m, i) => { const s = Math.sin(m.ph); if (Math.sign(s) !== Math.sign(m.s) && m.s !== 0) { m.flash = 1; tk.push(i); } m.s = s || 1e-6; m.flash *= 0.85; }); };
  st.ring = (x, z, max, life = 1.0, c = GOLD) => WR.push({ x, z, t: 0, max, life, c });
  st.draw = (cam, a, beat = 0) => {
    // 体积光
    add();
    const cpt = cam.p(0, 40, 80);
    if (cpt) { dot(SP.softGold, cpt[0], cpt[1] + 40, 1300, (0.05 + beat * 0.10) * a); dot(SP.softTeal, cpt[0], cpt[1] - 200, 1600, 0.03 * a); }
    // 空中浮尘（3D）
    DU.forEach(d => { const p = cam.p(d[0], d[1] + Math.sin(NOW * 0.3 + d[3]) * 12, d[2]); if (p) dot(SP.soft, p[0], p[1], 6 * p[2], 0.10 * fog(p[3], 300, 2600) * a); });
    norm_();
    // 木板
    const corners = [[-520, -300], [520, -300], [520, 340], [-520, 340]].map(([x, z]) => cam.p(x, 0, z));
    if (corners.every(Boolean)) {
      ctx.globalAlpha = 1; ctx.fillStyle = `rgba(12,22,38,${0.55 * a})`; ctx.beginPath(); corners.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill();
      gline(corners, TEAL, 0.45 * a + beat * 0.3 * a, 1.4, true);
    }
    add();
    for (let x = -500; x <= 500; x += 100) poly([cam.p(x, 0, -300), cam.p(x, 0, 340)], TEAL, 0.07 * a, 1);
    for (let z = -300; z <= 340; z += 80) poly([cam.p(-520, 0, z), cam.p(520, 0, z)], TEAL, 0.07 * a, 1);
    // 冲击波
    for (let i = WR.length - 1; i >= 0; i--) {
      const w = WR[i]; w.t += DT; const k = w.t / w.life; if (k >= 1) { WR.splice(i, 1); continue; }
      const rad = easeOut(k) * w.max, al = (1 - k) * (1 - k) * a;
      const pts = []; for (let q = 0; q <= 48; q++) { const an = q / 48 * TAU; pts.push(cam.p(w.x + Math.cos(an) * rad, 1, w.z + Math.sin(an) * rad)); }
      poly(pts, w.c, 0.18 * al, 10); poly(pts, w.c, 0.8 * al, 2);
    }
    norm_();
    // 节拍器（远→近）
    const order = M.map((m, i) => { const p = cam.p(m.x, 50, m.z); return [p ? p[3] : -1, i]; }).filter(o => o[0] > 0).sort((p, q) => q[0] - p[0]);
    for (const [zc, i] of order) {
      const m = M[i], fo = fog(zc, 300, 2600) * a;
      const body = [[m.x - 28, 0], [m.x - 11, 108], [m.x + 11, 108], [m.x + 28, 0]].map(([x, y]) => cam.p(x, y, m.z));
      if (!body.every(Boolean)) continue;
      ctx.globalAlpha = 1; ctx.fillStyle = `rgba(14,22,38,${0.42 * a})`; ctx.beginPath(); body.forEach((p, k) => k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill();
      poly(body, WHITE, 0.22 * fo, 1.1, true); poly([body[1], body[2]], GOLD, 0.35 * fo, 1.4);
      const piv = cam.p(m.x, 10, m.z - 1);
      // 摆杆残影（动态模糊）
      add();
      for (let k = 6; k >= 0; k--) {
        const th = 0.45 * Math.sin(m.ph - k * 0.075), L = 100;
        const tip = cam.p(m.x + Math.sin(th) * L, 10 + Math.cos(th) * L, m.z - 1);
        if (!tip) continue;
        if (k === 0) {
          poly([piv, tip], WHITE, 0.85 * fo, 1.8);
          const wt = cam.p(m.x + Math.sin(th) * L * 0.62, 10 + Math.cos(th) * L * 0.62, m.z - 1);
          dot(SP.white, wt[0], wt[1], 34 * wt[2] / 2.2, 0.75 * fo);
          dot(SP.white, tip[0], tip[1], 20 * tip[2] / 2.2, 0.85 * fo);
          // 倒影
          const rw = cam.p(m.x + Math.sin(th) * L * 0.62, -10 - Math.cos(th) * L * 0.62, m.z - 1);
          if (rw) dot(SP.white, rw[0], rw[1], 30 * rw[2] / 2.2, 0.10 * fo);
        } else poly([piv, tip], WHITE, 0.16 * (1 - k / 7) * fo, 1.4);
      }
      dot(SP.gold, piv[0], piv[1], (50 + m.flash * 110) * piv[2] / 2.2, (0.25 + m.flash * 0.9) * fo);
      if (m.flash > 0.5) dot(SP.white, piv[0], piv[1], 24 * piv[2] / 2.2, m.flash * fo);
      norm_();
    }
  };
  return st;
}

function phaseRing(st, a, x = 1720, y = 540, rr = 80) {
  if (a <= 0.01) return;
  onUI(() => {
    ctx.strokeStyle = rgba(TEAL, 0.3 * a); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.stroke();
    line(x, y, x + Math.cos(st.psi) * rr * st.R, y + Math.sin(st.psi) * rr * st.R, GOLD, 0.9 * a, 2);
    add(); st.M.forEach(m => dot(SP.teal, x + Math.cos(m.ph) * rr, y + Math.sin(m.ph) * rr, 18, 0.9 * a)); norm_();
    txt('PHASE', x, y + rr + 28, '12px ' + MONO, rgba(GOLD, 0.5 * a), 'center', '3px');
  });
}

scene('hook', () => 0, () => lt('title', 0), () => {
  const st = Metro3D(21, 'sync');
  let mode = 'sync', rewindStart = -1, locked = false, beat = 0, first = true;
  return (u, a, dur) => {
    const L = k => lt('hook', k);
    const RW0 = L(1), RW1 = L(1) + 3 * BEAT, lockT = L(4) + 6 * BEAT;
    if (first && NOW >= B0 - DT * 0.5) { first = false; pump({ flash: 0.12, bloom: 0.5, shake: 5 }); ev('hit', 1); }
    let tk = [];
    if (u < RW0) { tk = st.step(3, DT, 1.5); }
    else if (u < RW1) {
      if (mode !== 'rewind') {
        mode = 'rewind'; ev('rewind', 1);
        st.M.forEach(m => { m.from = m.ph; m.tgt = m.chaos + TAU * Math.round((m.ph - 6 * TAU - m.chaos) / TAU); });
      }
      const e = easeIO((u - RW0) / (RW1 - RW0));
      st.M.forEach(m => m.ph = lerp(m.from, m.tgt, e));
      st.mean(); st.detect([]);
      pump({ glitch: 0.9 * Math.sin(Math.PI * clamp((u - RW0) / (RW1 - RW0))) + 0.15 });
    } else {
      if (mode === 'rewind') { mode = 'free'; pump({ flash: 0.25, shake: 4 }); }
      const K = u < L(4) ? 0 : 3.2 * ss(L(4), lockT - 0.2, u);
      tk = st.step(K, DT, u < L(4) ? 0 : 1.6 * ss(L(4), lockT, u));
      if (!locked && u >= lockT - DT * 0.5 && st.R > 0.8) { locked = true; pump({ flash: 0.5, bloom: 1.0, shake: 12, zoomPunch: 1 }); st.ring(0, 20, 1100, 1.6, WHITE); ev('lock', 1); }
    }
    if (tk.length) {
      ev('tick', tk.length, st.R);
      if (tk.length >= 10) { st.ring(0, 20, 900, 1.1); pump({ bloom: 0.35, shake: 3 }); beat = 1; }
      else tk.forEach(i => st.ring(st.M[i].x, st.M[i].z, 105, 0.5, TEAL));
    }
    beat *= 0.88;
    const cam = camKeys([
      [0, [-430, 165, -560], [70, 55, 60], 0.85],
      [L(1), [-120, 190, -660], [80, 45, 80], 0.85],
      [RW1, [0, 560, -1250], [0, 0, 40], 0.9],
      [L(3), [430, 430, -1060], [0, 10, 40], 0.9],
      [L(4) + 3.5, [150, 210, -760], [0, 50, 40], 0.85],
      [L(5), [-110, 260, -820], [0, 40, 40], 0.85],
      [dur, [0, 720, -1500], [0, 0, 40], 0.95],
    ], u);
    st.draw(cam, a, beat);
    // HUD
    const tStart = RW1;
    let clockS;
    if (u < RW0) clockS = 0;
    else if (u < RW1) clockS = -180 * easeIO((u - RW0) / (RW1 - RW0));
    else { clockS = u < L(4) ? -180 + (u - RW1) : lerp(-180 + (L(4) - RW1), 0, ss(L(4), lockT, u)) + Math.max(0, u - lockT); }
    const sg = clockS < -0.5 ? '−' : '+', ab = Math.abs(clockS);
    const clock = `T ${sg} ${String(Math.floor(ab / 60)).padStart(2, '0')}:${String(Math.floor(ab % 60)).padStart(2, '0')}`;
    hudTR(['METRONOME ARRAY · N = 32', 'ONE SHARED BOARD', `ORDER  r = ${fmt(st.R)}`, clock], a);
    hudTL('同一块木板', 'THIRTY-TWO METRONOMES', a);
    phaseRing(st, a * ss(RW1, RW1 + 1, u), 1770, 290, 62);
    if (u > RW0 && u < RW1 + 0.2) {
      const ga = Math.sin(Math.PI * clamp((u - RW0) / (RW1 + 0.2 - RW0)));
      onUI(() => { txt('◀◀  REWIND', W / 2, 170, 'bold 46px ' + MONO, rgba([255, 255, 255], 0.9 * ga), 'center', '14px', 18); txt(clock, W / 2, 212, '20px ' + MONO, rgba(GOLD, 0.8 * ga), 'center', '6px'); });
    }
    heading('它们自己对上了', 'THEY FOUND EACH OTHER', a * (locked ? ss(0, 0.5, u - lockT) : 0) * (1 - ss(L(5) - 0.3, L(5) + 0.4, u)), 150);
    if (u > L(5) + 0.6) { const qa = a * ss(L(5) + 0.6, L(5) + 1.6, u); onUI(() => txt('?', W / 2, 220, '96px ' + SERIF, rgba(WHITE, 0.8 * qa), 'center', '0px', 30)); }
  };
}, { bloom: 0.6 });

// ===== 品牌：固定片头（粒子聚成放大镜）+ 标题卡（系列模板） =====
const CREAM = [242, 240, 234], WARM = [232, 163, 61], GREYB = [140, 138, 131];
SP.warm = makeGlow(WARM); SP.cream = makeGlow(CREAM);
function magPoints(cx, cy, R, n, r) {
  const out = [];
  for (let i = 0; i < n; i++) {
    if (r() < 0.72) { const an = r() * TAU, rr = R + (r() - 0.5) * R * 0.24; out.push([cx + Math.cos(an) * rr, cy + Math.sin(an) * rr]); }
    else { const t = r(), d = R * 1.12 + t * R * 0.86, w = (r() - 0.5) * R * 0.33; out.push([cx + d * 0.7071 - w * 0.7071, cy + d * 0.7071 + w * 0.7071]); }
  }
  return out;
}
// 头像同款放大镜（按头像实测比例）：环宽 0.24R，手柄宽 0.33R、末端 2.14R（含圆头），十字尖星臂长 0.51R
function sparkle(x, y, L, w) {
  ctx.beginPath(); ctx.moveTo(x, y - L); ctx.lineTo(x + w, y); ctx.lineTo(x, y + L); ctx.lineTo(x - w, y); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - L, y); ctx.lineTo(x, y - w); ctx.lineTo(x + L, y); ctx.lineTo(x, y + w); ctx.closePath(); ctx.fill();
}
function drawMag(x, y, R, a, lw = 0, star = 1) {
  if (a <= 0.01) return;
  const rw = R * 0.24, hw = R * 0.33, hend = R * 2.14 - hw / 2, L = R * 0.51;
  ctx.globalAlpha = 1;
  if (star > 0.01) {   // 镜片暖光
    const g = ctx.createRadialGradient(x, y, 0, x, y, R * 0.86);
    g.addColorStop(0, rgba([255, 200, 110], 0.62 * a * star)); g.addColorStop(0.5, rgba([235, 150, 55], 0.22 * a * star)); g.addColorStop(1, rgba([235, 150, 55], 0));
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R * 0.86, 0, TAU); ctx.fill();
  }
  ctx.lineCap = 'round';
  for (const [k, al, comp] of [[2.0, 0.03, 'lighter'], [1.3, 0.07, 'lighter'], [1, 1, 'source-over']]) {
    ctx.globalCompositeOperation = comp; ctx.strokeStyle = rgba([210, 124, 34], al * a);
    ctx.lineWidth = rw * k; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
    ctx.lineWidth = hw * k; ctx.beginPath(); ctx.moveTo(x + R * 0.7071, y + R * 0.7071); ctx.lineTo(x + hend * 0.7071, y + hend * 0.7071); ctx.stroke();
  }
  if (star > 0.01) {
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba([255, 200, 120], 0.30 * a * star); sparkle(x, y, L * 1.12 * star, L * 0.27 * star);
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = rgba([255, 251, 240], a * star); sparkle(x, y, L * star, L * 0.21 * star);
    ctx.globalCompositeOperation = 'lighter'; dot(SP.warm, x, y, R * 1.0 * star, 0.22 * a * star);
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt';
}
function titleCard(ta, u, ringPts) {
  // 背景粒子弧（本期模拟的一帧，压暗）
  add();
  ringPts.forEach(p => { const an = p.an + u * 0.08; dot(SP.cream, 960 + Math.cos(an) * p.r, 470 + Math.sin(an) * p.r, p.s, p.al * ta); });
  norm_();
  onUI(() => {
    txt('同 步', W / 2, 520, '160px ' + SERIF, rgba(CREAM, 0.96 * ta), 'center', '64px', 18);
    txt('不 约 而 同', W / 2, 622, '34px ' + SERIF, rgba(CREAM, 0.82 * ta), 'center', '14px');
    txt('万物的原理 · 05', 96, 104, '26px ' + SERIF, rgba(GREYB, 0.95 * ta), 'left', '6px');
    drawMag(1770, 937, 37, ta, 0, 1);   // 与模板一致：图标高约占画面 9%，右距 92、下距 85
  });
}
function ringParticles(seed) {
  const r = rng(seed); return Array.from({ length: 300 }, () => { const an = r() * TAU; const gap = Math.sin(an * 3 + 1) > 0.55; return { an, r: 340 + gauss(r) * 10, s: 4 + r() * 6, al: gap ? 0.05 : 0.35 + r() * 0.4 }; });
}

scene('title', () => lt('title', 0), () => secEnd('title'), () => {
  const r = rng(9), IDENT = 4 * BEAT;
  const MP = magPoints(940, 440, 120, 1100, r).map(t => { const an = r() * TAU; return { tx: t[0], ty: t[1], x: 960 + Math.cos(an) * (500 + r() * 900), y: 450 + Math.sin(an) * (400 + r() * 700), d: r() * 0.25, tw: r() * TAU }; });
  const RP = ringParticles(19);
  let first = true, cardHit = false, glinted = false;
  return (u, a, dur) => {
    if (first && u >= -DT * 0.5) { first = false; pump({ flash: 0.2, bloom: 0.5 }); ev('ident', 1); }
    // 片头：粒子聚成放大镜，再散开（约 2 秒）
    if (u < IDENT + 0.2) {
      const ia = a * (1 - ss(IDENT - 0.3, IDENT + 0.1, u));
      const disp = ss(1.35, IDENT - 0.05, u);
      add();
      MP.forEach(p => {
        const k = easeOut(clamp((u - p.d) / 0.95));
        let x = lerp(p.x, p.tx, k), y = lerp(p.y, p.ty, k);
        const dx = p.tx - 960, dy = p.ty - 450, dl = Math.hypot(dx, dy) || 1;
        x += dx / dl * disp * 520; y += dy / dl * disp * 520;
        dot(SP.warm, x, y, 7 + (1 - k) * 6, (0.35 + 0.45 * k) * (0.7 + 0.3 * Math.sin(u * 9 + p.tw)) * ia * (1 - disp * 0.8));
      });
      norm_();
      const ma = ia * ss(0.8, 1.0, u) * (1 - ss(1.4, 1.62, u));
      const sp = ss(0.92, 1.08, u) * (1 + 0.25 * Math.exp(-Math.max(0, u - 1.0) * 6)) * (1 - ss(1.4, 1.62, u));
      if (!glinted && u >= 0.95) { glinted = true; pump({ bloom: 0.2, flash: 0.05 }); }
      drawMag(940, 440, 120, ma, 0, sp);
    }
    // 标题卡
    if (u >= IDENT - 0.15) {
      if (!cardHit && u >= IDENT - DT * 0.5) { cardHit = true; pump({ flash: 0.5, bloom: 0.9, shake: 10, zoomPunch: 1 }); shock(960, 470, 1100, CREAM, 2.5, 1.4); ev('title', 1); }
      titleCard(a * ss(IDENT - 0.15, IDENT + 0.45, u), u, RP);
    }
  };
}, { bloom: 0.7 });
