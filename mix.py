# 用 4 首 Pixabay 曲目（已变速到 114 BPM）按画面剪辑配乐，并叠加画面音效
import json, os, numpy as np, soundfile as sf
BASE = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(BASE, 'build'), exist_ok=True)
from math import ceil
from scipy.signal import butter, sosfilt, sosfilt_zi, oaconvolve, lfilter

SR = 48000; BPM = 114; BEAT = 60 / BPM; BAR = 4 * BEAT; B0 = 0.1
T = json.load(open(os.path.join(BASE, 'timeline.json'), encoding='utf-8')); EV = json.load(open(os.path.join(BASE, 'events.json'), encoding='utf-8'))
DUR = T['total']; N = int((DUR + 0.5) * SR)
bt = lambda k: B0 + k * BEAT
kof = lambda t: int(round((t - B0) / BEAT))
rng = np.random.default_rng(3)
M = os.path.join(BASE, 'mus') + os.sep
TR = {k: sf.read(M + f't{k}.wav')[0] for k in ('01', '03', '06', '09')}
# 每首曲子的小节时间（已变速后的秒数）
TB = {'01': lambda b: 38.50 + (b - 17) * BAR, '03': lambda b: 0.116 + b * BAR, '06': lambda b: 0.058 + b * BAR, '09': lambda b: 1.629 + b * BAR}

MUS = np.zeros((N, 2)); SFX = np.zeros((N, 2))
def db(x): return 10 ** (x / 20)
def seg_rms(k, b0, b1):
    a, b = int(TB[k](b0) * SR), int(TB[k](b1) * SR); x = TR[k][a:b]; return 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9)
def place(k, src_bar, dst_beat, dst_end_beat, gain_db=0.0, fin=0.01, fout=0.03, pre=0.0, fade_out_from=None):
    """把曲子 k 从 src_bar 开始放到画面 dst_beat，到 dst_end_beat 结束"""
    s0 = TB[k](src_bar) - pre; d0 = bt(dst_beat) - pre; d1 = bt(dst_end_beat)
    n = int((d1 - d0) * SR); a = int(s0 * SR)
    x = TR[k][max(0, a):max(0, a) + n].copy()
    if len(x) < n: x = np.pad(x, ((0, n - len(x)), (0, 0)))
    e = np.ones(n)
    fi = int(fin * SR); e[:fi] *= np.linspace(0, 1, fi) if fi else 1
    if fade_out_from is not None:
        fo0 = int((bt(fade_out_from) - d0) * SR); e[fo0:] *= np.linspace(1, 0, n - fo0) ** 1.5
    fo = int(fout * SR); e[n - fo:] *= np.linspace(1, 0, fo)
    i = int(d0 * SR); MUS[i:i + n] += x[:N - i] * e[:N - i, None] * db(gain_db)
    return i, n

# 目标响度：按各段原始 RMS 归一
def g(k, b0, b1, target): return target - seg_rms(k, b0, b1)

SB = {k: kof(v[0]) for k, v in T['secs'].items()}
SE = {k: kof(v[1]) for k, v in T['secs'].items()}          # 每段结束拍
LBk = {}
for l in T['lines']: LBk.setdefault(l['sec'], []).append(kof(l['t0']))
HK = LBk['hook']; L1, L3, L4 = HK[1], HK[3], HK[4]; LOCK = L4 + 6          # 与 s_hook.js 一致：对齐在第 5 句后 6 拍

def lowpass_sweep(i0, n, points):
    ts = np.arange(n) / SR + i0 / SR
    lf = np.interp(ts, [p[0] for p in points], [np.log(p[1]) for p in points])   # 按对数插值，听感上匀速打开
    blk = int(0.02 * SR); out = MUS[i0:i0 + n].copy(); zi = None
    for s in range(0, n, blk):
        fc = float(np.exp(np.mean(lf[s:s + blk])))
        sos = butter(2, min(fc, 20000) / (SR / 2), 'low', output='sos')
        if zi is None: zi = np.stack([sosfilt_zi(sos)[:, :, None] * out[s][None, None, :]], 0)[0]
        y, zi = sosfilt(sos, out[s:s + blk], axis=0, zi=zi); out[s:s + blk] = y
    MUS[i0:i0 + n] = out
def gain_env(i0, n, points):
    ts = np.arange(n) / SR + i0 / SR
    MUS[i0:i0 + n] *= db(np.interp(ts, [p[0] for p in points], [p[1] for p in points]))[:, None]
def level_ride(i0, n, below_db=6.0, max_boost=7.0):
    """把钢琴里特别空的几小节轻轻托起来（只提升、不压低），避免听起来像音乐断了"""
    x = MUS[i0:i0 + n]; w = int(0.6 * SR)
    e = np.sqrt(np.convolve((x ** 2).mean(1), np.ones(w) / w, 'same') + 1e-12)
    ref = 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9)
    gdb = np.clip(ref - below_db - 20 * np.log10(e), 0, max_boost)
    k = int(0.4 * SR); gdb = np.convolve(gdb, np.ones(k) / k, 'same')
    MUS[i0:i0 + n] *= db(gdb)[:, None]
def tape_stop(k, src_t, dst_t, T_=0.8, gain_db=0.0):
    n = int(T_ * SR); t = np.arange(n) / SR; pos = src_t + t - t ** 2 / (2 * T_)
    idx = pos * SR; i0 = np.floor(idx).astype(int); fr = idx - i0
    x = TR[k][i0] * (1 - fr[:, None]) + TR[k][i0 + 1] * fr[:, None]
    x *= (1 - t / T_)[:, None] ** 0.6
    i = int(dst_t * SR); MUS[i:i + n] += x * db(gain_db)

# 整体思路：全片只换 4 次曲子，每次都换在段落交界的小节线上，并且新旧两首能量接近或用自然收尾过渡
#   01 开场/标题/掌声  →  09 钢琴：并肩走路 + 生物钟  →  06 惠更斯 + 木梁  →  03 仓本 → 千禧桥 → 电网 → 脑  →  09 结尾
# 1) 开场：01 的第一个 drop 从第一帧开始，到倒带那一拍
g01 = g('01', 17, 25, -15.5)
place('01', 17, 0, L1, g01, fin=0.004, pre=0.06)
tape_stop('01', TB['01'](17) + L1 * BEAT, bt(L1), 0.8, g01)
# 2) 倒带后：同一首"倒回"前奏，一路连续放到 drop 撞在"对齐"那一拍；乱拍时闷着，越齐越亮；片头时压低让铃声露出来
T_IN = L1 + 1; ID0 = SB['title']; ID1 = SB['title'] + 4
i2, n2 = place('01', 17 - (LOCK - T_IN) / 4, T_IN, ID1, g01, fin=0.6, fout=0.03)
lowpass_sweep(i2, n2, [(0, 420), (bt(T_IN), 420), (bt(L3), 600), (bt(LOCK - 2), 9000), (bt(LOCK), 20000),
                       (bt(ID0 - 0.5), 20000), (bt(ID0 + 0.5), 900), (DUR, 900)])
gain_env(i2, n2, [(0, -3), (bt(L3), -3), (bt(LOCK), 0), (bt(ID0 - 0.5), 0), (bt(ID0 + 0.5), -7), (DUR, -7)])
# 3) 标题卡那一拍：01 的第二个 drop，整整两个乐句盖住掌声段，最后一小节自然收住
A_END = SE['applause']
place('01', 41, ID1, A_END + 2, g01 + 0.5, fin=0.004, pre=0.06, fade_out_from=A_END - 4)
# 4) 并肩走路 + 生物钟：09 的钢琴（能量降下来，接情感句；大脑里再闷一下）
g09a = g('09', 17, 33, -19.5)
W0 = SB['walk']; SCN_END = SE['scn']
iW, nW = place('09', 17, W0, SCN_END + 3, g09a, fin=1.2, pre=BEAT, fade_out_from=SCN_END - 1)
S2, S4 = LBk['scn'][2], LBk['scn'][4]
lowpass_sweep(iW, nW, [(0, 20000), (bt(SB['scn']), 20000), (bt(SB['scn'] + 3), 1300), (bt(S4), 1300), (bt(S4 + 6), 20000), (DUR, 20000)])
level_ride(iW, int((bt(SCN_END - 1) - iW / SR) * SR), 4.0, 9.0)
K3, K4 = LBk['kuramoto'][3], LBk['kuramoto'][4]
# 5) 惠更斯 + 木梁：06（它自带的两小节停顿落在"是什么在暗中指挥？"之后，"答案是"那一拍回来）
g06 = g('06', 18, 34, -17.5)
H0 = SB['answer'] - 18 * 4                       # 06 第 18 小节 = 答案段第一拍
i6, n6 = place('06', 0, H0, K4 - 15, g06, fin=0.4, fade_out_from=K4 - 18)   # 06 第 36 小节是空的，在那之前收掉
# 6) 仓本：06 的尾声里，03 的前奏闷着进来；"同步自己冒出来"那一拍鼓组炸开
K3, K4 = LBk['kuramoto'][3], LBk['kuramoto'][4]
g03 = g('03', 4, 24, -16.0)
_lk = [kof(e[0]) for e in EV if e[1] == 'lock']
CLOSE = _lk[-1] if len(_lk) > 1 else LBk['bridge'][4] + 2
iA, nA = place('03', 0, K4 - 16, CLOSE, g03 + 0.3, fin=0.3, fout=0.008)
lowpass_sweep(iA, nA, [(0, 1400), (bt(K4 - 16), 1400), (bt(K3), 2200), (bt(K4 - 1), 7000), (bt(K4), 20000), (DUR, 20000)])
# 7) 千禧桥"关闭"一拍硬停；阻尼器那句 03 从安静段重新进来，盖住重新开放和电网；
#    "大脑出错"整段先闷着，癫痫那一拍高潮炸开；脑起搏器"打散"后慢慢收，03 的自然结尾交给 09
C0, C2, C3 = SB['cost'], LBk['cost'][2], LBk['cost'][3]
RE = CLOSE + 4
iB, nB = place('03', 56 - (C0 - RE) / 4, RE, SE['cost'] + 10, g03, fin=0.8, fout=0.5)
lowpass_sweep(iB, nB, [(0, 20000), (bt(C0 - 1), 20000), (bt(C0 + 1), 800), (bt(C2 - 0.5), 800), (bt(C2), 20000),
                       (bt(C3 + 1), 20000), (bt(C3 + 10), 1600), (DUR, 1600)])
gain_env(iB, nB, [(0, 0), (bt(C3 + 1), 0), (bt(C3 + 10), -4), (DUR, -4)])
# 8) 结尾：09 的饱满段，自然收尾落在最后一帧
g09 = g('09', 67, 88, -18.5)
E0 = SB['end']
iE, nE = place('09', 89 - (kof(DUR) - E0) / 4, E0, kof(DUR) + 1.9, g09, fin=2.0, fout=1.5, pre=2 * BEAT)
level_ride(iE, int((bt(LBk['end'][-1]) - iE / SR) * SR), 4.0, 9.0)   # 最后一句之后让它自然收尾

# ---------------- 音效 ----------------
tt = lambda d: np.arange(int(d * SR)) / SR
def lp(x, fc): return sosfilt(butter(2, fc / (SR / 2), 'low', output='sos'), x)
def hp(x, fc): return sosfilt(butter(2, fc / (SR / 2), 'high', output='sos'), x)
def bp(x, a, b): return sosfilt(butter(2, [a / (SR / 2), b / (SR / 2)], 'band', output='sos'), x)
def addS(sig, t, pan=0.0, gdb=0.0):
    i = int(t * SR)
    if i < 0: sig = sig[-i:]; i = 0
    j = min(N, i + len(sig)); x = sig[:j - i] * db(gdb)
    SFX[i:j, 0] += x * np.sqrt(0.5 * (1 - pan)); SFX[i:j, 1] += x * np.sqrt(0.5 * (1 + pan))
def boom(d=4.0):
    t = tt(d); x = np.sin(2 * np.pi * np.cumsum(36 + 50 * np.exp(-t * 3)) / SR) * np.exp(-t * 1.1) + 0.4 * lp(rng.standard_normal(len(t)), 500) * np.exp(-t * 2.2)
    return np.tanh(1.2 * x) * np.minimum(1, t / 0.004)
def kick(v=1.0, low=44):
    t = tt(0.45); x = np.sin(2 * np.pi * np.cumsum(low + 110 * np.exp(-t * 28)) / SR) * np.exp(-t * 7.5) + 0.3 * hp(rng.standard_normal(len(t)), 2000) * np.exp(-t * 200)
    return np.tanh(1.6 * x) * v
def riser(d):
    t = tt(d); k = t / d; nz = rng.standard_normal(len(t)); out = np.zeros_like(t); seg = int(0.05 * SR)
    for i in range(0, len(t), seg):
        fc = 300 * 20 ** k[i]; c = bp(nz[max(0, i - 2000):i + seg], fc * 0.7, min(fc * 1.4, 20000))
        out[i:i + seg] = c[-len(out[i:i + seg]):]
    return (out + 0.3 * np.sin(2 * np.pi * np.cumsum(120 * 8 ** k) / SR)) * k ** 2
def revswell(d): t = tt(d); return hp(rng.standard_normal(len(t)), 1500) * (t / d) ** 3
def whoosh(d=0.6): t = tt(d); return bp(rng.standard_normal(len(t)), 400, 5000) * np.sin(np.pi * t / d) ** 2
def bell(f, d=3.0): t = tt(d); return (np.sin(2 * np.pi * f * t) * np.exp(-t * 2) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 5)) * np.minimum(1, t / 0.002)
def heartbeat(v=0.7):
    a = kick(v, 40); b = kick(v * 0.6, 38); o = np.zeros(int(0.8 * SR)); o[:len(a)] += a; s = int(0.24 * SR); o[s:s + len(b)] += b; return o
def pad(freqs, d, att=2.0, rel=2.0, fc=1100):
    t = tt(d + rel); x = sum((2 * ((f * (1 + dt) * t + rng.random()) % 1) - 1) for f in freqs for dt in (-0.004, 0, 0.004)) / (3 * len(freqs))
    return lp(x, fc) * np.minimum(1, t / att) * np.where(t > d, np.maximum(0, 1 - (t - d) / rel), 1)
hz = lambda m: 440 * 2 ** ((m - 69) / 12)

addS(boom(), bt(0), gdb=-7)
# 倒带
addS(whoosh(BEAT * 3), bt(L1), gdb=-8)
TICK = [np.sin(2 * np.pi * (2300 + 40 * i) * tt(0.03)) * np.exp(-tt(0.03) * 140) for i in range(8)]
for i in range(14): addS(TICK[i % 8], bt(L1) + 0.08 + i * 0.1 * (1 - i / 22), pan=rng.uniform(-0.6, 0.6), gdb=-24)
# 混乱段：悬浮铺底（无拍）
addS(pad([hz(m) for m in (50, 52, 57, 64, 69)], (L4 - L1 - 3) * BEAT, 3.0, 1.5), bt(L1 + 3), gdb=-15)
addS(np.sin(2 * np.pi * hz(38) * tt((L4 - L1 - 3) * BEAT)) * np.minimum(1, tt((L4 - L1 - 3) * BEAT) / 2), bt(L1 + 3), gdb=-24)
addS(riser(6 * BEAT), bt(L4), gdb=-12)
addS(boom(), bt(LOCK), gdb=-8)
addS(revswell(4 * BEAT), bt(SB['title']), gdb=-13)
# 06 自带的两小节停顿：低音铺底 + 反向吸气，"答案是"那一拍落下
QA = SB['answer']
addS(pad([hz(m) for m in (45, 52, 57, 64)], 7 * BEAT, 1.2, 1.0), bt(QA - 8), gdb=-17)
addS(revswell(6 * BEAT), bt(QA - 6), gdb=-11); addS(riser(6 * BEAT), bt(QA - 6), gdb=-15); addS(boom(), bt(QA), gdb=-10)
# 声音标识（1 秒）：暖金色的两声铃 + 闪光沙音，每期固定
def sonic_logo(t0):
    n = int(1.2 * SR); tt_ = np.arange(n) / SR
    sh = hp(rng.standard_normal(n), 6000) * np.exp(-tt_ * 3.5) * np.minimum(1, tt_ / 0.25)
    addS(sh, t0, gdb=-22)
    addS(bell(hz(74), 3.0), t0, gdb=-12); addS(bell(hz(81), 3.0), t0 + 0.18, gdb=-13); addS(bell(hz(86), 3.0), t0 + 0.36, gdb=-17)
    addS(np.sin(2 * np.pi * hz(50) * tt(1.6)) * np.exp(-tt(1.6) * 2.5) * np.minimum(1, tt(1.6) / 0.02), t0, gdb=-14)
sonic_logo(bt(SB['title']))
addS(boom(4.5), bt(SB['title'] + 4), gdb=-5)
# 画面里的节拍器 / 钟声 / 脚步（来自渲染事件）
TOCK = [np.sin(2 * np.pi * f * tt(0.09)) * np.exp(-tt(0.09) * 55) for f in (820, 1040)]
DTF = 1 / 30
def _clap():
    n = int(0.06 * SR); t = np.arange(n) / SR; lo = rng.uniform(700, 1300); hi = rng.uniform(2800, 5500)
    x = bp(rng.standard_normal(n), lo, hi) * np.exp(-t * rng.uniform(120, 200)); x[:int(0.001 * SR)] *= np.linspace(0, 1, int(0.001 * SR)); return x
CLAPS = [_clap() for _ in range(48)]
for (tm, ty, v, ex) in EV:
    if ty == 'tick':
        if bt(L1) - 0.05 <= tm < bt(L1 + 3): continue
        tq = bt(kof(tm)) if v >= 10 else tm
        addS(TICK[rng.integers(8)], tq, pan=rng.uniform(-0.6, 0.6), gdb=-27 + 10 * np.log10(min(16, v)))
    elif ty == 'clock':
        tq = bt(kof(tm)) if (tm > bt(LBk['huygens'][4]) and abs(tm - bt(kof(tm))) < 0.13) else tm
        addS(TOCK[int(ex)], tq, pan=-0.45 if ex == 0 else 0.45, gdb=-23)
    elif ty == 'step': addS(kick(0.5, 70)[:int(0.15 * SR)], tm, gdb=-30 + 10 * np.log10(max(1, v * 300) / 10))
    elif ty == 'foot': addS(kick(0.5, 90)[:int(0.12 * SR)], tm, pan=-0.2 if ex == 0 else 0.2, gdb=-24)
    elif ty == 'clap':
        aEnd = T['secs']['applause'][1]
        fade = min(1.0, max(0.0, (aEnd + 0.3 - tm) / 0.8))
        for _ in range(int(v)):
            jit = rng.uniform(-0.012, 0.02) if ex > 0.6 else rng.uniform(0, DTF)
            addS(CLAPS[rng.integers(len(CLAPS))] * rng.uniform(0.5, 1.0) * fade, tm + jit, pan=rng.uniform(-0.8, 0.8), gdb=-31)
KKs = [kof(e[0]) for e in EV if e[1] == 'kick']
if KKs: addS(boom(3.0), bt(KKs[0]), gdb=-12)
# 仓本：临界值上升 → 鼓组进
K3, K4 = LBk['kuramoto'][3], LBk['kuramoto'][4]
addS(riser((K4 - K3) * BEAT), bt(K3), gdb=-12); addS(boom(), bt(K4), gdb=-10)
addS(revswell(2 * BEAT), bt(K4 - 18), gdb=-12)   # 06 收尾到 03 进来之间吸一口气
# 视交叉上核：穿越 → 到达 → 心跳
z0 = max(LBk['scn'][1] + 2, S2 - 4)
addS(riser((S2 - z0) * BEAT), bt(z0), gdb=-9); addS(whoosh((S2 - z0) * BEAT), bt(z0), gdb=-10); addS(boom(), bt(S2), gdb=-7)
for k in range(S2, SE['scn'], 4): addS(heartbeat(0.8), bt(k), gdb=-6 if k < S4 else -9)
# 千禧桥关闭：重击 + 静音 → 吸气进电网
addS(boom(4.5), bt(CLOSE), gdb=-3); addS(kick(1.0, 38), bt(CLOSE), gdb=-4)
addS(revswell(3 * BEAT), bt(SB['grid'] - 3), gdb=-12)
# 电网嗡鸣 + 扰动
t = tt((SB['cost'] - SB['grid']) * BEAT); hum = (np.sin(2 * np.pi * 100 * t) + 0.5 * np.sin(2 * np.pi * 200 * t)) * np.minimum(1, t / 2) * np.minimum(1, (t[-1] - t) / 1.5)
addS(hum, bt(SB['grid']), gdb=-30)
if len(KKs) > 1: addS(boom(3.0), bt(KKs[-1]), gdb=-11)
# 癫痫：两拍一次重击，叠在 drop 上
C2, C3 = LBk['cost'][2], LBk['cost'][3]
for k in range(C2, C3, 2): addS(np.tanh(3 * boom(1.0)), bt(k), gdb=-10); addS(kick(1.0, 38), bt(k), gdb=-8)
# 结尾：“你只需要，听见彼此” / 片尾
E5 = LBk['end'][-1]; O = kof(T['secs']['outro'][0])
addS(revswell(2 * BEAT), bt(E5 - 2), gdb=-16); addS(boom(), bt(E5), gdb=-14); addS(bell(hz(77), 4), bt(E5), gdb=-20)
addS(boom(), bt(O), gdb=-12); addS(bell(hz(77), 5), bt(O), gdb=-19); addS(bell(hz(84), 5), bt(O) + 0.02, gdb=-23)
# 切场轻扫
for (tm, ty, v, ex) in EV:
    if ty == 'cut': addS(whoosh(0.5), tm - 0.25, gdb=-22)

# 音效加一点混响
tI = tt(2.2); ir = np.stack([rng.standard_normal(len(tI)) * np.exp(-tI * 2.8) for _ in range(2)], 1); ir = np.stack([lp(ir[:, c], 5000) for c in range(2)], 1); ir /= np.sqrt((ir ** 2).sum(0))
wet = np.stack([oaconvolve(SFX[:, c], ir[:, c])[:N] for c in range(2)], 1)
OUT = MUS + SFX + 0.25 * wet
fo = int(1.2 * SR); OUT[-fo:] *= np.linspace(1, 0, fo)[:, None]
OUT = np.tanh(OUT / max(1e-9, np.abs(OUT).max()) * 1.15) / np.tanh(1.15) * 0.95
sf.write(os.path.join(BASE, 'build', 'mix.wav'), OUT.astype(np.float32), SR)
print('gains 01/06/03/09:', round(g01, 1), round(g06, 1), round(g03, 1), round(g09, 1), ' dur', round(DUR, 2))
