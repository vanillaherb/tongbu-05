# 一键出片：时间轴 → 渲染画面 → 剪配乐/音效 → 字幕 → 合成
# 用法：
#   python build.py                 全流程（渲染画面最慢，约 10~30 分钟，看电脑性能）
#   python build.py --skip-render   画面已渲染过（build/clean.mp4 存在），只重做音频/字幕/合成
#   python build.py --720           额外导出 720P
#   python build.py --covers        额外生成封面
import argparse, os, subprocess, sys, shutil, time

BASE = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(BASE, 'build')
os.makedirs(B, exist_ok=True)
ap = argparse.ArgumentParser()
ap.add_argument('--skip-render', action='store_true')
ap.add_argument('--720', dest='p720', action='store_true')
ap.add_argument('--covers', action='store_true')
args = ap.parse_args()

def run(cmd, **kw):
    print('\n>>', ' '.join(cmd)); t = time.time()
    subprocess.run(cmd, cwd=BASE, check=True, **kw)
    print(f'   完成（{time.time() - t:.0f}s）')

# 环境检查
need_render = not (args.skip_render and os.path.exists(os.path.join(B, 'clean.mp4')))
for tool in (('node', 'ffmpeg') if need_render else ('ffmpeg',)):
    if not shutil.which(tool): sys.exit(f'找不到 {tool}，请按 README 安装')
for mod in ('numpy', 'scipy', 'soundfile', 'PIL'):
    try: __import__(mod)
    except ImportError: sys.exit(f'缺少 Python 库 {mod}：pip install -r requirements.txt')
if need_render and not os.path.isdir(os.path.join(BASE, 'node_modules', 'playwright')):
    sys.exit('还没装渲染器：在本目录运行  npm install  和  npx playwright install chromium')
missing = [k for k in ('01', '03', '06', '09') if not os.path.exists(os.path.join(BASE, 'mus', f't{k}.wav'))]
if missing: sys.exit('配乐还没准备：python prep_music.py <9首MP3所在文件夹>')

PY = sys.executable
run([PY, 'timeline.py', '3.75'])
clean = os.path.join('build', 'clean.mp4')
if not args.skip_render or not os.path.exists(os.path.join(BASE, clean)):
    run(['node', os.path.join('render', 'drive.js'), 'full', clean])
run([PY, 'mix.py'])
run(['ffmpeg', '-v', 'error', '-y', '-i', 'build/mix.wav', '-af', 'loudnorm=I=-15:TP=-1.2:LRA=11', '-ar', '48000', 'build/mix_norm.wav'])
run([PY, 'make_ass.py'])
shutil.copy(os.path.join(BASE, '同步_字幕.srt'), os.path.join(B, '同步_字幕.srt'))
run(['ffmpeg', '-v', 'error', '-y', '-i', clean, '-i', 'build/mix_norm.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
     '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', 'build/同步_无字幕版.mp4'])
run(['ffmpeg', '-v', 'error', '-y', '-i', clean, '-i', 'build/mix_norm.wav', '-map', '0:v', '-map', '1:a',
     '-vf', 'ass=build/subs.ass:fontsdir=fonts', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
     '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', 'build/同步_成片.mp4'])
if args.p720:
    for name in ('同步_成片', '同步_无字幕版'):
        run(['ffmpeg', '-v', 'error', '-y', '-i', f'build/{name}.mp4', '-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264',
             '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', f'build/{name}_720P.mp4'])
if args.covers:
    run([PY, os.path.join('cover', 'make_covers.py')])
print('\n全部完成，成品在 build/ 文件夹。')
