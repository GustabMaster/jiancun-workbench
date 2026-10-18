from PIL import Image, ImageDraw

TEAL = (15, 118, 110, 255)      # #0f766e 背景
LIGHT = (255, 255, 255, 255)    # 锁体白色

def make(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # 实底圆角背景
    d.rounded_rectangle([0, 0, size, size], radius=int(size*0.22), fill=TEAL)
    s = size
    # 锁体（白色圆角矩形）
    bx0, bx1 = s*0.27, s*0.73
    by0, by1 = s*0.45, s*0.87
    d.rounded_rectangle([bx0, by0, bx1, by1], radius=int(s*0.10), fill=LIGHT)
    # 锁梁（上半圆弧，白色描边）
    cx = s*0.5
    arc_r = s*0.155
    cy = by0
    lw = max(2, int(s*0.085))
    d.arc([cx-arc_r, cy-arc_r, cx+arc_r, cy+arc_r], start=180, end=360, fill=LIGHT, width=lw)
    # 钥匙孔（用背景色打孔：圆 + 竖槽）
    kh = s*0.125
    kx, ky = cx, by0 + (by1-by0)*0.42
    d.ellipse([kx-kh*0.34, ky-kh*0.34, kx+kh*0.34, ky+kh*0.34], fill=TEAL)
    slot_w = max(2, int(s*0.045))
    d.rectangle([kx-slot_w/2, ky, kx+slot_w/2, by1-s*0.07], fill=TEAL)
    return img

for sz in (192, 512):
    make(sz).save(f"icon-{sz}.png")
    print("wrote icon-%d.png" % sz)
