#!/usr/bin/env python3
"""Phase-2 structural guides: the interactive event set-pieces."""
import os, random
from PIL import Image, ImageDraw

random.seed(11)
OUT = os.path.join(os.path.dirname(__file__), 'bases')
os.makedirs(OUT, exist_ok=True)

DOOR_BODY = (35, 43, 88)     # #232b58
DOOR_PANEL = (47, 58, 112)   # #2f3a70
DUCT = (28, 36, 80)          # #1c2450
DUCT_DK = (18, 24, 58)
TUNNEL = (6, 10, 34)         # #060a22
STEP = (35, 45, 94)          # #232d5e
STEP_DK = (26, 35, 80)       # #1a2350
MOUND = (40, 50, 94)
MOUND_LT = (51, 63, 116)
WALLCAP = (28, 36, 80)
GLASS = (12, 20, 60)
SHEEN = (60, 80, 140)
FRAME = (150, 165, 215)
WHITE = (255, 255, 255)

def save(img, name):
    img.save(os.path.join(OUT, name)); print('wrote', name, img.size)

# ---- locked door: full-bleed 128×896 (30×224 logical) ----
W, H = 128, 896
img = Image.new('RGB', (W, H), DOOR_BODY); d = ImageDraw.Draw(img)
d.rectangle([16, 40, W - 16, H - 48], fill=DOOR_PANEL)
d.rectangle([26, 60, W - 26, H // 2 - 40], fill=DOOR_BODY)          # upper inset
d.rectangle([26, H // 2 + 10, W - 26, H - 80], fill=DOOR_BODY)      # lower inset
d.rectangle([36, H - 384, 92, H - 354], fill=(70, 84, 150))         # keypad
d.rectangle([36, H - 344, 92, H - 314], fill=(70, 84, 150))
save(img, 'door-locked.png')

# ---- blasted door: cutout — twisted frame posts + debris ----
img = Image.new('RGB', (W, H), WHITE); d = ImageDraw.Draw(img)
d.polygon([(0, 0), (30, 0), (36, 300), (24, 560), (34, 896), (0, 896)], fill=DOOR_BODY)
d.polygon([(W, 0), (W - 28, 0), (W - 36, 260), (W - 22, 620), (W - 32, 896), (W, 896)], fill=DOOR_BODY)
d.polygon([(34, 700), (70, 640), (96, 720), (60, 780)], fill=DOOR_PANEL)     # blown panel shard
d.polygon([(40, 840), (86, 800), (100, 896), (30, 896)], fill=DUCT_DK)       # rubble at base
save(img, 'door-blasted.png')

# ---- vent duct cap (160×896 = 40×224) & mid tile (256×896 = 64×224) ----
# high contrast: lighter metal duct body vs near-black crawl tunnel, bright grille slats
VDUCT = (44, 56, 118)
VDUCT_LT = (66, 82, 158)
VTUNNEL = (3, 5, 16)
for name, W2 in [('vent-cap.png', 160), ('vent-mid.png', 256)]:
    img = Image.new('RGB', (W2, 896), VDUCT); d = ImageDraw.Draw(img)
    tunnel_top = 896 - 256                                           # 64 logical crawl mouth
    d.rectangle([0, tunnel_top, W2, 896], fill=VTUNNEL)
    d.rectangle([0, tunnel_top - 30, W2, tunnel_top], fill=VDUCT_LT) # bright duct lip over the mouth
    d.rectangle([0, 40, W2, 70], fill=VDUCT_LT)                      # top seam band
    for ry in range(140, tunnel_top - 100, 170):                     # horizontal grille vents on the body
        d.rectangle([20, ry, W2 - 20, ry + 60], fill=DUCT_DK)
        for gy in range(ry + 10, ry + 56, 16):
            d.rectangle([26, gy, W2 - 26, gy + 6], fill=VDUCT_LT)
    for rx in range(24, W2 - 12, 84):                                # rivet columns
        for ry in range(90, tunnel_top - 60, 120):
            d.ellipse([rx, ry, rx + 10, ry + 10], fill=(96, 118, 200))
    if name == 'vent-cap.png':                                       # bright slatted mouth frame
        d.rectangle([0, tunnel_top - 8, 44, 896], fill=(80, 110, 190))
        for sy in range(tunnel_top + 24, 880, 54):
            d.rectangle([8, sy, 36, sy + 18], fill=(140, 210, 255))
    save(img, name)

# ---- staircase: cutout, ascending left→right, 1240×1000 (310×250) ----
W3, H3 = 1240, 1000
img = Image.new('RGB', (W3, H3), WHITE); d = ImageDraw.Draw(img)
n, sw, sh = 8, W3 // 8, H3 // 8
for i in range(n):
    x0, y0 = i * sw, H3 - (i + 1) * sh
    d.rectangle([x0, y0, W3, H3], fill=STEP_DK)                      # mass under
    d.rectangle([x0, y0, x0 + sw, y0 + sh], fill=STEP)               # the step block
    d.rectangle([x0, y0, x0 + sw, y0 + 14], fill=MOUND_LT)           # tread nose
save(img, 'staircase.png')

# ---- grapple rubble ramp: cutout, rises to the right wall, 520×384 (130×96) ----
W4, H4 = 520, 384
img = Image.new('RGB', (W4, H4), WHITE); d = ImageDraw.Draw(img)
d.polygon([(10, H4), (150, H4 - 130), (330, H4 - 300), (W4, H4 - 370), (W4, H4)], fill=MOUND)
for (bx, by, bw2, bh) in [(90, H4 - 90, 110, 50), (220, H4 - 190, 120, 60), (360, H4 - 300, 120, 70), (150, H4 - 40, 160, 40)]:
    d.rectangle([bx, by, bx + bw2, by + bh], fill=MOUND_LT)
save(img, 'grapple-ramp.png')

# ---- dive window: full-bleed wall cap w/ tall pane, 136×896 (34×224) ----
W5, H5 = 136, 896
img = Image.new('RGB', (W5, H5), WALLCAP); d = ImageDraw.Draw(img)
d.rectangle([14, 64, W5 - 14, H5 - 96], fill=GLASS)
d.rectangle([8, 56, W5 - 8, 72], fill=FRAME); d.rectangle([8, H5 - 104, W5 - 8, H5 - 88], fill=FRAME)
d.rectangle([8, 56, 20, H5 - 88], fill=FRAME); d.rectangle([W5 - 20, 56, W5 - 8, H5 - 88], fill=FRAME)
for i in range(3):                                                   # glass sheen diagonals
    y = 250 + i * 180
    d.line([(24, y + 90), (W5 - 24, y)], fill=SHEEN, width=8)
save(img, 'dive-window.png')

# ---- dive window shattered: white hole = transparent, glass teeth kept ----
img = Image.new('RGB', (W5, H5), WALLCAP); d = ImageDraw.Draw(img)
d.rectangle([14, 64, W5 - 14, H5 - 96], fill=GLASS)
d.rectangle([8, 56, W5 - 8, 72], fill=FRAME); d.rectangle([8, H5 - 104, W5 - 8, H5 - 88], fill=FRAME)
d.rectangle([8, 56, 20, H5 - 88], fill=FRAME); d.rectangle([W5 - 20, 56, W5 - 8, H5 - 88], fill=FRAME)
d.polygon([(24, 180), (W5 - 24, 220), (W5 - 30, 700), (30, 660)], fill=WHITE)   # blown-out hole
for (tx, ty, tx2, ty2, tx3, ty3) in [                                          # glass teeth
    (24, 180, 60, 190, 24, 300), (W5 - 24, 220, W5 - 60, 240, W5 - 24, 360),
    (30, 660, 70, 640, 30, 520), (W5 - 30, 700, W5 - 66, 660, W5 - 30, 560)]:
    d.polygon([(tx, ty), (tx2, ty2), (tx3, ty3)], fill=GLASS)
save(img, 'dive-window-broken.png')

print('done')
