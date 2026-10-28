import json, os
BASE = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(BASE, 'build'), exist_ok=True)
T = json.load(open(os.path.join(BASE, 'timeline.json'), encoding='utf-8'))
def ts(x):
    h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60
    return f"{h}:{m:02}:{s:05.2f}"
head = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ZH,Noto Sans CJK SC,42,&H10F4F0EC,&H000000FF,&H00000000,&H96000000,0,0,0,0,100,100,2,0,1,0,1.2,2,80,80,92,1
Style: EN,Liberation Serif,24,&H708C8C96,&H000000FF,&H00000000,&H00000000,0,1,0,0,100,100,0.5,0,1,0,0,2,80,80,58,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
out = [head]
for l in T['lines']:
    if not l['zh']:
        continue
    a, b = l['t0'] + 0.1, l['t1']
    out.append(f"Dialogue: 0,{ts(a)},{ts(b)},ZH,,0,0,0,,{{\\fad(220,260)\\blur0.4}}{l['zh']}\n")
    out.append(f"Dialogue: 0,{ts(a)},{ts(b)},EN,,0,0,0,,{{\\fad(220,260)}}{l['en']}\n")
open(os.path.join(BASE, 'build', 'subs.ass'), 'w', encoding='utf-8').write(''.join(out))
print('ok', sum(1 for l in T['lines'] if l['zh']))
