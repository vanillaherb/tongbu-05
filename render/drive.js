// 用法：
//   node render/drive.js full build/clean.mp4          渲染整片（无声画面）
//   node render/drive.js preview 3,28.5,105            只导出这几秒的截图到 render/prev/
//   START=98 node render/drive.js preview 100,105     从第98秒开始模拟（快速预览后段）
//   node render/drive.js chunk 2 7 build/part_2.mp4    把整片按场景切成 7 块，只渲染第 2 块（0 起；多台机器并行用）
//   node render/drive.js plan 7                        打印 7 块的切分点
// 用法: node drive.js preview t1,t2,...   |  node drive.js full out.mp4
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
(async () => {
  const mode = process.argv[2];
  const tl = JSON.parse(fs.readFileSync(path.join(__dirname, '../timeline.json'), 'utf8'));
  const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-device-scale-factor=1', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('console', m => console.log('PAGE:', m.text()));
  page.on('pageerror', e => { console.error('PAGEERR', e.message); process.exit(1); });
  await page.goto(require('url').pathToFileURL(path.join(__dirname, 'index.html')).href);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => { for (const f of ['38px "Noto Serif CJK SC"', 'bold 38px "Noto Serif CJK SC"', '14px "DejaVu Sans Mono"', 'bold 14px "DejaVu Sans Mono"', 'italic 20px "Liberation Serif"']) await document.fonts.load(f, '同步A'); });
  const fontOK = await page.evaluate(() => document.fonts.check('38px "Noto Serif CJK SC"', '同步') && [...document.fonts].filter(f => f.status === 'loaded').length);
  console.log('fonts loaded:', fontOK);
  const scenes = await page.evaluate(tl => init(tl), tl);
  console.log(JSON.stringify(scenes));
  const total = Math.round(tl.total * 30);
  let end = process.argv[4] ? Math.round(parseFloat(process.argv[4]) * 30) : total;
  let outPath = process.argv[3], startF = process.env.START ? Math.round(parseFloat(process.env.START) * 30) : 0, keepF = 0, evOut = path.join(__dirname, '../events.json');
  if (mode === 'plan' || mode === 'chunk') {
    // 切分点只放在"新场景开始后 0.7 秒"：上一个场景已完全淡出，新场景从它真正开始前 0.7 秒起模拟，和整片顺序渲染一致
    const n = parseInt(mode === 'plan' ? process.argv[3] : process.argv[4]);
    const cand = [...new Set(scenes.filter(s => s[1] > 1).map(s => Math.round((s[1] + 0.7) * 30)))].sort((a, b) => a - b).filter(f => f < total - 30);
    // 动态规划：选 n-1 个切点，让最长的一块尽量短
    const pts = [0, ...cand, total], m = pts.length, INF = 1e9;
    const dp = Array.from({ length: n + 1 }, () => new Array(m).fill(INF)), pr = Array.from({ length: n + 1 }, () => new Array(m).fill(-1));
    dp[0][0] = 0;
    for (let k = 1; k <= n; k++) for (let j = 1; j < m; j++) for (let i = 0; i < j; i++) { const v = Math.max(dp[k - 1][i], pts[j] - pts[i]); if (v < dp[k][j]) { dp[k][j] = v; pr[k][j] = i; } }
    const cuts = [m - 1]; for (let k = n, j = m - 1; k > 0; k--) { j = pr[k][j]; cuts.unshift(j); }
    const B_ = cuts.map(j => pts[j]);
    if (mode === 'plan') { console.log('PLAN', JSON.stringify(B_.map(f => +(f / 30).toFixed(2)))); await browser.close(); return; }
    const idx = parseInt(process.argv[3]);
    keepF = B_[idx]; end = B_[idx + 1]; startF = Math.max(0, keepF - 42);   // 提前 1.4 秒开始模拟
    outPath = process.argv[5]; evOut = outPath.replace(/\.mp4$/, '.events.json');
    console.log(`chunk ${idx}/${n}: ${(keepF / 30).toFixed(2)}s → ${(end / 30).toFixed(2)}s`);
  }
  await page.evaluate(n => { frameNo = n; }, startF);
  let ff = null, caps = new Set();
  if (mode === 'preview') {
    process.argv[3].split(',').forEach(s => caps.add(Math.round(parseFloat(s) * 30)));
    fs.mkdirSync(path.join(__dirname, process.env.PREV || 'prev'), { recursive: true });
  } else {
    ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', '30', outPath], { stdio: ['pipe', 'inherit', 'inherit'] });
  }
  const maxF = mode === 'preview' ? Math.max(...caps) + 1 : end;
  const B = 6; const t0 = Date.now();
  for (let f = startF; f < maxF; f += B) {
    const want = [];
    for (let k = f; k < Math.min(f + B, maxF); k++) want.push(mode === 'preview' ? caps.has(k) : k >= keepF);
    const out = await page.evaluate(({ f, want }) => {
      const r = [];
      want.forEach((w, i) => { renderFrame((f + i) / 30); r.push(w ? document.getElementById('c').toDataURL('image/jpeg', 0.92) : null); });
      return r;
    }, { f, want });
    for (let i = 0; i < out.length; i++) {
      if (!out[i]) continue;
      const buf = Buffer.from(out[i].split(',')[1], 'base64');
      if (ff) { if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); }
      else fs.writeFileSync(path.join(__dirname, process.env.PREV || 'prev', `t${((f + i) / 30).toFixed(1)}.jpg`), buf);
    }
    if (f % 900 === 0) console.log(`frame ${f}/${maxF}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  let events = await page.evaluate(() => EVENTS);
  if (mode === 'chunk') events = events.filter(e => e[0] >= keepF / 30 - 1e-6 && e[0] < end / 30 - 1e-6);
  fs.writeFileSync(evOut, JSON.stringify(events));
  if (ff) { ff.stdin.end(); await new Promise(r => ff.on('close', r)); }
  await browser.close();
  console.log('done', ((Date.now() - t0) / 1000).toFixed(0) + 's');
})();
