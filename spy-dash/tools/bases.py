#!/usr/bin/env python3
"""Draw flat structural guide images for Recraft image-to-image.
Framing/proportions are locked here; the model only re-skins the surfaces."""
import math, os, random
from PIL import Image, ImageDraw

random.seed(7)
OUT = os.path.join(os.path.dirname(__file__), 'bases')
os.makedirs(OUT, exist_ok=True)

NAVY_SLAB = (30, 40, 86)      # #1e2856
NAVY_WALL = (14, 19, 52)      # #0e1334
NAVY_DK   = (10, 14, 40)
NAVY_LT   = (51, 63, 116)     # #333f74
MOUND     = (40, 50, 94)      # #28325e
GOLD      = (255, 194, 51)
GOLD_CORE = (255, 242, 201)
FRAME     = (143, 160, 214)
GLASS     = (10, 14, 45)
WHITE     = (255, 255, 255)

def save(img, name):
    img.save(os.path.join(OUT, name))
    print('wrote', name, img.size)

# ---- floor slab: full-bleed wide strip, chipped bottom, seams ----
W, H = 2048, 256
img = Image.new('RGB', (W, H), WHITE)
d = ImageDraw.Draw(img)
top, bot = 28, H - 34
d.rectangle([0, top, W, bot], fill=NAVY_SLAB)
d.rectangle([0, top, W, top + 10], fill=NAVY_LT)                      # top face edge
# chipped bottom silhouette
x = 0
while x < W:
    w = random.randint(60, 200)
    bite = random.randint(0, 18)
    d.rectangle([x, bot - bite, x + w, bot + 34], fill=WHITE if bite else NAVY_SLAB)
    if bite: d.rectangle([x, bot - bite - 4, x + w, bot - bite], fill=NAVY_DK)
    x += w
# panel seams + cracks
for sx in range(340, W, 380):
    d.line([(sx, top), (sx, bot)], fill=NAVY_DK, width=6)
for _ in range(10):
    cx, cy = random.randint(40, W - 40), random.randint(top + 30, bot - 30)
    pts = [(cx, cy)]
    for _ in range(4):
        cx += random.randint(20, 70); cy += random.randint(-28, 28)
        pts.append((cx, cy))
    d.line(pts, fill=NAVY_DK, width=4)
save(img, 'floor-slab.png')

# ---- back wall: rectilinear panel grid — NO diagonals (they read as slanted walls) ----
S = 1024
img = Image.new('RGB', (S, S), NAVY_WALL)
d = ImageDraw.Draw(img)
for px_ in range(0, S, 256):                                          # vertical seams
    d.rectangle([px_ - 3, 0, px_ + 3, S], fill=NAVY_DK)
for py_ in range(0, S, 341):                                          # horizontal seams
    d.rectangle([0, py_ - 3, S, py_ + 3], fill=NAVY_DK)
for (gx, gy) in [(0, 0), (512, 341), (256, 682), (768, 0)]:           # a few tint-shifted panels
    d.rectangle([gx + 6, gy + 6, gx + 250, gy + 335], fill=(17, 23, 60))
for _ in range(6):                                                    # straight vertical hairline cracks w/ small jogs
    cx = random.randint(40, S - 40); cy = random.randint(20, S - 300)
    pts = [(cx, cy)]
    for _ in range(3):
        cy += random.randint(60, 120); cx += random.choice([-14, 0, 14])
        pts.append((cx, cy))
    d.line(pts, fill=NAVY_DK, width=4)
d.rectangle([0, S - 110, S, S], fill=(9, 12, 34))                     # grimy baseboard
save(img, 'back-wall.png')

# ---- intact window: flat guide (frame, mullions, dark panes, two lit dots) ----
W1, H1 = 384, 560
img = Image.new('RGB', (W1, H1), WHITE)
d = ImageDraw.Draw(img)
d.rectangle([6, 6, W1 - 6, H1 - 6], fill=(10, 14, 45), outline=FRAME, width=12)
d.rectangle([W1 // 2 - 5, 6, W1 // 2 + 5, H1 - 6], fill=FRAME)        # center mullion
for fy_ in (H1 // 3, 2 * H1 // 3):                                    # transom bars
    d.rectangle([6, fy_ - 5, W1 - 6, fy_ + 5], fill=FRAME)
d.rectangle([30, 40, W1 // 2 - 20, H1 // 3 - 20], fill=(16, 22, 62))  # one subtly lighter pane
d.rectangle([70, H1 // 2 + 30, 78, H1 // 2 + 38], fill=(255, 220, 120))   # tiny distant city lights
d.rectangle([W1 - 110, H1 - 160, W1 - 104, H1 - 154], fill=(180, 230, 255))
save(img, 'window-intact.png')

# ---- broken window: frame + crack web + missing shards ----
W2, H2 = 384, 560
img = Image.new('RGB', (W2, H2), WHITE)
d = ImageDraw.Draw(img)
d.rectangle([8, 8, W2 - 8, H2 - 8], fill=GLASS, outline=FRAME, width=10)
d.line([(W2 // 2, 8), (W2 // 2, H2 - 8)], fill=FRAME, width=8)        # mullion
cx, cy = W2 // 2 + 30, H2 // 2 - 40                                   # impact point
for a in range(8):                                                    # radial cracks
    ang = a * 0.785 + 0.3
    d.line([(cx, cy), (cx + 170 * math.cos(ang), cy + 220 * math.sin(ang))], fill=FRAME, width=3)
d.polygon([(cx, cy), (cx + 60, cy - 90), (cx + 120, cy - 30)], fill=WHITE)   # missing shards
d.polygon([(cx, cy), (cx - 80, cy + 60), (cx - 20, cy + 110)], fill=WHITE)
save(img, 'window-broken.png')

# ---- rubble pile: faceted knee-high mound + one rebar ----
S = 512
img = Image.new('RGB', (S, S), WHITE)
d = ImageDraw.Draw(img)
gy = S - 90
d.polygon([(70, gy), (150, gy - 150), (240, gy - 190), (330, gy - 130), (440, gy)], fill=MOUND)
d.polygon([(150, gy - 150), (240, gy - 190), (250, gy - 90), (170, gy - 60)], fill=NAVY_LT)  # facets
d.polygon([(250, gy - 90), (330, gy - 130), (380, gy - 40), (280, gy - 20)], fill=(35, 45, 94))
d.rectangle([120, gy - 40, 200, gy], fill=NAVY_LT)
d.rectangle([300, gy - 55, 380, gy], fill=MOUND)
d.line([(255, gy - 190), (285, gy - 280)], fill=(120, 130, 170), width=9)     # rebar
save(img, 'rubble-pile.png')

# ---- data chip: gold faceted diamond ----
S = 512
img = Image.new('RGB', (S, S), WHITE)
d = ImageDraw.Draw(img)
cx, cy, w, h = S // 2, S // 2, 170, 230
d.polygon([(cx, cy - h), (cx + w, cy), (cx, cy + h), (cx - w, cy)], fill=GOLD)
d.line([(cx, cy - h), (cx, cy + h)], fill=(230, 165, 30), width=6)            # facet ridge
d.polygon([(cx, cy - h // 2), (cx + w // 2, cy), (cx, cy + h // 2), (cx - w // 2, cy)], fill=GOLD_CORE)
save(img, 'data-chip.png')

print('done')
