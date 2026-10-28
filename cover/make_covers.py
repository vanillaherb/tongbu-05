# 按《江离个人IP方案》封面模板：近黑底 + 本期模拟一帧（压暗）+ 左上期数 + 居中两字概念和一句话 + 右下暖黄放大镜
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance, ImageChops
import numpy as np
import os
D = os.path.dirname(os.path.abspath(__file__)) + os.sep
FD = os.path.join(D, '..', 'fonts') + os.sep
OUT = os.path.join(D, '..', 'build', '封面') + os.sep
os.makedirs(OUT, exist_ok=True)
SERIF = FD + 'NotoSerifSC-Regular.otf'   # 思源宋体同源字形（Noto Serif CJK SC）
SERIF_M = FD + 'NotoSerifSC-Medium.otf'
NEAR_BLACK = (11, 12, 16); CREAM = (242, 240, 234); GREY = (140, 138, 131); WARM = (232, 163, 61)
def F(p, s): return ImageFont.truetype(p, s)
def cover_crop(img, W, H, cx=0.5, cy=0.5):
    s = max(W / img.width, H / img.height); im = img.resize((int(img.width * s), int(img.height * s)), Image.LANCZOS)
    x = int((im.width - W) * cx); y = int((im.height - H) * cy); return im.crop((x, y, x + W, y + H))
def spaced(im, s, xy, font, fill, sp, anchor='m', glow=0):
    W, H = im.size; m = Image.new('L', (W, H)); d = ImageDraw.Draw(m)
    ws = [d.textlength(c, font=font) for c in s]; tw = sum(ws) + sp * (len(s) - 1)
    x0 = xy[0] - tw / 2 if anchor == 'm' else xy[0]
    for c, w in zip(s, ws): d.text((x0, xy[1]), c, font=font, fill=255, anchor='lm'); x0 += w + sp
    if glow:
        g = m.filter(ImageFilter.GaussianBlur(glow)).point(lambda v: int(v * 0.35))
        im.paste(ImageChops.add(im, ImageChops.multiply(Image.new('RGB', (W, H), fill), Image.merge('RGB', [g] * 3))))
    im.paste(Image.new('RGB', (W, H), fill), (0, 0), m)
import sys
sys.path.insert(0, D)
from icon import magnifier_icon as magnifier

src = Image.open(D + 'bg_frame.png').convert('RGB').crop((60, 150, 1860, 1080))
def make(W, H, name, hook=False):
    u = min(W, H) / 1080 * (1.0 if W >= H else 1.0)
    bg = Image.new('RGB', (W, H), NEAR_BLACK)
    sim = cover_crop(src, W, H, 0.5, 0.62)
    sim = ImageEnhance.Color(sim, ).enhance(0.25); sim = ImageEnhance.Brightness(sim).enhance(0.42)
    yy, xx = np.mgrid[0:H, 0:W]
    r = np.sqrt(((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H * 0.5) / (H * 0.62)) ** 2)
    mask = np.clip((r - 0.28) / 0.5, 0, 1) * 0.9 + 0.1                       # 文字区更暗，四周露出模拟
    mask *= np.clip(1 - np.clip(r - 0.95, 0, 1) * 2, 0, 1)
    bg = Image.composite(sim, bg, Image.fromarray((mask * 255).astype(np.uint8)))
    arr = np.asarray(bg).astype(float); arr = arr * 0.85 + np.array(NEAR_BLACK) * 0.15
    bg = Image.fromarray(arr.astype(np.uint8))
    # 左上：系列名和期数
    m = int(90 * u)
    spaced(bg, '万物的原理 · 05', (m, int(96 * u)), F(SERIF, int(34 * u)), (200, 198, 192), int(10 * u), anchor='l')
    # 居中：两字概念 + 一句话
    cy = H * (0.47 if W >= H else 0.45)
    big = int((200 if W > H * 1.5 else 190) * u)
    spaced(bg, '同步', (W / 2, cy), F(SERIF, big), CREAM, int(big * 0.42), glow=int(big * 0.05))
    spaced(bg, '不约而同', (W / 2, cy + big * 0.78), F(SERIF, int(46 * u)), (214, 212, 206), int(26 * u))
    if hook:
        spaced(bg, '32个节拍器，没人碰，却打成了同一个拍子', (W / 2, H * (0.80 if H > W else 0.84)), F(SERIF, int(34 * u)), GREY, int(3 * u))
    # 右下：暖黄放大镜
    R = int(37 * u); ext = R * 1.56   # 手柄圆头在水平/竖直方向上到圆心的距离（图标总高约 2.68R ≈ 短边 9.1%）
    magnifier(bg, W - int(92 * u) - ext, H - int(85 * u) - ext, R)   # 与模板一致：占画面高约 9%，右距 4.8%、下距 7.9%
    bg.save(OUT + name, quality=95)

make(1920, 1080, '模板_B站_16x9.png')
make(1080, 1440, '模板_抖音_3x4.png'); make(1440, 1080, '模板_抖音_4x3.png')
make(1080, 1440, '模板_抖音_3x4_带钩子.png', hook=True); make(1440, 1080, '模板_抖音_4x3_带钩子.png', hook=True)
sh = Image.new('RGB', (960 + 450 + 600 + 40, 800 + 20), (28, 28, 32))
sh.paste(Image.open(OUT + '模板_B站_16x9.png').resize((960, 540)), (10, 10))
sh.paste(Image.open(OUT + '模板_抖音_3x4.png').resize((450, 600)), (980, 10))
sh.paste(Image.open(OUT + '模板_抖音_3x4_带钩子.png').resize((450, 600)), (1440, 10))
sh.paste(Image.open(OUT + '模板_抖音_4x3.png').resize((360, 270)), (10, 560)); sh.paste(Image.open(OUT + '模板_抖音_4x3_带钩子.png').resize((360, 270)), (380, 560))
sh.save(OUT + '封面对比.png'); print('ok')
