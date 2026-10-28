# 把 GitHub 上多台机器分块渲染的画面拼回整片，并合并画面事件（配乐卡点用）
# 用法：python join_parts.py <分块所在文件夹>      → build/clean.mp4 + events.json
import sys, os, glob, json, re, subprocess
BASE = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[1]
parts = sorted(glob.glob(os.path.join(src, '**', 'part_*.mp4'), recursive=True), key=lambda p: int(re.findall(r'part_(\d+)\.mp4', p)[0]))
if not parts: sys.exit('没找到 part_*.mp4')
os.makedirs(os.path.join(BASE, 'build'), exist_ok=True)
lst = os.path.join(BASE, 'build', 'parts.txt')
with open(lst, 'w', encoding='utf-8') as f:
    for p in parts: f.write(f"file '{os.path.abspath(p)}'\n")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', os.path.join(BASE, 'build', 'clean.mp4')], check=True)
ev = []
for p in parts: ev += json.load(open(p[:-4] + '.events.json', encoding='utf-8'))
ev.sort(key=lambda e: e[0])
json.dump(ev, open(os.path.join(BASE, 'events.json'), 'w', encoding='utf-8'))
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', os.path.join(BASE, 'build', 'clean.mp4')], capture_output=True, text=True).stdout)
print(f'拼好 {len(parts)} 块，共 {dur:.2f} 秒，事件 {len(ev)} 个')
