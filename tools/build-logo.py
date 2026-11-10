#!/usr/bin/env python3
"""Cuts the gold lettering out of logo/image.png (gold on navy) -> transparent PNGs in site/img/.
Usage: python3 tools/build-logo.py"""
import numpy as np
from PIL import Image
from pathlib import Path

root = Path(__file__).resolve().parent.parent
im = np.asarray(Image.open(root / "logo/image.png").convert("RGB")).astype(np.float64)

# background = median of the border pixels (navy)
border = np.concatenate([im[:12].reshape(-1, 3), im[-12:].reshape(-1, 3), im[:, :12].reshape(-1, 3), im[:, -12:].reshape(-1, 3)])
bg = np.median(border, axis=0)

# alpha from how far a pixel is from the background towards gold (gold is much brighter in R and G)
diff = (im[..., 0] - bg[0]) * 0.6 + (im[..., 1] - bg[1]) * 0.4
lo, hi = 14.0, 95.0
alpha = np.clip((diff - lo) / (hi - lo), 0, 1)

# un-premultiply so edges don't carry navy onto a white page
a = np.maximum(alpha, 1e-3)[..., None]
col = np.clip((im - (1 - a) * bg) / a, 0, 255)

def save(col, alpha, name, scale_h):
    rgba = np.dstack([col, alpha * 255]).astype(np.uint8)
    img = Image.fromarray(rgba, "RGBA")
    box = img.getbbox()
    pad = 6
    box = (max(box[0] - pad, 0), max(box[1] - pad, 0), min(box[2] + pad, img.width), min(box[3] + pad, img.height))
    img = img.crop(box)
    img.save(root / f"site/img/{name}.png", optimize=True)
    print(name, img.size)
    return img

logo = save(col, alpha, "logo", None)

# darker gold variant for contrast on white
dark = col * np.array([0.72, 0.62, 0.42])
save(dark, alpha, "logo-dark", None)

# icons: full logo on a navy tile (touch icon), the star alone for the small favicon
navy = tuple(int(x) for x in bg) + (255,)
def tile_of(img, pad):
    side = max(img.size) + pad * 2
    t = Image.new("RGBA", (side, side), navy)
    t.alpha_composite(img, ((side - img.width) // 2, (side - img.height) // 2))
    return t
tile_of(logo, 40).resize((180, 180), Image.LANCZOS).convert("RGB").save(root / "site/apple-touch-icon.png")
star = logo.crop((int(logo.width * 0.69), 0, int(logo.width * 0.815), int(logo.height * 0.235)))
star = star.crop(star.getbbox())
fav = tile_of(star, 10)
fav.resize((32, 32), Image.LANCZOS).save(root / "site/favicon-32.png")
fav.resize((48, 48), Image.LANCZOS).save(root / "site/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("bg", bg)
