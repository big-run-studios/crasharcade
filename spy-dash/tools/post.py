#!/usr/bin/env python3
"""post.py result.png base.png [cropInner]
Alpha-mask an image-to-image result using its own guide: any near-white pixel in the
guide was padding by construction, so it becomes transparent in the result.
Optional cropInner (0..1) center-crops to that fraction first (for full-bleed textures
the model insists on framing)."""
import sys
from PIL import Image, ImageChops, ImageFilter

res = Image.open(sys.argv[1]).convert('RGBA')
base = Image.open(sys.argv[2]).convert('RGB')
crop = float(sys.argv[3]) if len(sys.argv) > 3 else 0

if base.size != res.size:
    base = base.resize(res.size)

if crop:
    w, h = res.size
    m = (1 - crop) / 2
    res = res.crop((int(w * m), int(h * m), int(w * (1 - m)), int(h * (1 - m))))
else:
    white = Image.new('RGB', base.size, (255, 255, 255))
    guide_mask = ImageChops.difference(base, white).convert('L').point(lambda v: 255 if v > 18 else 0)
    # intersect with "result itself isn't near-white" — kills pale haze the model
    # paints inside the guide region when its object comes out smaller than the guide
    res_rgb = res.convert('RGB')
    res_mask = ImageChops.difference(res_rgb, white).convert('L').point(lambda v: 255 if v > 14 else 0)
    mask = ImageChops.multiply(guide_mask, res_mask).filter(ImageFilter.GaussianBlur(1))
    res.putalpha(mask)

res.save(sys.argv[1])
print('post ✓', sys.argv[1], res.size)
