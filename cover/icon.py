# 头像同款放大镜（按头像实测比例）：环宽 0.24R，手柄宽 0.33R、末端 2.14R（含圆头），四角星臂长 0.51R、内凹
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import math
RING = (254, 178, 70)
def star_path(cx, cy, L, k=0.0, n=24):
    pts = []
    tips = [(cx, cy - L), (cx + L, cy), (cx, cy + L), (cx - L, cy)]
    for i in range(4):
        p0 = tips[i]; p2 = tips[(i + 1) % 4]
        c = (cx + (p0[0] - cx + p2[0] - cx) * k, cy + (p0[1] - cy + p2[1] - cy) * k)   # 控制点靠近中心 → 内凹
        for j in range(n):
            t = j / n; pts.append(((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p2[1]))
    return pts
def magnifier_icon(im, cx, cy, R, glow=True):
    W, H = im.size; S = 4
    rw, hw, hend, L = 0.24 * R, 0.33 * R, 2.14 * R, 0.51 * R
    lay = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    X, Y = cx * S, cy * S
    d.ellipse((X - (R + rw / 2) * S, Y - (R + rw / 2) * S, X + (R + rw / 2) * S, Y + (R + rw / 2) * S), outline=RING + (255,), width=int(rw * S))
    u = 1 / math.sqrt(2); a0 = (X + R * u * S, Y + R * u * S); a1 = (X + (hend - hw / 2) * u * S, Y + (hend - hw / 2) * u * S)
    d.line((a0, a1), fill=RING + (255,), width=int(hw * S)); rr = hw / 2 * S
    d.ellipse((a1[0] - rr, a1[1] - rr, a1[0] + rr, a1[1] + rr), fill=RING + (255,))
    lay = lay.resize((W, H), Image.LANCZOS)
    if glow:   # 镜片暖光
        gl = Image.new('L', (W, H)); ImageDraw.Draw(gl).ellipse((cx - R * 0.62, cy - R * 0.62, cx + R * 0.62, cy + R * 0.62), fill=190)
        gl = gl.filter(ImageFilter.GaussianBlur(R * 0.24))
        im.paste(ImageChops.add(im, ImageChops.multiply(Image.new('RGB', (W, H), (250, 165, 65)), Image.merge('RGB', [gl] * 3))))
    st = Image.new('L', (W * S, H * S)); sd = ImageDraw.Draw(st); w = 0.21 * L
    sd.polygon([((cx) * S, (cy - L) * S), ((cx + w) * S, cy * S), (cx * S, (cy + L) * S), ((cx - w) * S, cy * S)], fill=255)
    sd.polygon([((cx - L) * S, cy * S), (cx * S, (cy - w) * S), ((cx + L) * S, cy * S), (cx * S, (cy + w) * S)], fill=255)
    st = st.resize((W, H), Image.LANCZOS)
    sg = st.filter(ImageFilter.GaussianBlur(max(1, R * 0.05))).point(lambda v: int(v * 0.6))
    im.paste(ImageChops.add(im, ImageChops.multiply(Image.new('RGB', (W, H), (255, 214, 140)), Image.merge('RGB', [sg] * 3))))
    im.paste(Image.new('RGB', (W, H), (255, 251, 240)), (0, 0), st)
    im.paste(lay.convert('RGB'), (0, 0), lay.split()[3])
if __name__ == '__main__':
    im = Image.new('RGB', (300, 300), (22, 35, 72)); magnifier_icon(im, 134.2, 131.3, 69)
    im.save('icon_preview.png')
