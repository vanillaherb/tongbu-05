# 准备配乐：把 4 首 Pixabay 原曲变速到 114 BPM（只变速不变调），输出到 mus/
# 用法：python prep_music.py "D:\下载\同步配乐"     （就是那 9 首 MP3 所在的文件夹）
import sys, os, glob, subprocess

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, 'mus')
os.makedirs(OUT, exist_ok=True)
# 编号: (原曲 BPM, rubberband 参数)
TRACKS = {'01': (110, 'transients=crisp'),    # Epic Build - The_Mountain
          '03': (110, 'transients=crisp'),    # Documentary - Technology - Cinematic-Soul
          '06': (110, 'transients=crisp'),    # Data Science - The_Mountain
          '09': (120, 'transients=smooth')}   # Ambient Piano - AtlasAudio

def has_rubberband():
    try:
        out = subprocess.run(['ffmpeg', '-hide_banner', '-filters'], capture_output=True, text=True, encoding='utf-8', errors='ignore').stdout
        return ' rubberband ' in out
    except FileNotFoundError:
        sys.exit('找不到 ffmpeg，请先安装并加入 PATH（见 README）')

if len(sys.argv) < 2:
    sys.exit('用法：python prep_music.py <9首MP3所在文件夹>')
src = sys.argv[1]
rb = has_rubberband()
print('变速引擎：', 'rubberband（高音质）' if rb else 'atempo（ffmpeg 内置，音质略差；建议装带 rubberband 的 ffmpeg）')
for k, (bpm, opt) in TRACKS.items():
    hits = sorted(glob.glob(os.path.join(src, f'{k}_*.mp3')))
    if not hits:
        sys.exit(f'在 {src} 里没找到 {k}_ 开头的 MP3')
    af = f'rubberband=tempo=114/{bpm}:pitchq=quality:{opt}' if rb else f'atempo={114 / bpm:.6f}'
    dst = os.path.join(OUT, f't{k}.wav')
    print(f'  {os.path.basename(hits[0])}  →  mus/t{k}.wav  ({bpm} → 114 BPM)')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', hits[0], '-af', af, '-ar', '48000', '-ac', '2', dst], check=True)
print('完成。')
