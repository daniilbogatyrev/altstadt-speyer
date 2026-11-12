#!/usr/bin/env python3
"""Builds the four language pages (site/index.html, site/en|fr|it/index.html), sitemap.xml, robots.txt and the
social preview image from src/index.html (German source with data-i18n attributes) and site/js/i18n.js.

Settings in tools/seo.json:
  site_url   public address without trailing slash (change here when the real domain is live)
  indexable  false = preview: noindex + robots Disallow; true = live
Run from anywhere:  python3 tools/build-lang.py"""
import json
import re
import subprocess
from pathlib import Path

from bs4 import BeautifulSoup

root = Path(__file__).resolve().parent.parent
cfg = json.loads((root / "tools/seo.json").read_text(encoding="utf-8"))
SITE = cfg["site_url"].rstrip("/")
INDEXABLE = bool(cfg["indexable"])
LANGS = ["de", "en", "fr", "it"]
LOCALE = {"de": "de_DE", "en": "en_GB", "fr": "fr_FR", "it": "it_IT"}
BOOKING_BASE = "https://www.booking.com/hotel/de/altstadt-speyer."
BOOKING_QUERY = "?group_adults=2&group_children=0&no_rooms=1"


def node_json(js: str) -> dict:
    code = "global.window={};require(%s);console.log(JSON.stringify(%s))" % (json.dumps(str(root / js[0])), js[1])
    return json.loads(subprocess.check_output(["node", "-e", code], text=True))


I18N = node_json(("site/js/i18n.js", "window.I18N"))
REV = node_json(("site/js/reviews-config.js", "window.REVIEWS"))
LEGAL = json.loads((root / "legal/legal.json").read_text(encoding="utf-8"))["operator"]


def url(lang: str) -> str:
    return f"{SITE}/" if lang == "de" else f"{SITE}/{lang}/"


def fill(v: str, lang: str) -> str:
    score = str(REV.get("score", ""))
    if lang == "en":
        score = score.replace(",", ".")
    return v.replace("{score}", score).replace("{count}", str(REV.get("count", "")))


def head_block(lang: str, d: dict) -> str:
    title, desc = d["_title"], d["_desc"]
    e = lambda x: x.replace("&", "&amp;").replace('"', "&quot;")
    out = []
    if not INDEXABLE:
        out.append('<meta name="robots" content="noindex, nofollow">')
    out.append(f'<link rel="canonical" href="{url(lang)}">')
    for l in LANGS:
        out.append(f'<link rel="alternate" hreflang="{l}" href="{url(l)}">')
    out.append(f'<link rel="alternate" hreflang="x-default" href="{url("de")}">')
    out += [
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="FeWo Altstadt Speyer">',
        f'<meta property="og:locale" content="{LOCALE[lang]}">',
        f'<meta property="og:title" content="{e(title)}">',
        f'<meta property="og:description" content="{e(desc)}">',
        f'<meta property="og:url" content="{url(lang)}">',
        f'<meta property="og:image" content="{SITE}/img/og.jpg">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{e(title)}">',
        f'<meta name="twitter:description" content="{e(desc)}">',
        f'<meta name="twitter:image" content="{SITE}/img/og.jpg">',
    ]
    score = str(REV.get("score", "")).replace(",", ".")
    ld = {
        "@context": "https://schema.org",
        "@type": "VacationRental",
        "name": "FeWo Altstadt Speyer",
        "description": desc,
        "url": url(lang),
        "inLanguage": lang,
        "address": {"@type": "PostalAddress", "streetAddress": "Holzmarkt 4", "postalCode": "67346",
                    "addressLocality": "Speyer", "addressCountry": "DE"},
        "image": [f"{SITE}/img/{p}.webp" for p in ("hof/01", "wohnen/01", "schlafen/01", "wohnen/12")],
        "telephone": LEGAL.get("phone", ""),
        "email": LEGAL.get("email", ""),
        "checkinTime": "16:00",
        "checkoutTime": "10:00",
        "petsAllowed": None,
        "containsPlace": [
            {"@type": "Accommodation", "name": "Superior Apartment", "numberOfRooms": 1,
             "occupancy": {"@type": "QuantitativeValue", "maxValue": 2},
             "bed": {"@type": "BedDetails", "numberOfBeds": 1, "typeOfBed": "Double bed"}},
            {"@type": "Accommodation", "name": "Deluxe Apartment", "numberOfRooms": 1,
             "occupancy": {"@type": "QuantitativeValue", "maxValue": 2},
             "bed": [{"@type": "BedDetails", "numberOfBeds": 1, "typeOfBed": "Double bed"},
                     {"@type": "BedDetails", "numberOfBeds": 1, "typeOfBed": "Sofa bed"}]},
        ],
        "amenityFeature": [
            {"@type": "LocationFeatureSpecification", "name": "Kitchen", "value": True},
            {"@type": "LocationFeatureSpecification", "name": "Free WiFi", "value": True},
            {"@type": "LocationFeatureSpecification", "name": "Garage", "value": True},
        ],
        "sameAs": [BOOKING_BASE + "de.html"],
    }
    del ld["petsAllowed"]
    if score and REV.get("count"):
        ld["aggregateRating"] = {"@type": "AggregateRating", "ratingValue": score, "bestRating": "10",
                                 "worstRating": "1", "ratingCount": str(REV["count"])}
    ld = {k: v for k, v in ld.items() if v not in ("", None)}
    out.append('<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + "</script>")
    return "\n  ".join(out)


def build(lang: str) -> str:
    d = I18N[lang]
    soup = BeautifulSoup((root / "src/index.html").read_text(encoding="utf-8"), "html.parser")
    html = soup.html
    html["lang"] = lang
    soup.title.string = d["_title"]
    soup.find("meta", attrs={"name": "description"})["content"] = d["_desc"]
    # every relative URL resolves against the site root, also on /en/ etc.
    soup.head.find("meta", charset=True).insert_after(soup.new_tag("base", href="/"))
    # SEO block (comment marker)
    marker = next(c for c in soup.head.children if getattr(c, "string", None) == "SEO" and type(c).__name__ == "Comment")
    marker.replace_with(BeautifulSoup("<!--seo-->\n  " + head_block(lang, d) + "\n  <!--/seo-->", "html.parser"))

    for el in soup.select("[data-i18n]"):
        v = d.get(el["data-i18n"])
        if v is not None:
            el.string = fill(v, lang)
    for el in soup.select("[data-i18n-html]"):
        v = d.get(el["data-i18n-html"])
        if v is not None:
            el.clear()
            el.append(BeautifulSoup(v, "html.parser"))
    for el in soup.select("[data-i18n-aria]"):
        v = d.get(el["data-i18n-aria"])
        if v is not None:
            el["aria-label"] = v
    for el in soup.select("[data-i18n-alt]"):
        v = d.get(el["data-i18n-alt"])
        if v is not None:
            el["alt"] = v
    for el in soup.select("[data-rv=score]"):
        el.string = fill("{score}", lang)
    book = BOOKING_BASE + d["_booking"] + ".html" + BOOKING_QUERY
    for a in soup.select(".js-book"):
        a["href"] = book
    suffix = "" if lang == "de" else "-en"
    for a in soup.select("[data-legal]"):
        a["href"] = a["data-legal"] + suffix + ".html"
    for a in soup.select("a[data-lang]"):
        a["href"] = "/" if a["data-lang"] == "de" else "/" + a["data-lang"] + "/"
        a["aria-current"] = "true" if a["data-lang"] == lang else "false"
    # in-page links: with <base href="/"> a bare "#x" would point to the German page
    if lang != "de":
        for a in soup.find_all("a", href=re.compile(r"^#.")):
            a["href"] = f"/{lang}/" + a["href"]
    return str(soup)


def write(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


for lang in LANGS:
    write(root / "site" / ("index.html" if lang == "de" else f"{lang}/index.html"), build(lang))

# sitemap + robots
alts = "\n".join(f'    <xhtml:link rel="alternate" hreflang="{l}" href="{url(l)}"/>' for l in LANGS)
alts += f'\n    <xhtml:link rel="alternate" hreflang="x-default" href="{url("de")}"/>'
urls = "\n".join(f"  <url>\n    <loc>{url(l)}</loc>\n{alts}\n  </url>" for l in LANGS)
write(root / "site/sitemap.xml",
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
      'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + urls + "\n</urlset>\n")
write(root / "site/robots.txt",
      ("User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n" % SITE) if INDEXABLE
      else "User-agent: *\nDisallow: /\n")

# social preview image 1200x630 (photo only, no text)
try:
    from PIL import Image
    im = Image.open(root / "site/img/hof/01.webp").convert("RGB")
    w, h = im.size
    th = round(w * 630 / 1200)
    top = max(0, (h - th) // 2)
    im.crop((0, top, w, top + min(th, h))).resize((1200, 630), Image.LANCZOS).save(
        root / "site/img/og.jpg", quality=84, optimize=True, progressive=True)
except ImportError:
    print("Pillow missing: og.jpg not created")
print("language pages, sitemap, robots, og.jpg written; site_url =", SITE, "| indexable =", INDEXABLE)
