#!/usr/bin/env python3
"""Self-hosts Instrument Sans (SIL OFL): downloads the TTFs from Google Fonts once, subsets them to Latin and writes
site/fonts/instrument-sans-{400,500,600}.woff2 + OFL.txt. Visitors never talk to Google.
Usage: python3 tools/build-fonts.py   (needs fonttools + brotli)"""
import re
import tempfile
import urllib.request
from pathlib import Path

from fontTools import subset

root = Path(__file__).resolve().parent.parent
out = root / "site/fonts"
out.mkdir(parents=True, exist_ok=True)

css = urllib.request.urlopen("https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&display=swap").read().decode()
faces = re.findall(r"font-weight:\s*(\d+);.*?src:\s*url\((https://fonts\.gstatic\.com/[^)]+\.ttf)\)", css, flags=re.S)
assert len(faces) == 3, faces

UNICODES = "U+0020-007E,U+00A0-00FF,U+0100-017F,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2013-2014,U+2018-201E,U+2022,U+2026,U+2039-203A,U+20AC,U+2190-2193,U+2197,U+2212"
with tempfile.TemporaryDirectory() as tmp:
    for weight, url in faces:
        ttf = Path(tmp) / f"{weight}.ttf"
        ttf.write_bytes(urllib.request.urlopen(url).read())
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["kern", "liga", "calt", "ccmp", "locl", "mark", "mkmk"]
        opts.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
        font = subset.load_font(str(ttf), opts)
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=subset.parse_unicodes(UNICODES))
        sub.subset(font)
        target = out / f"instrument-sans-{weight}.woff2"
        subset.save_font(font, str(target), opts)
        print(target.name, target.stat().st_size, "bytes")

ofl = urllib.request.urlopen("https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentsans/OFL.txt").read().decode()
(out / "OFL.txt").write_text(ofl, encoding="utf-8")
print("OFL.txt", len(ofl), "chars")
