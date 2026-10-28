// ===== 其余场景（3D + 特效版） =====
function hist(arr, v, n) { arr.push(v); if (arr.length > n) arr.shift(); }
function circ3(cam, cx, cy, cz, r, plane = 'xz', n = 48) {
  const pts = [];
  for (let q = 0; q <= n; q++) { const a = q / n * TAU; pts.push(plane === 'xz' ? cam.p(cx + Math.cos(a) * r, cy, cz + Math.sin(a) * r) : cam.p(cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz)); }
  return pts;
}
const P3 = (cam, x, y, z) => cam.p(x, y, z);
function onUIat(fn) { onUI(fn); }

// ---------- 2+3. 惠更斯的两只钟 / 木梁 ----------
scene('clocks', () => lt('huygens', 0), () => lt('answer', 4), () => {
  let p1 = 0.3, p2 = 1.05; const w1 = TAU / (4 * BEAT), w2 = TAU / (4 * BEAT) * 1.006;
  let s1 = 0, s2 = 0, kicked = false, kickFlash = 0;
  const dh = []; const RIP = []; const T1 = [], T2 = [];
  const r = rng(12);
  const DU = Array.from({ length: 220 }, () => [(r() - 0.5) * 1400, -80 + r() * 640, -500 + r() * 700, r() * TAU]);
  const BY = 440, XS = [-200, 200];
  return (u, a, dur) => {
    const H0 = k => lt('huygens', k) - lt('huygens', 0);
    const A0 = k => lt('answer', k) - lt('huygens', 0);
    const k = u < H0(2) ? 0 : 1.1 * ss(H0(2), H0(2) + 2, u);
    const kickT = ceilB(lt('huygens', 4) + 1.0) - lt('huygens', 0);
    if (!kicked && u >= kickT - DT * 0.5) { kicked = true; p2 += 1.9; kickFlash = 1; ev('kick', 1); pump({ shake: 10, flash: 0.25, bloom: 0.6 }); }
    kickFlash *= 0.94;
    const pc = 0.9 * ss(H0(2) + 1.5, H0(2) + 4, u) * (kicked ? ss(kickT + 1.5, kickT + 4, u) : 1), pm = gph(NOW + DT, 4);
    p1 += (w1 + k * Math.sin(p2 - p1 - Math.PI) + pc * Math.sin(pm - p1)) * DT; p2 += (w2 + k * Math.sin(p1 - p2 - Math.PI) + pc * Math.sin(pm + Math.PI - p2)) * DT;
    const n1 = Math.sin(p1), n2 = Math.sin(p2);
    const beamFocus = ss(A0(1) - 0.5, A0(1) + 1.0, u);
    if (Math.sign(n1) !== Math.sign(s1)) { ev('clock', 1, 0); RIP.push({ x: XS[0], t: 0 }); }
    if (Math.sign(n2) !== Math.sign(s2)) { ev('clock', 1, 1); RIP.push({ x: XS[1], t: 0 }); }
    s1 = n1; s2 = n2;
    const dphi = Math.abs(angd(p1 - p2));
    if (Math.round(u * FPS) % 3 === 0) hist(dh, dphi, 140);
    RIP.forEach(q => q.t += DT); while (RIP.length && RIP[0].t > 2.4) RIP.shift();
    const cam = camKeys([
      [0, [-560, 300, -1550], [0, 200, 0], 0.8],
      [H0(2), [-170, 230, -1400], [0, 190, 0], 0.8],
      [H0(4), [260, 200, -1300], [0, 190, 0], 0.8],
      [H0(6), [0, 240, -1380], [0, 200, 0], 0.8],
      [A0(0) + 0.5, [-120, 300, -1300], [0, 260, 0], 0.8],
      [A0(1) + 0.6, [-780, 480, -300], [260, 425, 0], 0.9],
      [A0(3), [-460, 380, -880], [100, 300, 0], 0.85],
      [dur, [0, 260, -1250], [0, 200, 0], 0.8],
    ], u);
    // 窗光：斜射光柱 + 浮尘
    add();
    const lp = [cam.p(-900, 900, 300), cam.p(-500, 900, 300), cam.p(500, -120, -200), cam.p(-100, -120, -200)];
    if (lp.every(Boolean)) {
      const g = ctx.createLinearGradient(lp[0][0], lp[0][1], lp[2][0], lp[2][1]);
      g.addColorStop(0, rgba(GOLD, 0.10 * a)); g.addColorStop(1, rgba(GOLD, 0));
      ctx.fillStyle = g; ctx.beginPath(); lp.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill();
    }
    DU.forEach(d => { const p = cam.p(d[0] + Math.sin(NOW * 0.2 + d[3]) * 20, d[1] + Math.sin(NOW * 0.4 + d[3]) * 10, d[2]); if (p) dot(SP.gold, p[0], p[1], 3.2 * p[2], 0.25 * fog(p[3], 300, 2500) * a); });
    norm_();
    // 木梁（含波纹位移）
    const bpts = [];
    for (let x = -520; x <= 520; x += 10) {
      let off = 0;
      RIP.forEach(q => { const d = Math.abs(x - q.x) - q.t * 380; off += Math.exp(-d * d / 1200) * Math.exp(-q.t * 1.2) * 4 * beamFocus * Math.sin(q.t * 28); });
      bpts.push(cam.p(x, BY + off, -2));
    }
    gline(bpts, beamFocus > 0.1 ? GOLD : TEAL, (0.45 + 0.45 * beamFocus) * a, 2.2);
    add();
    RIP.forEach(q => [-1, 1].forEach(dir => { const x = q.x + dir * q.t * 380; if (Math.abs(x) < 520) { const p = cam.p(x, BY, -2); if (p) { dot(SP.gold, p[0], p[1], 40 * p[2], (0.25 + 0.75 * beamFocus) * Math.exp(-q.t * 1.2) * a); if (beamFocus > 0.3) dot(SP.white, p[0], p[1], 12 * p[2], beamFocus * Math.exp(-q.t * 1.5) * a); } } }));
    norm_();
    // 两只钟
    [[XS[0], p1, 0, T1], [XS[1], p2, 1, T2]].forEach(([X, p, idx, TR]) => {
      const ca = a;
      const F = (x, y) => cam.p(X + x, y, -1), B = (x, y) => cam.p(X + x, y, 70);
      poly([F(-50, BY), F(-50, 400)], WHITE, 0.3 * ca, 1.2); poly([F(50, BY), F(50, 400)], WHITE, 0.3 * ca, 1.2);
      const fr = [F(-95, 400), F(95, 400), F(95, -60), F(-95, -60)], bk = [B(-95, 400), B(95, 400), B(95, -60), B(-95, -60)];
      if (fr.every(Boolean)) {
        ctx.fillStyle = `rgba(14,22,36,${0.5 * ca})`; ctx.beginPath(); fr.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fill();
        poly(bk, TEAL, 0.12 * ca, 1, true);
        for (let i = 0; i < 4; i++) poly([fr[i], bk[i]], TEAL, 0.15 * ca, 1);
        gline(fr, TEAL, 0.38 * ca, 1.2, true);
      }
      const dial = circ3(cam, X, 310, -2, 62, 'xy');
      poly(dial, WHITE, 0.45 * ca, 1.3);
      for (let h = 0; h < 12; h++) { const an = h / 12 * TAU; poly([cam.p(X + Math.cos(an) * 52, 310 + Math.sin(an) * 52, -2), cam.p(X + Math.cos(an) * 58, 310 + Math.sin(an) * 58, -2)], WHITE, 0.5 * ca, 1.2); }
      const mt = u * 0.9 + idx * 1.7;
      poly([cam.p(X, 310, -3), cam.p(X + Math.sin(mt) * 44, 310 + Math.cos(mt) * 44, -3)], WHITE, 0.75 * ca, 1.5);
      poly([cam.p(X, 310, -3), cam.p(X + Math.sin(mt / 12 + 2) * 30, 310 + Math.cos(mt / 12 + 2) * 30, -3)], WHITE, 0.75 * ca, 2.2);
      const th = 0.3 * Math.sin(p), Lp = 230;
      const piv = cam.p(X, 220, -6), bob = cam.p(X + Math.sin(th) * Lp, 220 - Math.cos(th) * Lp, -6);
      // 摆动弧线轨迹
      const arc = []; for (let q = -12; q <= 12; q++) { const t2 = q / 12 * 0.3; arc.push(cam.p(X + Math.sin(t2) * Lp, 220 - Math.cos(t2) * Lp, -6)); }
      add(); poly(arc, GOLD, 0.12 * ca, 1);
      hist(TR, bob, 9);
      TR.forEach((q, i) => { if (q) dot(SP.white, q[0], q[1], 30 * q[2] / 1.6, 0.06 * (i / TR.length) * ca); });
      norm_();
      poly([piv, bob], WHITE, 0.75 * ca, 1.7);
      add();
      const kf = idx === 1 ? kickFlash : 0;
      if (bob) { dot(SP.white, bob[0], bob[1], (85 + kf * 140) * bob[2] / 1.6, (0.95 + kf) * ca); dot(SP.gold, bob[0], bob[1], 150 * bob[2] / 1.6, 0.15 * ca); }
      if (piv) dot(SP.gold, piv[0], piv[1], 24 * piv[2] / 1.6, 0.6 * ca);
      norm_();
      if (idx === 1 && kf > 0.97 && bob) shock(bob[0], bob[1], 380, GOLD, 2.5, 1.0);
    });
    // 相位差曲线（UI）
    const ga = a * ss(H0(2), H0(2) + 1.5, u) * (1 - ss(A0(0) - 0.5, A0(0) + 0.5, u));
    onUI(() => {
      if (ga > 0.01) {
        const gx = 1480, gy = 600, gw = 300, gh = 120;
        brackets(gx - 16, gy - 34, gw + 32, gh + 64, ga);
        txt('Δφ  相位差', gx, gy - 12, '13px ' + MONO, rgba(GOLD, 0.7 * ga), 'left', '2px');
        line(gx, gy + 6, gx + gw, gy + 6, GOLD, 0.25 * ga);
        txt('180°', gx + gw, gy + 1, '11px ' + MONO, rgba(GOLD, 0.5 * ga), 'right');
        add(); ctx.strokeStyle = rgba(WHITE, 0.85 * ga); ctx.lineWidth = 1.6; ctx.beginPath();
        dh.forEach((v, i) => { const x = gx + i / 140 * gw, y = gy + 6 + (1 - v / Math.PI) * gh; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); norm_();
        txt(`${Math.round(dphi / Math.PI * 180)}°`, gx, gy + gh + 22, '15px ' + MONO, rgba(WHITE, 0.7 * ga), 'left', '2px');
      }
    });
    hudTR(['PENDULUM CLOCKS · HUYGENS', u > H0(1) ? 'THE HAGUE · 1665' : ' ', u > kickT ? 'DISTURBED → +30 MIN' : (u > H0(2) ? 'COUPLED VIA BEAM' : ' ')], a);
    hudTL('1665 · 惠更斯', 'CHRISTIAAN HUYGENS', a * ss(H0(1), H0(1) + 1, u) * (1 - ss(A0(0) - 1, A0(0), u)));
    heading('“两只钟的交感”', 'THE SYMPATHY OF TWO CLOCKS', a * ss(H0(5), H0(5) + 0.8, u) * (1 - ss(H0(6) - 0.2, H0(6) + 0.6, u)));
    const qa = a * ss(H0(6) + 0.8, H0(6) + 1.8, u) * (1 - ss(A0(0), A0(0) + 0.8, u));
    if (qa > 0.01) onUI(() => txt('?', W / 2, 520, '90px ' + SERIF, rgba(WHITE, 0.7 * qa), 'center', '0px', 30));
    heading('谁也不用指挥', 'NOTHING IN CHARGE', a * ss(A0(0), A0(0) + 0.8, u) * (1 - ss(A0(1) + 0.3, A0(1) + 1.1, u)));
    heading('同一根木梁', 'ONE SHARED BEAM', a * ss(A0(1) + 1.0, A0(1) + 1.8, u) * (1 - ss(A0(3) - 0.5, A0(3) + 0.3, u)), 150);
  };
}, { bloom: 0.6 });

// ---------- 节拍器回放 ----------
scene('metro2', () => lt('answer', 4), () => secEnd('answer'), () => {
  const st = Metro3D(33, 'sync'); let beat = 0, init0 = true;
  return (u, a, dur) => {
    if (init0) { init0 = false; st.M.forEach(m => { m.ph = gph(NOW, 2) + (m.ph - gph(B0, 2)) * 0.3; m.s = Math.sin(m.ph) || 1e-6; }); }
    const tk = st.step(3, DT, 1.5);
    if (tk.length >= 10) { st.ring(0, 20, 1000, 1.2); beat = 1; pump({ bloom: 0.3, shake: 2 }); ev('tick', tk.length, 1); }
    beat *= 0.88;
    const cam = camKeys([[0, [560, 320, -920], [0, 20, 40], 0.9], [dur, [-320, 210, -760], [0, 30, 40], 0.85]], u);
    st.draw(cam, a, beat);
    hudTL('木板 = 木梁', 'THE BOARD IS THE BEAM', a);
    hudTR(['METRONOME ARRAY', 'N = 32 · SYNCED'], a);
  };
}, { bloom: 0.6 });

// ---------- 4. 音乐会掌声：从杂乱到整齐（Néda et al., Nature 2000） ----------
scene('applause', () => lt('applause', 0), () => secEnd('applause'), () => {
  const r = rng(77), P = [];
  for (let row = 0; row < 15; row++) {
    const R = 700 + row * 78, n = Math.floor(R * 1.75 / 58);
    for (let i = 0; i < n; i++) {
      const an = -0.88 + 1.76 * (i + 0.5 + (row % 2) * 0.5) / n;
      P.push({ x: Math.sin(an) * R + gauss(r) * 6, y: 40 + row * 26, z: Math.cos(an) * R - 300, th: r() * TAU,
        wf: TAU * 3.3 * (1 + gauss(r) * 0.12), ws: TAU / BEAT * (1 + gauss(r) * 0.035), f: 0, hue: r() });
    }
  }
  const N = P.length; let cam0 = null;
  const BEAMS = [[-520, 0.9, GOLD], [-170, 1.7, TEAL], [200, 2.6, GOLD], [540, 3.4, TEAL]];
  const DU = Array.from({ length: 260 }, () => [(r() - 0.5) * 2200, r() * 700, 200 + r() * 1400, r() * TAU]);
  return (u, a, dur) => {
    const L = k => lt('applause', k) - lt('applause', 0);
    const s = ss(L(1) - 0.4, L(1) + 1.6, u);                 // 从快而乱 → 慢而齐（拍频减半）
    let cx = 0, sy = 0; P.forEach(p => { cx += Math.cos(p.th); sy += Math.sin(p.th); });
    const R = Math.hypot(cx, sy) / N, psi = Math.atan2(sy, cx), pm = gph(NOW + DT, 1);
    let claps = 0, wsum = 0;
    P.forEach(p => {
      const w = lerp(p.wf, p.ws, s); wsum += w;
      const prev = Math.floor(p.th / TAU);
      p.th += (w + 3.2 * s * R * Math.sin(psi - p.th) + 1.4 * s * Math.sin(pm - p.th)) * DT;
      if (Math.floor(p.th / TAU) !== prev) { p.f = 1; claps++; }
      p.f *= 0.8;
    });
    if (claps) { ev('clap', claps, R); if (claps > N * 0.45) { pump({ bloom: 0.45, shake: 3 }); const c0 = cam0 && cam0.p(0, 200, 900); if (c0) shock(c0[0], c0[1], 900, GOLD, 2, 0.9); } }
    const cam = camKeys([[0, [-150, 250, -560], [0, 200, 800], 0.95], [dur, [150, 220, -420], [0, 210, 800], 0.95]], u); cam0 = cam;
    // 舞台光束
    add();
    BEAMS.forEach(([x, ph, c]) => {
      const sw = Math.sin(NOW * 0.35 + ph) * 260, top = cam.p(x * 0.6, 900, 300), b1 = cam.p(x + sw - 160, 0, 1300), b2 = cam.p(x + sw + 160, 0, 1300);
      if (!top || !b1 || !b2) return;
      const g = ctx.createLinearGradient(top[0], top[1], (b1[0] + b2[0]) / 2, b1[1]);
      g.addColorStop(0, rgba(c, 0.16 * a)); g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(b1[0], b1[1]); ctx.lineTo(b2[0], b2[1]); ctx.closePath(); ctx.fill();
    });
    DU.forEach(d => { const p = cam.p(d[0] + Math.sin(NOW * 0.2 + d[3]) * 20, d[1], d[2]); if (p) dot(SP.soft, p[0], p[1], 5 * p[2], 0.10 * a); });
    // 观众（远 → 近）
    const pts = P.map(p => [cam.p(p.x, p.y, p.z), p]).filter(q => q[0]).sort((m, n) => n[0][3] - m[0][3]);
    for (const [q, p] of pts) {
      const fo = fog(q[3], 300, 2600) * a, sz = q[2];
      const bq = cam.p(p.x, p.y - 22, p.z); if (bq) dot(SP.softTeal, bq[0], bq[1], 70 * sz, 0.10 * fo);
      dot(SP.teal, q[0], q[1], 20 * sz, (0.32 + 0.12 * p.hue) * fo);                       // 头
      if (p.f > 0.04) {
        const hp = cam.p(p.x, p.y - 14, p.z - 6);
        if (hp) { dot(SP.gold, hp[0], hp[1], (30 + 44 * p.f) * sz, p.f * fo); if (p.f > 0.6) dot(SP.white, hp[0], hp[1], 13 * sz, p.f * fo); }
      }
    }
    // 舞台边缘
    norm_();
    gline([cam.p(-1400, 0, -120), cam.p(1400, 0, -120)], GOLD, 0.35 * a, 1.4);
    const rate = wsum / N / TAU;
    hudTR(['CONCERT APPLAUSE', `N = ${N}`, `SYNC r = ${fmt(R)}`, `CLAP RATE ≈ ${rate.toFixed(1)} Hz`], a);
    hudTL('音乐会散场', 'NÉDA ET AL. · NATURE 2000', a);
    heading('听见掌声，往前赶一点', 'NUDGE A LITTLE EARLIER', a * ss(L(1) + 1.2, L(1) + 2.0, u));
  };
}, { bloom: 0.7 });

// ---------- 5. 仓本模型（3D 倾斜圆环 + 彗尾） ----------
scene('kuramoto', () => lt('kuramoto', 0), () => secEnd('kuramoto'), () => {
  const r = rng(101), N = 260, sig = 0.55, KC = sig * Math.sqrt(8 / Math.PI);
  const O = Array.from({ length: N }, () => ({ th: r() * TAU, w: TAU / (8 * BEAT) + gauss(r) * sig, f: 0, tr: [] }));
  let Rs = 0, lastClusterTop = 0;
  const RR = 300, tilt = 1.05;
  const ringP = (cam, th, rad = RR) => cam.p(rad * Math.sin(th), rad * Math.cos(th) * Math.cos(tilt), -rad * Math.cos(th) * Math.sin(tilt) * 0.0 + rad * Math.cos(th) * Math.sin(tilt));
  return (u, a, dur) => {
    const L = k => lt('kuramoto', k) - lt('kuramoto', 0);
    const K = u < L(2) ? 0 : (u < L(3) ? 0.55 * ss(L(2), L(2) + 1.2, u) : lerp(0.55, 2.6, ss(L(3), L(4) + 1.5, u)));
    let cx = 0, sy = 0; O.forEach(o => { cx += Math.cos(o.th); sy += Math.sin(o.th); });
    const R = Math.hypot(cx, sy) / N, psi = Math.atan2(sy, cx); Rs = lerp(Rs, R, 0.15);
    let tops = 0;
    const kp = u < L(4) ? 0 : 0.6 * ss(L(4), L(4) + 2.5, u), kpm = gph(NOW + DT, 8);
    O.forEach(o => { const prev = wrap(o.th); o.th += (o.w + K * R * Math.sin(psi - o.th) + kp * Math.sin(kpm - o.th)) * DT; const now = wrap(o.th); if (now < prev && prev - now > Math.PI) { o.f = 1; tops++; } o.f *= 0.86; hist(o.tr, o.th, 9); });
    if (tops) { ev('top', tops / N, R); if (tops > N * 0.25 && u - lastClusterTop > 1) { lastClusterTop = u; pump({ bloom: 0.5, shake: 3 }); } }
    const ang = 0.25 * Math.sin(u * 0.12) - 0.2;
    const cam = Cam([Math.sin(ang) * 1800 + 360, 120 + 60 * Math.sin(u * 0.2), -Math.cos(ang) * 1800], [360, 0, 0], 0.85);
    // 轨道
    const orb = []; for (let q = 0; q <= 96; q++) orb.push(ringP(cam, q / 96 * TAU));
    gline(orb, TEAL, 0.3 * a, 1.2);
    const orb2 = []; for (let q = 0; q <= 96; q++) orb2.push(ringP(cam, q / 96 * TAU, RR * 1.08)); add(); poly(orb2, TEAL, 0.07 * a, 1); norm_();
    add();
    const top = ringP(cam, 0); if (top) dot(SP.gold, top[0], top[1], 90 * top[2], 0.2 * a);
    O.forEach(o => {
      o.tr.forEach((th, i) => { const p = ringP(cam, th); if (p) dot(SP.teal, p[0], p[1], 10 * p[2], 0.12 * (i / o.tr.length) * a); });
      const p = ringP(cam, o.th); if (!p) return;
      dot(SP.white, p[0], p[1], (16 + o.f * 20) * p[2], (0.6 + o.f * 0.4) * a);
      if (o.f > 0.05) dot(SP.gold, p[0], p[1], 60 * p[2], o.f * 0.6 * a);
    });
    // 序参量
    const c0 = cam.p(0, 0, 0), ap = cam.p(RR * Rs * Math.sin(psi), RR * Rs * Math.cos(psi) * Math.cos(tilt), RR * Rs * Math.cos(psi) * Math.sin(tilt));
    if (c0 && ap) { norm_(); gline([c0, ap], GOLD, 0.9 * a, 2); add(); dot(SP.gold, ap[0], ap[1], 44, 0.9 * a); onUI(() => txt('r', ap[0] + 16, ap[1] - 12, 'italic 22px "Liberation Serif"', rgba(GOLD, 0.9 * a), 'left')); }
    norm_();
    // 右侧面板（UI）
    onUI(() => {
      const pa = a * ss(0.3, 1.5, u), px = 1180, py = 260, pw = 540, ph = 400;
      brackets(px - 30, py - 76, pw + 60, ph + 136, pa);
      txt('dθᵢ/dt = ωᵢ + (K/N) Σ sin(θⱼ − θᵢ)', px + pw / 2, py - 26, 'italic 30px "Liberation Serif"', rgba(WHITE, 0.9 * pa), 'center', '1px', 8);
      const ca = a * ss(L(1), L(1) + 1.2, u);
      if (ca > 0.01) {
        const gx = px + 30, gy = py + 40, gw = pw - 60, gh = ph - 100, Kmax = 3;
        line(gx, gy + gh, gx + gw, gy + gh, WHITE, 0.45 * ca); line(gx, gy, gx, gy + gh, WHITE, 0.45 * ca);
        txt('联系强度  K', gx + gw, gy + gh + 30, '15px ' + SERIF, rgba(WHITE, 0.65 * ca), 'right', '2px');
        txt('同步程度  r', gx + 8, gy - 12, '15px ' + SERIF, rgba(WHITE, 0.65 * ca), 'left', '2px');
        const kx = gx + KC / Kmax * gw;
        ctx.setLineDash([4, 6]); line(kx, gy, kx, gy + gh, GOLD, 0.7 * ca); ctx.setLineDash([]);
        txt('临界值 Kc', kx, gy + gh + 30, '15px ' + SERIF, rgba(GOLD, 0.9 * ca), 'center', '2px');
        const cv = []; for (let i = 0; i <= 120; i++) { const KK = i / 120 * Kmax, rv = KK <= KC ? 0 : Math.sqrt(1 - (KC / KK) ** 2); cv.push([gx + KK / Kmax * gw, gy + gh - rv * gh]); }
        gline(cv, TEAL, 0.8 * ca, 1.8);
        add(); dot(SP.gold, gx + K / Kmax * gw, gy + gh - Rs * gh, 46, 0.95 * ca); norm_();
        txt(K < KC ? '一片杂乱' : '同步出现', gx + K / Kmax * gw + 20, gy + gh - Rs * gh - 18, '15px ' + SERIF, rgba(GOLD, 0.8 * ca * ss(L(2), L(2) + 1, u)), 'left', '2px');
      }
    });
    hudTR(['KURAMOTO MODEL · 1975', `N = ${N}`, `K = ${fmt(K)}   r = ${fmt(Rs)}`], a);
    hudTL('仓本模型', 'YOSHIKI KURAMOTO', a);
    heading('一道门槛', 'A THRESHOLD', a * ss(L(1), L(1) + 0.8, u) * (1 - ss(L(2) + 0.5, L(2) + 1.3, u)), 120);
  };
}, { bloom: 0.7 });

// ---------- 大脑工具 ----------
const BRAIN_K = [[-300, 60], [-322, -22], [-292, -112], [-222, -182], [-112, -222], [18, -230], [140, -206], [240, -150], [305, -70], [322, 18], [292, 84], [236, 108], [254, 148], [206, 190], [124, 188], [82, 152], [30, 134], [-40, 118], [-120, 134], [-190, 124], [-232, 94], [-262, 100]];
function catmull(P, n = 10) {
  const out = [], L = P.length;
  for (let i = 0; i < L; i++) {
    const p0 = P[(i - 1 + L) % L], p1 = P[i], p2 = P[(i + 1) % L], p3 = P[(i + 2) % L];
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; out.push([0, 1].map(j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); }
  }
  return out;
}
const BRAIN_C = catmull(BRAIN_K);
function inPoly(x, y, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { if (((P[i][1] > y) !== (P[j][1] > y)) && (x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0])) c = !c; } return c; }
const BRAIN_DET = [[[40, 136], [52, 190], [66, 250]], [[0, 128], [8, 190], [18, 250]], [[-215, 80], [-140, 52], [-60, 40], [30, 20], [90, 0]], [[-10, -228], [-30, -160], [-20, -90], [-45, -30]], [[100, 160], [160, 150], [220, 160]], [[110, 175], [170, 168], [215, 178]]];
// 大脑：轮廓在 z=0 平面（y 向下取反），神经元为体积点
function drawBrain(cam, c, a, w = 1.5) {
  const pts = BRAIN_C.map(p => cam.p(p[0], -p[1], 0)); pts.push(pts[0]);
  gline(pts, c, a, w);
  BRAIN_DET.forEach(seg => { add(); poly(seg.map(p => cam.p(p[0], -p[1], 0)), c, 0.35 * a, 1.1); norm_(); });
}
function brainCloud(r, n) { const out = []; while (out.length < n) { const x = (r() - 0.5) * 660, y = (r() - 0.5) * 460; if (inPoly(x, y, BRAIN_C)) { const d = 1 - Math.min(1, Math.abs(y) / 260); out.push({ x, y: -y, z: (r() - 0.5) * 300 * (0.4 + d) }); } } return out; }

// ---------- 6. 视交叉上核（穿越进大脑） ----------
scene('scn', () => lt('scn', 0), () => secEnd('scn'), () => {
  const r = rng(202);
  const BD = brainCloud(r, 700);
  const SX = -40, SY = -112;  // 大脑坐标（y 已取反）
  const NN = 760, Nr = [];
  for (let i = 0; i < NN; i++) {
    const lobe = i % 2 ? 1 : -1; let x, y, z; do { x = r() * 2 - 1; y = r() * 2 - 1; z = r() * 2 - 1; } while (x * x + y * y + z * z > 1);
    Nr.push({ x: lobe * 175 + x * 150, y: y * 135, z: z * 150, ph: r() * TAU, w: TAU / (4 * BEAT) * (1 + gauss(r) * 0.16), amp: 1, die: r() < 0.25, drift: gauss(r), b: 0 });
  }
  const ED = []; for (let i = 0; i < 900; i++) { const a = Math.floor(r() * NN), b = Math.floor(r() * NN); if (a !== b && Math.hypot(Nr[a].x - Nr[b].x, Nr[a].y - Nr[b].y, Nr[a].z - Nr[b].z) < 75) ED.push([a, b]); }
  const WARP = Array.from({ length: 260 }, () => ({ an: r() * TAU, d: r(), sp: 0.6 + r() }));
  const hl = [3, 121, 444];
  let R = 0, psi = 0, arrived = false;
  return (u, a, dur) => {
    const L = k => lt('scn', k) - lt('scn', 0);
    const z1 = L(2), z0 = Math.max(L(1) + 1.2, z1 - 4 * BEAT);
    const zoom = ss(z0, z1, u);
    // 阶段 A：大脑（推镜）
    if (zoom < 1) {
      const ba = a * (1 - ss(z1 - 0.4, z1, u));
      const rot = 0.35 * Math.sin(u * 0.2);
      const dist = lerp(1500, 160, easeIO(zoom));
      const tgt = [lerp(0, SX, easeIO(zoom)), lerp(10, SY, easeIO(zoom)), 0];
      const cam = Cam([tgt[0] + Math.sin(rot) * dist, tgt[1] + 60 * (1 - zoom), -Math.cos(rot) * dist], tgt, 0.85);
      drawBrain(cam, TEAL, 0.55 * ba);
      add();
      BD.forEach(p => { const q = cam.p(p.x, p.y, p.z); if (q) dot(SP.teal, q[0], q[1], 7 * q[2] * 1.6, (0.15 + 0.12 * Math.sin(NOW * 2 + p.x)) * ba * fog(q[3], 100, 2500)); });
      const sp = cam.p(SX, SY, 0), pulse = 0.5 + 0.5 * Math.sin(u * 3);
      if (sp) { dot(SP.gold, sp[0], sp[1], (90 + pulse * 40) * Math.min(4, sp[2] * 1.4), (0.5 + 0.4 * pulse) * ba * ss(L(1) - 0.5, L(1) + 0.6, u)); }
      norm_();
      const la = ba * ss(L(1), L(1) + 0.8, u) * (1 - zoom * 2);
      if (sp && la > 0.01) onUI(() => { line(sp[0] + 20, sp[1] + 10, sp[0] + 170, sp[1] + 150, GOLD, 0.7 * la); txt('视交叉上核', sp[0] + 180, sp[1] + 158, '24px ' + SERIF, rgba(GOLD, 0.95 * la), 'left', '3px'); txt('SUPRACHIASMATIC NUCLEUS', sp[0] + 180, sp[1] + 184, '11px ' + MONO, rgba(GOLD, 0.5 * la), 'left', '3px'); });
      // 穿越光流
      const wa = Math.sin(Math.PI * zoom) * a;
      if (wa > 0.02) { add(); WARP.forEach(w => { const d0 = ((w.d + u * w.sp * 1.4) % 1), r0 = d0 * d0 * 1100, r1 = r0 + 40 + d0 * 220; line(W / 2 + Math.cos(w.an) * r0, H / 2 + Math.sin(w.an) * r0, W / 2 + Math.cos(w.an) * r1, H / 2 + Math.sin(w.an) * r1, d0 > 0.5 ? GOLD : TEAL, 0.5 * wa * d0, 1.5); }); norm_(); }
    }
    if (!arrived && u >= z1 - DT * 0.5) { arrived = true; pump({ flash: 0.4, bloom: 0.8, shake: 6 }); shock(W / 2, H / 2, 900, TEAL, 3, 1.2); ev('hit', 0.6); }
    // 阶段 B：神经元团
    const na = a * ss(z1 - 0.4, z1 + 0.3, u);
    if (na > 0.01) {
      const K = u < L(4) ? 0 : 2.4 * ss(L(4), L(4) + 2.2, u);
      const decay = u > L(3) && u < L(4) + 0.5;
      let cx = 0, sy = 0; Nr.forEach(n => { cx += Math.cos(n.ph) * n.amp; sy += Math.sin(n.ph) * n.amp; });
      R = Math.hypot(cx, sy) / NN; psi = Math.atan2(sy, cx);
      let fires = 0;
      Nr.forEach(n => {
        const noise = (u > L(3) && K < 0.3) ? n.drift * 0.6 : 0, prev = Math.cos(n.ph);
        n.ph += (n.w + noise + K * R * Math.sin(psi - n.ph) + (K > 0.3 ? 0.7 * Math.sin(gph(NOW + DT, 4) - n.ph) : 0)) * DT;
        if (n.die && decay) n.amp = Math.max(0.05, n.amp - DT * 0.5);
        if (K > 0.2) n.amp = Math.min(1, n.amp + DT * 0.6 * K / 2.4);
        if (prev < 0.995 && Math.cos(n.ph) >= 0.995) fires++;
        n.b = Math.pow(0.5 + 0.5 * Math.cos(n.ph), 3) * n.amp;
      });
      if (fires) { ev('neuron', fires / NN, R); if (fires > NN * 0.3) pump({ bloom: 0.4 }); }
      const rot = 0.45 * Math.sin(u * 0.12);
      const cam = Cam([Math.sin(rot) * 1250, 160, -Math.cos(rot) * 1250], [0, 0, 0], 0.85);
      const PP = Nr.map(n => cam.p(n.x, n.y, n.z));
      add();
      ED.forEach(([i, j]) => { const bb = Math.min(Nr[i].b, Nr[j].b); if (bb > 0.15 && PP[i] && PP[j]) line(PP[i][0], PP[i][1], PP[j][0], PP[j][1], TEAL, 0.45 * bb * na, 1); });
      Nr.forEach((n, i) => { const p = PP[i]; if (!p) return; const fo = fog(p[3], 600, 1800); dot(SP.teal, p[0], p[1], (10 + n.b * 18) * p[2] * 0.7, (0.08 + 0.15 * n.amp + 0.75 * n.b) * na * fo); });
      norm_();
      const ha = na * ss(L(2) + 0.5, L(2) + 1.3, u) * (1 - ss(L(4), L(4) + 1, u));
      if (ha > 0.01) onUI(() => hl.forEach(i => { const p = PP[i]; if (!p) return; ctx.strokeStyle = rgba(GOLD, 0.8 * ha); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(p[0], p[1], 24, 0, TAU); ctx.stroke(); line(p[0], p[1], p[0] + Math.sin(Nr[i].ph) * 18, p[1] - Math.cos(Nr[i].ph) * 18, GOLD, 0.95 * ha, 1.8); }));
      const ringA = na * ss(L(4) + 1.2, L(4) + 3, u);
      if (ringA > 0.01) onUI(() => {
        const cx0 = W / 2, cy0 = 470, rr = 340;
        ctx.strokeStyle = rgba(GOLD, 0.35 * ringA); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx0, cy0, rr, 0, TAU); ctx.stroke();
        ['0', '6', '12', '18'].forEach((s, i) => { const an = i / 4 * TAU - Math.PI / 2; txt(s, cx0 + Math.cos(an) * (rr + 28), cy0 + 6 + Math.sin(an) * (rr + 28), '14px ' + MONO, rgba(GOLD, 0.55 * ringA), 'center'); });
        const an = psi - Math.PI / 2; add();
        for (let k = 0; k < 14; k++) { const a2 = an - k * 0.03; dot(SP.gold, cx0 + Math.cos(a2) * rr, cy0 + Math.sin(a2) * rr, 26, 0.8 * ringA * (1 - k / 14)); }
        norm_();
        txt('≈ 24 h', cx0 + 270, cy0 - 270, '18px ' + MONO, rgba(GOLD, 0.7 * ringA), 'left', '3px');
      });
    }
    hudTR(['SUPRACHIASMATIC NUCLEUS', '≈ 20,000 NEURONS', zoom > 0.9 ? `COHERENCE r = ${fmt(R)}` : ' '], a);
    hudTL('你身体里的钟', 'THE CLOCK INSIDE YOU', a);
    heading('走不准的小钟', 'SLOPPY LITTLE CLOCKS', a * ss(L(2) + 0.3, L(2) + 1.1, u) * (1 - ss(L(3) + 1.5, L(3) + 2.3, u)), 120);
  };
}, { bloom: 0.7 });

// ---------- 7. 千禧桥（3D 纵深） ----------
scene('bridge', () => lt('bridge', 0), () => secEnd('bridge'), () => {
  const r = rng(303), Z0 = 0, Z1 = 2600;
  const P = []; let Yb = 0, psiB = null, spawnAcc = 0, Psm = 0, closedHit = false;
  const Om = TAU * 0.95;
  const CITY = Array.from({ length: 380 }, () => ({ x: (r() - 0.5) * 7000, y: 20 + Math.pow(r(), 2) * 420, z: 3200 + r() * 2500, c: r() < 0.6 ? 'gold' : (r() < 0.5 ? 'white' : 'teal'), s: 0.6 + r() }));
  function spawn() { const dir = r() < 0.5 ? 1 : -1; P.push({ z: dir > 0 ? Z0 : Z1, dir, v: 70 + r() * 30, lane: gauss(r) * 14, ph: r() * TAU, w: TAU * 0.95 * (1 + gauss(r) * 0.07), s: 0, f: 0 }); }
  for (let i = 0; i < 120; i++) { spawn(); P[i].z = r() * Z1; }
  return (u, a, dur) => {
    const L = k => lt('bridge', k) - lt('bridge', 0);
    const tScale = u < L(5) ? 1 - ss(L(4) + 0.2, ceilB(lt('bridge', 4) + 0.8) - lt('bridge', 0), u) : ss(L(5), L(5) + 0.8, u);
    const damp = ss(L(5) + 0.4, L(5) + 2.6, u);          // 阻尼器生效：晃动被吸走，脚步不再被带齐
    const dt = DT * tScale;
    const c = (u < L(1) ? 0.05 : (u < L(2) ? lerp(0.05, 0.7, ss(L(1), L(2), u)) : lerp(0.7, 3.2, ss(L(2), L(2) + 3.5, u)))) * (1 - 0.97 * damp);
    if (u < L(4) + 0.4 || u > L(5) + 0.4) { spawnAcc += dt * (P.length < 300 ? 30 : 8); while (spawnAcc > 1) { spawnAcc--; if (P.length < 320) spawn(); } }
    if (psiB === null) psiB = gph(NOW, 2); else psiB += Om * dt;
    let pc = 0; P.forEach(p => pc += Math.cos(p.ph - psiB)); Psm = lerp(Psm, P.length ? pc / P.length : 0, 0.05);
    Yb = lerp(Yb, Math.max(3, 75 * Psm * Math.min(1, P.length / 260) * (1 - 0.95 * damp)), (0.04 + 0.06 * damp) * tScale);
    if (damp > 0) P.forEach(p => { p.ph += 0.6 * damp * gauss(r) * DT * 6; });   // 步调重新散开
    let steps = 0;
    P.forEach(p => { p.z += p.dir * p.v * dt; p.ph += (p.w + c * Math.sin(psiB - p.ph)) * dt; const s = Math.sin(p.ph); if (Math.sign(s) !== Math.sign(p.s) && tScale > 0.5) { p.f = 1; steps++; } p.s = s; p.f *= 0.8; });
    for (let i = P.length - 1; i >= 0; i--) if (P[i].z < Z0 - 5 || P[i].z > Z1 + 5) P.splice(i, 1);
    if (steps) ev('step', steps / 300, Psm);
    if (tScale > 0.5) pump({ shake: Math.min(5, Yb / 16) });
    const closeT = ceilB(lt('bridge', 4) + 0.8) - lt('bridge', 0);
    if (!closedHit && u >= closeT - DT * 0.5) { closedHit = true; pump({ flash: 0.35, shake: 14, glitch: 0.6, zoomPunch: 1 }); ev('lock', 0.6); }
    const sway = z => Yb * 0.55 * Math.sin(Math.PI * (z - Z0) / (Z1 - Z0)) * Math.sin(psiB);
    const cam = camKeys([[0, [-260, 260, -620], [0, 0, 1300], 0.85], [L(2), [-180, 200, -520], [10, 0, 1300], 0.85], [L(3), [-120, 230, -560], [0, 0, 1300], 0.85], [L(4) + 1, [-140, 170, -460], [20, 0, 1200], 0.85], [L(5) + 0.5, [-300, 120, -380], [40, -20, 1000], 0.85], [L(6), [-420, 210, -640], [0, 0, 1200], 0.85], [dur, [-360, 320, -720], [0, 0, 1300], 0.85]], u);
    // 城市灯光与倒影
    add();
    CITY.forEach(q => { const p = cam.p(q.x, q.y, q.z); if (!p) return; dot(SP[q.c], p[0], p[1], 14 * q.s, 0.5 * a); const rp = cam.p(q.x, -q.y - 160, q.z); if (rp) { ctx.globalAlpha = 0.05 * a; ctx.fillStyle = rgba(q.c === 'gold' ? GOLD : TEAL, 1); ctx.fillRect(rp[0] - 1.5, rp[1] - 18, 3, 36 + Math.sin(NOW * 3 + q.x) * 10); ctx.globalAlpha = 1; } });
    norm_();
    // 水面
    const wl = cam.p(0, -160, 6000); if (wl) { const g = ctx.createLinearGradient(0, wl[1], 0, H); g.addColorStop(0, `rgba(12,24,40,${0.35 * a})`); g.addColorStop(1, `rgba(3,6,10,${0.5 * a})`); ctx.fillStyle = g; ctx.fillRect(0, wl[1], W, H - wl[1]); }
    // 桥体
    const edge = (xo, yo) => { const pts = []; for (let z = Z0; z <= Z1; z += 40) pts.push(cam.p(xo + sway(z), yo, z)); return pts; };
    const deckA = edge(-50, 0), deckB = edge(50, 0);
    if (deckA[0] && deckB[0]) {
      ctx.fillStyle = `rgba(18,30,48,${0.5 * a})`; ctx.beginPath(); deckA.forEach((p, i) => p && (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); for (let i = deckB.length - 1; i >= 0; i--) deckB[i] && ctx.lineTo(deckB[i][0], deckB[i][1]); ctx.closePath(); ctx.fill();
    }
    gline(deckA, WHITE, 0.55 * a, 1.4); gline(deckB, WHITE, 0.55 * a, 1.4);
    const cabA = [], cabB = []; for (let z = Z0; z <= Z1; z += 40) { const sag = -26 + 18 * Math.cos(TAU * (z % 650) / 650); cabA.push(cam.p(-82 + sway(z), sag, z)); cabB.push(cam.p(82 + sway(z), sag, z)); }
    add(); poly(cabA, TEAL, 0.35 * a, 1.2); poly(cabB, TEAL, 0.35 * a, 1.2);
    if (damp > 0.01) for (let z = Z0 + 100; z <= Z1 - 100; z += 120) {        // 阻尼器
      const k = ss(L(5) + 0.4 + (z / Z1) * 1.4, L(5) + 0.9 + (z / Z1) * 1.4, u), pulse = 0.4 + 0.6 * Math.abs(Math.sin(psiB + z * 0.002));
      [-58, 58].forEach(xo => { const t1 = cam.p(xo + sway(z), -4, z), b1 = cam.p(xo * 0.8 + sway(z), -46, z); if (t1 && b1) { poly([t1, b1], GOLD, 0.7 * k * a, 2); dot(SP.gold, b1[0], b1[1], 22 * b1[2] * 1.4, 0.55 * k * pulse * a); } });
    }
    for (let z = Z0; z <= Z1; z += 130) { poly([cam.p(-82 + sway(z), -20, z), cam.p(-50 + sway(z), 0, z), cam.p(50 + sway(z), 0, z), cam.p(82 + sway(z), -20, z)], TEAL, 0.2 * a, 1); }
    // 行人
    P.forEach(p => {
      const q = cam.p(p.lane + sway(p.z) + 6 * Math.sin(p.ph), 9, p.z); if (!q) return;
      const fo = fog(q[3], 200, 3000);
      dot(SP.white, q[0], q[1], Math.min(34, 13 * q[2] * 1.4), 0.75 * fo * a);
      if (p.f > 0.05) dot(SP.gold, q[0], q[1], Math.min(80, 34 * q[2] * 1.4), p.f * 0.7 * fo * a);
    });
    norm_();
    const mm = Math.min(70, Yb), ga = a * ss(L(1), L(1) + 1, u);
    onUI(() => {
      if (ga > 0.01) {
        const gx = 760, gy = 820, gw = 400;
        txt('横向晃动  LATERAL SWAY', gx, gy - 14, '14px ' + MONO, rgba(GOLD, 0.7 * ga), 'left', '2px');
        line(gx, gy, gx + gw, gy, GOLD, 0.2 * ga, 4); add(); line(gx, gy, gx + gw * mm / 70, gy, mm > 50 ? AMBER : GOLD, 0.9 * ga, 4); norm_();
        txt(`${Math.round(mm)} mm`, gx + gw + 18, gy + 6, '18px ' + MONO, rgba(WHITE, 0.85 * ga), 'left', '2px');
      }
      const ca = a * ss(L(4) + 0.8, L(4) + 1.4, u) * (1 - ss(L(5) - 0.2, L(5) + 0.4, u));
      const ra = a * ss(L(6) + 0.2, L(6) + 0.9, u);
      if (ra > 0.01) { txt('REOPENED', W / 2, 230, 'bold 64px ' + MONO, rgba(TEAL, 0.95 * ra), 'center', '24px', 24); txt('2002.02.22 · 加装 89 个阻尼器后重新开放', W / 2, 276, '18px ' + SERIF, rgba(TEAL, 0.8 * ra), 'center', '4px'); }
      if (ca > 0.01) { txt('CLOSED', W / 2, 230, 'bold 64px ' + MONO, rgba([255, 140, 100], 0.95 * ca), 'center', '24px', 24); txt('2000.06.12 · 开放两天后关闭', W / 2, 276, '18px ' + SERIF, rgba([255, 170, 130], 0.8 * ca), 'center', '4px'); }
    });
    hudTR(['MILLENNIUM BRIDGE · LONDON', u > L(5) ? '37 VISCOUS + 52 TUNED MASS' : '2000.06.10 · OPENING DAY', u > L(5) ? '= 89 DAMPERS' : '≈ 90,000 CROSSINGS', `ON DECK = ${P.length}`], a);
    hudTL('千禧桥', 'MILLENNIUM BRIDGE', a);
    heading('越晃越齐 · 越齐越晃', 'A FEEDBACK LOOP', a * ss(L(2) + 0.6, L(2) + 1.4, u) * (1 - ss(L(3) - 0.3, L(3) + 0.4, u)), 150);
    heading('同步横向激励', 'SYNCHRONOUS LATERAL EXCITATION', a * ss(L(3) + 0.5, L(3) + 1.3, u) * (1 - ss(L(4) - 0.3, L(4) + 0.4, u)), 150);
    heading('压到门槛以下', 'DAMPED BELOW THE THRESHOLD', a * ss(L(5) + 1.0, L(5) + 1.8, u) * (1 - ss(L(6) - 0.3, L(6) + 0.4, u)), 150);
  };
}, { bloom: 0.65 });

// ---------- 8. 电网（电线 → 升镜 → 城市电网） ----------
scene('grid', () => lt('grid', 0), () => secEnd('grid'), () => {
  const r = rng(404);
  const Nn = []; let tries = 0;
  while (Nn.length < 60 && tries++ < 8000) { const x = (r() - 0.5) * 2600, z = 200 + r() * 2200; if (Nn.every(n => Math.hypot(n.x - x, n.z - z) > 230)) Nn.push({ x, z, th: r() * 0.1, j: r() * 0.15 }); }
  const E = [];
  Nn.forEach((n, i) => { const d = Nn.map((m, j) => [Math.hypot(m.x - n.x, m.z - n.z), j]).sort((p, q) => p[0] - q[0]); for (let k = 1; k <= 3; k++) { const j = d[k][1]; if (!E.some(e => (e[0] === i && e[1] === j) || (e[0] === j && e[1] === i))) E.push([i, j]); } });
  Nn.forEach(n => n.nb = []); E.forEach(([i, j]) => { Nn[i].nb.push(j); Nn[j].nb.push(i); });
  const cen = Nn.map((n, i) => [Math.abs(n.x) + Math.abs(n.z - 1000), i]).sort((p, q) => p[0] - q[0]);
  const A = Nn.findIndex(n => n.x < -300 && Math.abs(n.z - 900) < 400), B = Nn.findIndex(n => n.x > 300 && Math.abs(n.z - 900) < 400);
  const LIGHTS = []; Nn.forEach(n => { for (let k = 0; k < 40; k++) LIGHTS.push([n.x + gauss(r) * 110, n.z + gauss(r) * 110, r() < 0.7 ? 'gold' : 'white', r()]); });
  const flows = E.map(() => r());
  const PY = []; for (let z = -400; z <= 3600; z += 450) PY.push(z);
  let kicked = false, init0 = true;
  return (u, a, dur) => {
    const L = k => lt('grid', k) - lt('grid', 0);
    if (init0) { init0 = false; Nn.forEach(n => n.th = gph(NOW, 4) + n.j); }
    const cam = camKeys([[0, [-760, 200, -300], [0, 330, 1300], 0.9], [L(1) - 0.2, [-640, 230, -100], [0, 330, 1400], 0.9], [L(2) + 0.5, [0, 1500, -1100], [0, 0, 1000], 0.9], [dur, [300, 1300, -900], [0, 0, 1100], 0.9]], u);
    const gk = ceilB(lt('grid', 3) + 0.6) - lt('grid', 0);
    if (!kicked && u >= gk - DT * 0.5) { kicked = true; Nn[A].th += 1.3; Nn[B].th -= 1.3; ev('kick', 1); pump({ shake: 6, bloom: 0.5 }); [A, B].forEach(i => { const p = cam.p(Nn[i].x, 0, Nn[i].z); if (p) shock(p[0], p[1], 260, GOLD, 2, 1.0); }); }
    const K = 2.2, w0 = TAU / (4 * BEAT);
    const gpm = gph(NOW + DT, 4); const d = Nn.map(n => { let s = 0; n.nb.forEach(j => s += Math.sin(Nn[j].th - n.th)); return w0 + K * s + 0.4 * Math.sin(gpm - n.th); });
    Nn.forEach((n, i) => n.th += d[i] * DT);
    // 地面城市灯
    add();
    LIGHTS.forEach(l => { const p = cam.p(l[0], 0, l[1]); if (p) dot(SP[l[2]], p[0], p[1], 6 * Math.min(3, p[2] * 3), (0.25 + 0.2 * Math.sin(NOW * 3 + l[3] * 20)) * a); });
    // 输电塔与电线
    const pyA = a * (1 - 0.75 * ss(L(1), L(2), u));
    PY.forEach(z => { const base = [[-60, 0], [60, 0]], top = cam.p(0, 420, z); if (!top) return; base.forEach(([x]) => poly([cam.p(x, 0, z), top], TEAL, 0.4 * pyA, 1.2)); [300, 360].forEach(y => poly([cam.p(-90, y, z), cam.p(90, y, z)], TEAL, 0.4 * pyA, 1.2)); poly([cam.p(-60, 0, z), cam.p(0, 200, z), cam.p(60, 0, z)], TEAL, 0.25 * pyA, 1); });
    [-80, 0, 80].forEach((x, k) => {
      const yb = k === 1 ? 360 : 300; const pts = [];
      for (let z = -400; z <= 3600; z += 30) { const s = ((z + 400) % 450) / 450; pts.push(cam.p(x, yb - 60 * 4 * s * (1 - s), z)); }
      poly(pts, WHITE, 0.35 * pyA, 1.1);
      for (let q = 0; q < 8; q++) { const z = ((u * 600 + q * 520 + k * 170) % 4000) - 400, s = ((z + 400) % 450) / 450; const p = cam.p(x, yb - 60 * 4 * s * (1 - s), z); if (p) dot(SP.gold, p[0], p[1], 40 * Math.min(2, p[2] * 2), 0.9 * pyA); }
    });
    // 网络
    const na = a * ss(L(1), L(2), u);
    if (na > 0.01) {
      E.forEach(([i, j], k) => {
        const p = cam.p(Nn[i].x, 0, Nn[i].z), q = cam.p(Nn[j].x, 0, Nn[j].z); if (!p || !q) return;
        line(p[0], p[1], q[0], q[1], TEAL, 0.3 * na, 1.2);
        flows[k] = (flows[k] + DT * 0.4) % 1;
        dot(SP.teal, lerp(p[0], q[0], flows[k]), lerp(p[1], q[1], flows[k]), 22, 0.8 * na);
      });
      Nn.forEach((n, i) => {
        const sp = (i === A || i === B) && kicked, col = sp ? GOLD : WHITE;
        const ring = circ3(cam, n.x, 1, n.z, 34, 'xz', 32);
        norm_(); poly(ring, col, (sp ? 0.95 : 0.6) * na, 1.4); add();
        const tip = cam.p(n.x + Math.cos(n.th) * 30, 1, n.z + Math.sin(n.th) * 30), c0 = cam.p(n.x, 1, n.z);
        if (tip && c0) { line(c0[0], c0[1], tip[0], tip[1], col, 0.95 * na, 2); dot(sp ? SP.gold : SP.white, c0[0], c0[1], 40, (0.3 + 0.4 * Math.pow(0.5 + 0.5 * Math.cos(n.th), 6)) * na); }
      });
      norm_();
      if (kicked) {
        const ka = na * (1 - ss(L(4) + 0.5, L(4) + 1.5, u));
        const pa = cam.p(Nn[A].x, 0, Nn[A].z), pb = cam.p(Nn[B].x, 0, Nn[B].z);
        onUI(() => { if (pa) txt('快了 → 往回拽', pa[0], pa[1] - 44, '24px ' + SERIF, rgba(GOLD, 0.95 * ka), 'center', '2px', 10); if (pb) txt('慢了 → 往前推', pb[0], pb[1] - 44, '24px ' + SERIF, rgba(GOLD, 0.95 * ka), 'center', '2px', 10); });
      }
      onUI(() => {
        add(); const wv = [];
        for (let x = 560; x <= 1360; x += 4) wv.push([x, 860 + 18 * Math.sin((x - 560) / 800 * TAU * 5 - Nn[0].th)]);
        gline(wv, GOLD, 0.6 * na, 1.4);
        const ma = na * ss(L(4), L(4) + 1, u);
        if (ma > 0.01) { ctx.setLineDash([5, 8]); ctx.strokeStyle = rgba(GOLD, 0.5 * ma); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(W / 2, 470, 70, 0, TAU); ctx.stroke(); ctx.setLineDash([]); txt('没有总开关', W / 2, 477, '20px ' + SERIF, rgba(GOLD, 0.9 * ma), 'center', '4px'); txt('NO MASTER CLOCK', W / 2, 572, '11px ' + MONO, rgba(GOLD, 0.5 * ma), 'center', '4px'); }
      });
      const f = 50 + (kicked ? 0.04 * Math.exp(-(u - L(3) - 0.6) * 0.8) * Math.sin(u * 6) : 0);
      hudTR(['POWER GRID · ONE SYNCHRONOUS AREA', 'GENERATORS (ILLUSTRATIVE) = 60', `f = ${f.toFixed(2)} Hz`, 'DISPLAY SLOWED ×1/100'], a);
      heading('每秒 50 次', '50 Hz', na * ss(L(2), L(2) + 0.8, u) * (1 - ss(L(3) + 0.2, L(3) + 1, u)), 140);
    } else hudTR(['POWER GRID', ' ', ' '], a);
    norm_();
    hudTL('电网', 'THE POWER GRID', a);
  };
}, { bloom: 0.65 });

// ---------- 9. 同步的代价（癫痫） ----------
scene('cost', () => lt('cost', 0), () => secEnd('cost'), () => {
  const r = rng(505); const Nr = brainCloud(r, 1100).map(p => ({ ...p, ph: r() * TAU, w: TAU / (2 * BEAT) * (1 + gauss(r) * 0.12) + p.x / 330 * 0.9, b: 0 }));
  const eeg = []; let heat = 0, lastBig = 0;
  return (u, a, dur) => {
    const L = k => lt('cost', k) - lt('cost', 0);
    let K;
    if (u < L(1)) K = 1.0; else if (u < L(2)) K = lerp(1.0, 2.2, ss(L(1), L(2), u));
    else if (u < L(3)) K = lerp(2.2, 9, ss(L(2), L(2) + 1.5, u));
    else K = lerp(9, 0.9, ss(L(3), L(3) + 2.5, u));
    let cx = 0, sy = 0; Nr.forEach(n => { cx += Math.cos(n.ph); sy += Math.sin(n.ph); });
    const R = Math.hypot(cx, sy) / Nr.length, psi = Math.atan2(sy, cx);
    let sum = 0, fires = 0;
    const cpace = 2.5 * ss(L(2), L(2) + 1, u) * (1 - ss(L(3), L(3) + 1.5, u)), cpm = gph(NOW + DT, 2);
    Nr.forEach(n => { const prev = Math.cos(n.ph); n.ph += (n.w + K * R * Math.sin(psi - n.ph) + cpace * Math.sin(cpm - n.ph)) * DT; n.b = Math.pow(0.5 + 0.5 * Math.cos(n.ph), 6); sum += n.b; if (prev < 0.99 && Math.cos(n.ph) >= 0.99) fires++; });
    if (fires) ev('neuron', fires / Nr.length, R);
    const mean = sum / Nr.length;
    heat = lerp(heat, ss(L(2), L(2) + 1.2, u) * (1 - ss(L(3), L(3) + 2, u)), 0.1);
    if (heat > 0.4 && fires > Nr.length * 0.3 && u - lastBig > 0.6) { lastBig = u; pump({ flash: 0.25 * heat, shake: 16 * heat, glitch: 0.5 * heat, bloom: 0.9 * heat, zoomPunch: heat }); shock(W / 2, 450, 900, AMBER, 3, 1.0); }
    hist(eeg, mean, 220);
    const rot = 0.3 * Math.sin(u * 0.15);
    const cam = Cam([Math.sin(rot) * 1700, 20, -Math.cos(rot) * 1700], [0, -60, 0], 0.85);
    const col = heat > 0.3 ? [255, 140, 100] : TEAL;
    drawBrain(cam, col, (0.45 + 0.5 * heat * mean * 3) * a);
    add();
    const spr = heat > 0.5 ? SP.amber : SP.teal;
    Nr.forEach(n => { const p = cam.p(n.x, n.y, n.z); if (p) dot(spr, p[0], p[1], (10 + n.b * (16 + heat * 26)) * p[2] * 0.75, (0.12 + n.b * (0.75 + heat * 0.3)) * a * fog(p[3], 900, 1900)); });
    norm_();
    // 脑起搏器：电极从上方插入，按拍发出脉冲
    const ea = a * ss(L(3) + 0.2, L(3) + 1.4, u);
    if (ea > 0.01) {
      const tipK = ss(L(3) + 0.2, L(3) + 1.4, u), top = cam.p(420, 560, -60), tip = cam.p(lerp(420, 30, tipK), lerp(560, -80, tipK), lerp(-60, 10, tipK));
      if (top && tip) {
        poly([top, tip], [200, 210, 225], 0.8 * ea, 2.2);
        const pz = 1 - ((gph(NOW, 1) / TAU) % 1);
        add(); dot(SP.teal, tip[0], tip[1], 40 * tip[2], 0.9 * ea);
        if (u > L(3) + 1.4) { ctx.strokeStyle = rgba(TEAL, 0.5 * ea * (1 - pz) ** 0.5); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tip[0], tip[1], Math.max(1, 260 * tip[2] * (1 - pz)), 0, TAU); ctx.stroke(); }
        norm_();
      }
    }
    onUI(() => {
      const gx = 560, gy = 850, gw = 800, pts = eeg.map((v, i) => [gx + i / 220 * gw, gy - (v - 0.2) * 110]);
      gline(pts, heat > 0.4 ? [255, 150, 110] : WHITE, 0.75 * a, 1.4);
      txt('EEG', gx - 16, gy + 4, '12px ' + MONO, rgba(GOLD, 0.55 * a), 'right', '3px');
    });
    hudTR(['NEURAL FIELD', `SYNC r = ${fmt(R)}`, heat > 0.4 ? 'HYPERSYNCHRONY' : (u > L(3) + 2 ? 'DBS ON · DESYNCHRONIZED' : ' ')], a);
    hudTL('当同步出错', 'WHEN SYNC GOES WRONG', a);
    heading('部分同步', 'PARTIAL SYNC · HEALTHY', a * ss(L(1), L(1) + 0.8, u) * (1 - ss(L(2), L(2) + 0.6, u)), 130);
    heading('太整齐', 'TOO MUCH IN STEP', a * ss(L(2) + 0.2, L(2) + 1.0, u) * (1 - ss(L(3) - 0.3, L(3) + 0.3, u)), 130);
    heading('把同步打散', 'BREAKING THE SYNC', a * ss(L(3) + 1.0, L(3) + 1.8, u) * (1 - ss(L(4) - 0.3, L(4) + 0.4, u)), 130);
    heading('脑起搏器 · 国产', 'DEEP BRAIN STIMULATION', a * ss(L(4) + 0.3, L(4) + 1.1, u), 130);
  };
}, { bloom: 0.7, trail: 0.35 });

// ---------- 10a. 合唱团 ----------
scene('choir', () => -10, () => -10, () => {   // 本版不用
  const r = rng(606); const S7 = Array.from({ length: 9 }, (_, i) => ({ ph: r() * TAU, w: TAU / (8 * BEAT) * (1 + gauss(r) * 0.1), hist: [], br: [] }));
  let bph = 0;
  return (u, a, dur) => {
    const K = 1.6 * ss(1.0, 5, u);
    bph = gph(NOW, 8);
    S7.forEach(s => { s.ph += (s.w + K * Math.sin(bph - s.ph)) * DT; hist(s.hist, Math.sin(s.ph), 260); if (Math.sin(s.ph) > 0.3 && r() < 0.5) s.br.push({ x: (r() - 0.5) * 20, y: 0, t: 0 }); s.br.forEach(b => { b.t += DT; b.y += 40 * DT; b.x += Math.sin(b.t * 3) * 0.6; }); while (s.br.length && s.br[0].t > 2.5) s.br.shift(); });
    const cam = Cam([Math.sin(u * 0.05) * 200, 230, -950 + u * 20], [0, 150, 0], 0.85);
    add();
    S7.forEach((s, i) => {
      const an = (i - 4) * 0.2, x = Math.sin(an) * 900, z = 600 - Math.cos(an) * 600;
      const head = cam.p(x, 170, z), body = cam.p(x, 90, z);
      if (!head) return;
      const breath = 0.5 + 0.5 * Math.sin(s.ph);
      dot(SP.rose, body[0], body[1], 260 * body[2], 0.18 * a);
      dot(SP.rose, head[0], head[1], (40 + 16 * breath) * head[2], 0.95 * a);
      dot(SP.rose, head[0], head[1], 160 * head[2], 0.12 * breath * a);
      s.br.forEach(b => { const p = cam.p(x + b.x, 185 + b.y, z); if (p) dot(SP.gold, p[0], p[1], 8 * p[2], 0.5 * (1 - b.t / 2.5) * a); });
    });
    norm_();
    onUI(() => {
      S7.slice(0, 7).forEach((s, i) => { const y0 = 640 + i * 34; gline(s.hist.map((v, k) => [560 + k / 260 * 800, y0 - v * 16]), ROSE, 0.8 * a, 1.4); });
      txt('心率 HEART RATE', 540, 644, '12px ' + MONO, rgba(GOLD, 0.6 * a), 'right', '2px');
    });
    hudTR(['CHOIR · HEART RATE', 'UNIV. OF GOTHENBURG · 2013', 'BREATH-GUIDED'], a);
    hudTL('一起唱歌', 'SINGING TOGETHER', a);
  };
}, { bloom: 0.7 });

// ---------- 10b. 并肩走路 ----------
scene('walk', () => lt('walk', 0), () => secEnd('walk'), () => {
  const r = rng(707); const Wk = [{ ph: 0.2, w: TAU * 0.95, c: 'gold', x: -36, fp: [] }, { ph: 2.4, w: TAU * 0.92, c: 'teal', x: 36, fp: [] }];
  let p1 = 0, p2 = Math.PI, zc = 0;
  const MTR = [380, 470, 560, 650, 740];
  const GR = Array.from({ length: 300 }, () => [(r() - 0.5) * 3000, r() * 4000]);
  return (u, a, dur) => {
    const K = 1.2 * ss(0.8, 4, u);
    zc += 120 * DT;
    const wpm = gph(NOW + DT, 2), wpc = 1.0 * ss(0.8, 4, u);
    Wk.forEach((w, i) => { const o = Wk[1 - i]; const prev = Math.sin(w.ph); w.ph += (w.w + K * Math.sin(o.ph - w.ph) + wpc * Math.sin(wpm - w.ph)) * DT; if (Math.sign(prev) !== Math.sign(Math.sin(w.ph))) { w.fp.push({ x: w.x + (w.fp.length % 2 ? 10 : -10), z: zc, t: 0 }); ev('foot', 1, i); } w.fp.forEach(f => f.t += DT); while (w.fp.length && w.fp[0].t > 8) w.fp.shift(); });
    const cam = Cam([0, 190, zc - 720], [0, 40, zc + 900], 0.9);
    add();
    GR.forEach(g => { const z = ((g[1] - zc) % 4000 + 4000) % 4000 + zc - 300; const p = cam.p(g[0], 0, z); if (p) dot(SP.white, p[0], p[1], 3 * Math.min(4, p[2] * 2), 0.12 * a * fog(p[3], 200, 3500)); });
    const path = [cam.p(-120, 0, zc - 300), cam.p(-120, 0, zc + 4000)], path2 = [cam.p(120, 0, zc - 300), cam.p(120, 0, zc + 4000)];
    poly(path, TEAL, 0.15 * a, 1); poly(path2, TEAL, 0.15 * a, 1);
    Wk.forEach(w => {
      const bob = 4 * Math.abs(Math.sin(w.ph)), p = cam.p(w.x, 46 + bob, zc), rp = cam.p(w.x, -46, zc);
      if (p) { dot(SP[w.c], p[0], p[1], 75 * p[2] / 2, 1.0 * a); dot(SP[w.c], p[0], p[1], 26 * p[2] / 2, a); dot(SP[w.c], p[0], p[1], 220 * p[2] / 2, 0.08 * a); }
      if (rp) dot(SP[w.c], rp[0], rp[1], 70 * rp[2] / 2, 0.12 * a);
      w.fp.forEach(f => { const q = cam.p(f.x, 0, f.z); if (q) { dot(SP[w.c], q[0], q[1], 60 * q[2] / 2, 1.0 * Math.exp(-f.t * 0.2) * a); dot(SP.white, q[0], q[1], 14 * q[2] / 2, 0.9 * Math.exp(-f.t * 0.35) * a); } });
    });
    const ea = a * ss(2.6, 3.8, u);
    if (ea > 0.01) {
      p1 = gph(NOW, 4); p2 = p1 + Math.PI;
      norm_();
      [-640, -480].forEach((x, i) => { const th = 0.3 * Math.sin(i ? p2 : p1), z = zc + 1600, piv = cam.p(x, 280, z), bob = cam.p(x + Math.sin(th) * 200, 280 - Math.cos(th) * 200, z); if (piv && bob) { poly([piv, bob], WHITE, 0.45 * ea, 1.2); add(); dot(SP.white, bob[0], bob[1], 60 * bob[2] / 2, 0.8 * ea); norm_(); } });
      poly([cam.p(-740, 280, zc + 1600), cam.p(-380, 280, zc + 1600)], TEAL, 0.4 * ea, 1.2);
      const mth = 0.42 * Math.sin(gph(NOW, 2)), z = zc + 1600;
      MTR.forEach(x => { const base = cam.p(x, 120, z), tip = cam.p(x + Math.sin(mth) * 150, 120 + Math.cos(mth) * 150, z); if (base && tip) { norm_(); poly([cam.p(x - 26, 110, z), cam.p(x - 10, 230, z), cam.p(x + 10, 230, z), cam.p(x + 26, 110, z)], WHITE, 0.25 * ea, 1, true); poly([base, tip], WHITE, 0.6 * ea, 1.4); add(); dot(SP.white, tip[0], tip[1], 34 * tip[2] / 2, 0.8 * ea); dot(SP.gold, base[0], base[1], 40 * base[2] / 2, (0.3 + 0.6 * Math.pow(Math.abs(Math.cos(gph(NOW, 2))), 12)) * ea); } });
      poly([cam.p(330, 110, z), cam.p(790, 110, z)], TEAL, 0.4 * ea, 1.2);
    }
    norm_();
    hudTL('并肩', 'SIDE BY SIDE', a);
  };
}, { bloom: 0.7 });

// ---------- 10c. 结尾：四段闪回 → 光海一起亮起来 ----------
function circPts(x, y, r, n = 40, a0 = 0, a1 = TAU) { const p = []; for (let i = 0; i <= n; i++) { const t = a0 + (a1 - a0) * i / n; p.push([x + Math.cos(t) * r, y + Math.sin(t) * r]); } return p; }
const RECAP = [
  { zh: '两只钟', en: 'CLOCKS', f: 0.10, draw(x, y, s, a, u) {
      const cy = y - 18 * s; gline(circPts(x, cy, 30 * s), CREAM, a, 1.5);
      gline([[x, cy], [x + 14 * s, cy - 12 * s]], CREAM, a, 1.5); gline([[x, cy], [x - 4 * s, cy - 20 * s]], CREAM, a, 1.5);
      const th = 0.38 * Math.sin(gph(NOW, 4)), bx = x + Math.sin(th) * 52 * s, by = cy + 30 * s + Math.cos(th) * 52 * s;
      gline([[x, cy + 30 * s], [bx, by]], CREAM, a, 1.3); add(); dot(SP.warm, bx, by, 26 * s, 0.9 * a); norm_(); } },
  { zh: '一座桥', en: 'BRIDGE', f: 0.36, draw(x, y, s, a) {
      const dy = y + 18 * s, T = 40 * s, X1 = 36 * s, X2 = 78 * s;
      gline([[x - X2, dy], [x + X2, dy]], CREAM, a, 1.6);
      [-X1, X1].forEach(o => gline([[x + o, dy + 10 * s], [x + o, dy - T]], CREAM, a, 1.5));
      const cy = xx => { const ax = Math.abs(xx - x); return ax <= X1 ? dy - T + (T - 10 * s) * (1 - (ax / X1) ** 2) : dy - T + T * (ax - X1) / (X2 - X1); };
      const cab = []; for (let i = 0; i <= 60; i++) { const xx = x - X2 + 2 * X2 * i / 60; cab.push([xx, cy(xx)]); } gline(cab, CREAM, 0.8 * a, 1.2);
      for (let xx = x - X1 + 9 * s; xx < x + X1 - 4 * s; xx += 9 * s) line(xx, cy(xx), xx, dy, CREAM, 0.35 * a, 1);
      [-X1, X1].forEach(o => { add(); dot(SP.warm, x + o, dy - T, 16 * s, 0.8 * a); norm_(); }); } },
  { zh: '一张电网', en: 'POWER GRID', f: 0.61, draw(x, y, s, a) {
      const t = y - 50 * s, bt_ = y + 44 * s;
      gline([[x - 26 * s, bt_], [x - 6 * s, t], [x + 6 * s, t], [x + 26 * s, bt_]], CREAM, a, 1.4);
      gline([[x - 40 * s, t + 16 * s], [x + 40 * s, t + 16 * s]], CREAM, a, 1.4); gline([[x - 30 * s, t + 36 * s], [x + 30 * s, t + 36 * s]], CREAM, a, 1.4);
      gline([[x - 20 * s, bt_ - 20 * s], [x + 13 * s, t + 50 * s], [x - 13 * s, t + 50 * s], [x + 20 * s, bt_ - 20 * s]], CREAM, 0.6 * a, 1.1);
      [[-40, 16], [40, 16], [-30, 36], [30, 36]].forEach(([ox, oy]) => { add(); dot(SP.warm, x + ox * s, t + oy * s, (12 + 8 * Math.pow(Math.abs(Math.cos(gph(NOW, 2))), 8)) * s, 0.9 * a); norm_(); }); } },
  { zh: '一颗大脑', en: 'BRAIN', f: 0.84, draw(x, y, s, a) {
      gline(BRAIN_C.map(p => [x + p[0] * 0.2 * s, y - 4 * s + p[1] * 0.2 * s]), CREAM, a, 1.5, true);
      add(); dot(SP.teal, x, y - 6 * s, 24 * s, (0.5 + 0.4 * Math.sin(gph(NOW, 1))) * a); norm_(); } },
];
scene('sea', () => lt('end', 0), () => secEnd('end'), () => {
  const r = rng(808), N = 2600;
  const P = Array.from({ length: N }, () => ({ x: (r() - 0.5) * 6000, z: Math.pow(r(), 0.7) * 5000, ph: r() * TAU, w: TAU / (4 * BEAT) * (1 + gauss(r) * 0.08) }));
  const hit = [false, false, false, false]; let finalHit = false;
  return (u, a, dur) => {
    const L = k => lt('end', k) - lt('end', 0);
    const S = ss(L(2) - 0.5, L(4), u);                     // 同步程度：从"该让它发生的地方"开始收拢
    const F = ss(L(4) - 0.2, L(4) + 1.0, u);              // 最后一句：整片一起亮
    const recapA = 1 - ss(L(2) - 0.4, L(2) + 0.5, u);
    const K = 0.25 + 2.4 * S, pc = 0.3 + 1.6 * S;
    let cx = 0, sy = 0; P.forEach(p => { cx += Math.cos(p.ph); sy += Math.sin(p.ph); });
    const R = Math.hypot(cx, sy) / N, psi = Math.atan2(sy, cx);
    let fires = 0;
    const cam = Cam([0, lerp(150, 300, easeIO(u / dur)), lerp(-300, -160, u / dur)], [0, 0, 2400], 0.95);
    // 地平线的城市暖光（最后一句亮起）
    const hz_ = cam.p(0, 0, 5200);
    if (hz_ && F > 0.01) { const g = ctx.createLinearGradient(0, hz_[1] - 160, 0, hz_[1] + 120); g.addColorStop(0, 'rgba(232,163,61,0)'); g.addColorStop(0.6, `rgba(232,163,61,${0.1 * F * a})`); g.addColorStop(1, 'rgba(232,163,61,0)'); ctx.fillStyle = g; ctx.fillRect(0, hz_[1] - 160, W, 280); }
    add();
    const dim = 0.55 + 0.45 * (1 - recapA * ss(L(0), L(0) + 0.6, u));
    P.forEach(p => {
      const prev = Math.cos(p.ph);
      const dd = Math.hypot(p.x, p.z - 1200) / 2000;
      p.ph += (p.w + K * R * Math.sin(psi - p.ph + dd * 1.6) + pc * Math.sin(gph(NOW + DT, 4) + dd * 1.6 - p.ph)) * DT;
      if (prev < 0.99 && Math.cos(p.ph) >= 0.99) fires++;
      const q = cam.p(p.x, 0, p.z); if (!q) return;
      const b0 = Math.pow(0.5 + 0.5 * Math.cos(p.ph), 4), fo = fog(q[3], 200, 5200);
      const b = lerp(b0, 0.62 + 0.38 * b0, F);          // 最后一句：所有灯都亮着，同步的光浪在上面一起起伏
      const gold = q[3] < 1600 + 4000 * F;
      const low = 1 - 0.65 * ss(780, 1000, q[1]);          // 字幕区的光点压暗、变小，保证最后一句看得清
      dot(gold ? SP.gold : SP.white, q[0], q[1], (6 + b * (7 + 7 * S + 5 * F)) * Math.min(5 - 1.8 * F, q[2] * 4) * (0.6 + 0.4 * low), (0.18 + (0.6 + 0.5 * S + 0.2 * F) * b) * fo * a * dim * low);
    });
    if (fires) { ev('sea', fires / N, R); if (fires > N * 0.25) pump({ bloom: 0.25 + 0.45 * F }); }
    norm_();
    if (!finalHit && u >= L(4) - DT * 0.5) { finalHit = true; pump({ flash: 0.18, bloom: 0.8 }); shock(W / 2, 560, 1300, WARM, 2.0, 1.6); }
    // 闪回：念到哪个词，哪一段的线稿亮起来
    if (recapA > 0.01) {
      const d0 = L(1) - 0.35 - L(0);
      onUI(() => {
        const n = RECAP.length, gap = 380, x0 = W / 2 - gap * (n - 1) / 2, y0 = 330, sc = 1.7;
        RECAP.forEach((it, i) => {
          const ti = L(0) + it.f * d0, k = ss(ti, ti + 0.5, u), ia = a * k * recapA;
          if (!hit[i] && u >= ti) { hit[i] = true; pump({ bloom: 0.25 }); }
          if (ia < 0.01) return;
          const x = x0 + i * gap, y = y0 + (1 - k) * 14;
          if (i > 0) { const kk = ss(ti - 0.2, ti + 0.3, u); line(x - gap + 150, y0, x - gap + 150 + (gap - 300) * kk, y0, WARM, 0.35 * a * recapA, 1); }
          it.draw(x, y, sc, ia, u);
          txt(it.zh, x, y0 + 150, '24px ' + SERIF, rgba(CREAM, 0.9 * ia), 'center', '6px');
          txt(it.en, x, y0 + 178, '11px ' + MONO, rgba(GREYB, 0.7 * ia), 'center', '4px');
          add(); dot(SP.warm, x, y0 - 6, 200 * (1 - k) + 40, 0.5 * (1 - k) * a * recapA); norm_();
        });
      });
    }
    heading('读懂它', 'LEARN TO READ IT', a * ss(L(1) + 0.3, L(1) + 1.0, u) * (1 - ss(L(2) - 0.4, L(2) + 0.3, u)), 150);
  };
}, { bloom: 0.75 });

// ---------- 片尾：系列模板 + 固定结尾 ----------
scene('outro', () => lt('outro', 0), () => TL.total, () => {
  const r = rng(909);
  const pts = textPoints('同 步', '160px ' + SERIF, 5, '64px');
  const P = pts.map(p => ({ tx: 960 + p[0], ty: 520 - 52 + p[1], x: r() * W, y: 700 + r() * 400, d: r() * 0.6, tw: r() * TAU }));
  const RP = ringParticles(29);
  return (u, a, dur) => {
    const fo = 1 - ss(dur - 1.6, dur - 0.1, u);
    add();
    P.forEach(p => { const k = easeIO(clamp((u - p.d) / 1.8)); const x = lerp(p.x, p.tx, k), y = lerp(p.y, p.ty, k) - Math.sin(k * Math.PI) * 120; dot(SP.cream, x, y, 7 + (1 - k) * 7, (0.25 + 0.3 * (0.5 + 0.5 * Math.sin(u * 5 + p.tw))) * a * fo * (1 - ss(2.4, 3.0, u) * 0.85)); });
    norm_();
    const ta = a * ss(4 * BEAT - 0.3, 4 * BEAT + 0.4, u) * fo;
    if (ta > 0.01) titleCard(ta, u, RP);
    const na = a * ss(4 * BEAT + 0.8, 4 * BEAT + 1.6, u) * fo;
    onUI(() => {
      txt('下一期  ·  熵 · 时间只朝一个方向', W / 2, 860, '22px ' + SERIF, rgba(GREYB, 0.95 * na), 'center', '6px');
      txt('NEXT · 06 · ENTROPY', W / 2, 892, '11px ' + MONO, rgba(GREYB, 0.6 * na), 'center', '4px');
    });
  };
}, { bloom: 0.6 });
