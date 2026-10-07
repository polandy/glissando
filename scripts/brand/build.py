"""Builds the self-hosted Baloo 2 webfont and the outlined wordmark logos.

Run from the repo root:  scripts/brand/build.sh
Outputs are committed; this script only reruns when the font source or the logo changes.
"""

import hashlib
import io
import sys
import urllib.request
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

FONT_SOURCE_COMMIT = "8e0cd05881f3ae5e933ba4161103005a3e841ce0"
FONT_SOURCE_URL = (
    f"https://raw.githubusercontent.com/google/fonts/{FONT_SOURCE_COMMIT}/ofl/baloo2/"
)
FONT_FILE = "Baloo2%5Bwght%5D.ttf"
FONT_SHA256 = "d47a6852548059b1db49a1319d06d499d546c3fa2237cf9eee9c43c8abb025c2"
LICENSE_FILE = "OFL.txt"

UI_WEIGHT_RANGE = (600, 800)
WORDMARK_WEIGHT = 800
# Basic Latin, Latin-1 (German umlauts, ß), common punctuation, euro and arrows.
LATIN_UNICODES = (
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,"
    "U+2000-206F,U+20AC,U+2122,U+2190-2193,U+2212,U+2215,U+FEFF,U+FFFD"
)

WORDMARK_TEXT = "Glissando"
WORDMARK_SIZE = 76
WORDMARK_LETTER_SPACING = -1
WORDMARK_CENTER_X = 200
WORDMARK_BASELINE_Y = 240
WORDMARK_ROTATION = (-3, 200, 215)

PLUM = "#2A2340"
NIGHT_PLUM = "#171223"
MILK = "#FDF8F2"
PEACH = "#FFB59A"
MINT = "#8FD9C4"
LEMON = "#FFD95A"

ROOT = Path(__file__).resolve().parents[2]
FONT_DIR = ROOT / "assets" / "fonts"
BRAND_DIR = ROOT / "assets" / "brand"


def fetch(name: str) -> bytes:
    with urllib.request.urlopen(FONT_SOURCE_URL + name) as response:
        return response.read()


def load_verified_source() -> bytes:
    data = fetch(FONT_FILE)
    digest = hashlib.sha256(data).hexdigest()
    if digest != FONT_SHA256:
        sys.exit(f"Font source hash mismatch: expected {FONT_SHA256}, got {digest}")
    return data


def build_webfont(source: bytes) -> None:
    font = reloaded(instantiateVariableFont(TTFont(io.BytesIO(source)), {"wght": UI_WEIGHT_RANGE}))
    options = Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    subsetter = Subsetter(options)
    subsetter.populate(unicodes=parse_unicodes(LATIN_UNICODES))
    subsetter.subset(font)
    low, high = UI_WEIGHT_RANGE
    font.flavor = "woff2"
    font.save(FONT_DIR / f"baloo2-latin-wght{low}-{high}.woff2")


def reloaded(font: TTFont) -> TTFont:
    """Serialises and re-parses an instanced font; the subsetter needs fully rebuilt tables."""
    buffer = io.BytesIO()
    font.save(buffer)
    return TTFont(io.BytesIO(buffer.getvalue()))


def parse_unicodes(spec: str) -> list[int]:
    codepoints: list[int] = []
    for part in spec.split(","):
        bounds = part.removeprefix("U+").split("-")
        start = int(bounds[0], 16)
        end = int(bounds[-1], 16)
        codepoints.extend(range(start, end + 1))
    return codepoints


def wordmark_path(source: bytes) -> str:
    font = TTFont(io.BytesIO(source))
    instantiateVariableFont(font, {"wght": WORDMARK_WEIGHT}, inplace=True)
    buffer = io.BytesIO()
    font.save(buffer)
    static = buffer.getvalue()

    hb_font = hb.Font(hb.Face(static))
    hb_buffer = hb.Buffer()
    hb_buffer.add_str(WORDMARK_TEXT)
    hb_buffer.guess_segment_properties()
    hb.shape(hb_font, hb_buffer)

    font = TTFont(io.BytesIO(static))
    glyph_set = font.getGlyphSet()
    glyph_order = font.getGlyphOrder()
    scale = WORDMARK_SIZE / font["head"].unitsPerEm
    spacing = WORDMARK_LETTER_SPACING / scale

    glyphs = list(zip(hb_buffer.glyph_infos, hb_buffer.glyph_positions))
    total_advance = sum(pos.x_advance + spacing for _, pos in glyphs) - spacing
    pen = SVGPathPen(glyph_set, ntos=lambda value: f"{value:.1f}".rstrip("0").rstrip("."))
    cursor = 0.0
    for info, pos in glyphs:
        x = WORDMARK_CENTER_X + (cursor + pos.x_offset - total_advance / 2) * scale
        y = WORDMARK_BASELINE_Y - pos.y_offset * scale
        glyph_set[glyph_order[info.codepoint]].draw(
            TransformPen(pen, (scale, 0, 0, -scale, x, y))
        )
        cursor += pos.x_advance + spacing
    return pen.getCommands()


def stacked_logo(path: str, outline: str, wordmark: str) -> str:
    angle, cx, cy = WORDMARK_ROTATION
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 270">
  <g transform="translate(110 0) scale(1.5)" fill="none">
    <g transform="rotate(-14 36 56)"><rect x="10" y="36" width="52" height="40" rx="9" fill="{PEACH}" stroke="{outline}" stroke-width="4"/></g>
    <g transform="rotate(-2 56 44)"><rect x="30" y="24" width="52" height="40" rx="9" fill="{MINT}" stroke="{outline}" stroke-width="4"/></g>
    <g transform="rotate(10 78 32)">
      <rect x="52" y="12" width="52" height="40" rx="9" fill="{LEMON}" stroke="{outline}" stroke-width="4"/>
      <circle cx="66" cy="25" r="5" fill="{outline}"/>
      <path d="M60 46 L72 33 L80 40 L86 35 L96 46 Z" fill="{outline}"/>
    </g>
  </g>
  <path transform="rotate({angle} {cx} {cy})" fill="{wordmark}" d="{path}"/>
</svg>
"""


def main() -> None:
    source = load_verified_source()
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    build_webfont(source)
    (FONT_DIR / LICENSE_FILE).write_bytes(fetch(LICENSE_FILE))
    path = wordmark_path(source)
    (BRAND_DIR / "logo-stacked-light.svg").write_text(stacked_logo(path, PLUM, PLUM))
    (BRAND_DIR / "logo-stacked-dark.svg").write_text(stacked_logo(path, NIGHT_PLUM, MILK))


if __name__ == "__main__":
    main()
