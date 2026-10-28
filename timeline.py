import json, re, sys, math
# 时间轴：按阅读速度排字幕，再吸附到 114 BPM 拍点（段落开头吸附到小节重拍）
L = json.load(open('script.json', encoding='utf-8'))
rate = float(sys.argv[1]) if len(sys.argv) > 1 else 3.75
BPM = 114; BEAT = 60 / BPM; B0 = 0.1; BAR = 4 * BEAT
def ceil_to(t, step): return B0 + math.ceil((t - B0) / step - 1e-6) * step
def near(t, step): return B0 + round((t - B0) / step) * step
t = B0; secs = {}; prev_sec = None; need_end = B0
for l in L:
    if l['zh']:
        n = len(re.sub(r'[，。：；、？！“”——\s]', '', l['zh']))
        d = max(2.2, n / rate) + 0.6
    else:
        d = l['dur']
    d += l.get('pause', 0) * 1.2
    if 'hold' in l: d = l['hold']               # 手动指定这一句停留多久
    start = max(t, need_end)
    if l['sec'] != prev_sec:
        s0 = ceil_to(start - 0.25, BAR)          # 段落开头：下一个小节重拍（最多提前 0.25s）
        if s0 < need_end - 0.25: s0 += BAR
    else:
        s0 = near(start, BEAT)
        if s0 < need_end - 0.15: s0 = ceil_to(need_end - 0.15, BEAT)
    l['t0'] = round(s0, 3)
    l['dur_need'] = d
    need_end = s0 + d
    t = s0 + d
    if l['sec'] != prev_sec: secs[l['sec']] = [round(s0, 3), 0]
    prev_sec = l['sec']
# 结束时间：字幕到下一句开头前 0.35s；段落结束 = 下一段开头
for i, l in enumerate(L):
    nxt = L[i + 1]['t0'] if i + 1 < len(L) else ceil_to(l['t0'] + l['dur_need'], BAR)
    l['t1'] = round(nxt - 0.35 if l['zh'] else nxt, 3)
    if l.get('show'): l['t1'] = round(min(l['t1'], l['t0'] + l['show']), 3)
    secs[l['sec']][1] = round(nxt, 3)
total = round(secs[L[-1]['sec']][1], 3)
print('total', total); print(secs)
json.dump({'lines': L, 'secs': secs, 'total': total, 'bpm': BPM, 'b0': B0}, open('timeline.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
def ts(x): h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60; return f"{h:02}:{m:02}:{int(s):02},{int(round((s - int(s)) * 1000)):03}"
with open('同步_字幕.srt', 'w', encoding='utf-8') as f:
    i = 1
    for l in L:
        if l['zh']: f.write(f"{i}\n{ts(l['t0'])} --> {ts(l['t1'])}\n{l['zh']}\n{l['en']}\n\n"); i += 1
