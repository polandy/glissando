"""Builds the self-hosted webfonts and the outlined wordmark logos, static and animated.

Run from the repo root:  scripts/brand/build.sh
Outputs are committed; this script only reruns when a font source or the logo changes.
"""

import io
from dataclasses import dataclass
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

import webfonts
from webfonts import FontSource

# Basic Latin, Latin-1 (German umlauts, ß), common punctuation, euro and arrows.
LATIN_UNICODES = (
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,"
    "U+2000-206F,U+20AC,U+2122,U+2190-2193,U+2212,U+2215,U+FEFF,U+FFFD"
)

# Baloo 2 is pinned to the oldest commit that carries it; the other three families were added
# to the google/fonts repo later, so they're pinned to a newer commit where all three exist.
BALOO2_SOURCE_COMMIT = "8e0cd05881f3ae5e933ba4161103005a3e841ce0"
WEBFONT_SOURCE_COMMIT = "5e8a3ba899557829a76cfdac30fa512bda91d7ca"

BALOO2 = "baloo2"
UI_WEIGHT_RANGE = (600, 800)
WORDMARK_WEIGHT = 800

BALOO2_SOURCE = FontSource(
    family_dir=BALOO2,
    source_commit=BALOO2_SOURCE_COMMIT,
    source_file="Baloo2%5Bwght%5D.ttf",
    source_sha256="d47a6852548059b1db49a1319d06d499d546c3fa2237cf9eee9c43c8abb025c2",
    license_name="OFL.txt",
    axis_limits={"wght": UI_WEIGHT_RANGE},
    output_name=f"baloo2-latin-wght{UI_WEIGHT_RANGE[0]}-{UI_WEIGHT_RANGE[1]}.woff2",
)

# UI text: a weight range (not a single static weight) so the app can style by CSS font-weight.
INSTRUMENT_SANS_WEIGHT_RANGE = (400, 600)
# The family's wdth axis defaults to 100 (no condensed/expanded use in this app); pinning it
# removes the axis instead of shipping width variation nothing uses.
INSTRUMENT_SANS_WIDTH = 100
INSTRUMENT_SANS_SOURCE = FontSource(
    family_dir="instrumentsans",
    source_commit=WEBFONT_SOURCE_COMMIT,
    source_file="InstrumentSans%5Bwdth%2Cwght%5D.ttf",
    source_sha256="b24f1812584816958afcf22e22d08e44318c5e51651e25d2438efdde389b33b1",
    license_name="OFL-instrument-sans.txt",
    axis_limits={"wdth": INSTRUMENT_SANS_WIDTH, "wght": INSTRUMENT_SANS_WEIGHT_RANGE},
    output_name=(
        f"instrumentsans-latin-wght{INSTRUMENT_SANS_WEIGHT_RANGE[0]}"
        f"-{INSTRUMENT_SANS_WEIGHT_RANGE[1]}.woff2"
    ),
)

# Titles use one static weight, so wght and wdth collapse to fixed values. opsz also collapses
# rather than shipping as a variable range: the app doesn't wire up font-optical-sizing, so a
# live opsz axis would cost bytes for a dimension nothing reads. 32 sits in the middle of this
# family's typical title-size use (24-48px) and is a reasonable fixed optical size for that range.
BRICOLAGE_GROTESQUE_WEIGHT = 700
BRICOLAGE_GROTESQUE_WIDTH = 100
BRICOLAGE_GROTESQUE_OPTICAL_SIZE = 32
BRICOLAGE_GROTESQUE_SOURCE = FontSource(
    family_dir="bricolagegrotesque",
    source_commit=WEBFONT_SOURCE_COMMIT,
    source_file="BricolageGrotesque%5Bopsz%2Cwdth%2Cwght%5D.ttf",
    source_sha256="413e7357809ddd12fd80a96a8a396de0e401638d4acd3cb3e37532f0472ac682",
    license_name="OFL-bricolage-grotesque.txt",
    axis_limits={
        "opsz": BRICOLAGE_GROTESQUE_OPTICAL_SIZE,
        "wdth": BRICOLAGE_GROTESQUE_WIDTH,
        "wght": BRICOLAGE_GROTESQUE_WEIGHT,
    },
    output_name=f"bricolagegrotesque-latin-wght{BRICOLAGE_GROTESQUE_WEIGHT}.woff2",
)

# Times and counts: a weight range, same treatment as the Instrument Sans UI font.
GEIST_MONO_WEIGHT_RANGE = (400, 500)
GEIST_MONO_SOURCE = FontSource(
    family_dir="geistmono",
    source_commit=WEBFONT_SOURCE_COMMIT,
    source_file="GeistMono%5Bwght%5D.ttf",
    source_sha256="d00e590b8eb3a59acc329b2d044fd143ae935090b7da33199ebee27cc7de8196",
    license_name="OFL-geist-mono.txt",
    axis_limits={"wght": GEIST_MONO_WEIGHT_RANGE},
    output_name=f"geistmono-latin-wght{GEIST_MONO_WEIGHT_RANGE[0]}-{GEIST_MONO_WEIGHT_RANGE[1]}.woff2",
)

FONT_SOURCES = [BALOO2_SOURCE, INSTRUMENT_SANS_SOURCE, BRICOLAGE_GROTESQUE_SOURCE, GEIST_MONO_SOURCE]

WORDMARK_TEXT = "Glissando"
WORDMARK_SIZE = 76
WORDMARK_LETTER_SPACING = -1
WORDMARK_CENTER_X = 200
WORDMARK_BASELINE_Y = 206
WORDMARK_ROTATION = (-3, 200, 181)
STACKED_VIEW_BOX = "0 0 400 236"

PLUM = "#2A2340"
NIGHT_PLUM = "#171223"
MILK = "#FDF8F2"
PEACH = "#FFB59A"
MINT = "#8FD9C4"
LEMON = "#FFD95A"

ROOT = Path(__file__).resolve().parents[2]
FONT_DIR = ROOT / "assets" / "fonts"
BRAND_DIR = ROOT / "assets" / "brand"


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


@dataclass(frozen=True)
class LogoPaint:
    peach: str
    mint: str
    lemon: str
    outline: str
    wordmark: str


LIGHT_PAINT = LogoPaint(PEACH, MINT, LEMON, outline=PLUM, wordmark=PLUM)
DARK_PAINT = LogoPaint(PEACH, MINT, LEMON, outline=NIGHT_PLUM, wordmark=MILK)
# The animated logo is inlined into the app, so it paints with the theme's design tokens.
TOKEN_PAINT = LogoPaint(
    peach="var(--gl-logo-peach)",
    mint="var(--gl-logo-mint)",
    lemon="var(--gl-logo-lemon)",
    outline="var(--gl-logo-outline)",
    wordmark="var(--gl-ink)",
)


def stacked_logo(path: str, paint: LogoPaint) -> str:
    angle, cx, cy = WORDMARK_ROTATION
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="{STACKED_VIEW_BOX}">
  <g transform="translate(110 0) scale(1.5)" fill="none">
    <g transform="rotate(-14 36 56)"><rect x="10" y="36" width="52" height="40" rx="9" fill="{paint.peach}" stroke="{paint.outline}" stroke-width="4"/></g>
    <g transform="rotate(-2 56 44)"><rect x="30" y="24" width="52" height="40" rx="9" fill="{paint.mint}" stroke="{paint.outline}" stroke-width="4"/></g>
    <g transform="rotate(10 78 32)">
      <rect x="52" y="12" width="52" height="40" rx="9" fill="{paint.lemon}" stroke="{paint.outline}" stroke-width="4"/>
      <circle cx="66" cy="25" r="5" fill="{paint.outline}"/>
      <path d="M60 46 L72 33 L80 40 L86 35 L96 46 Z" fill="{paint.outline}"/>
    </g>
  </g>
  <path transform="rotate({angle} {cx} {cy})" fill="{paint.wordmark}" d="{path}"/>
</svg>
"""


def animated_logo(path: str, paint: LogoPaint) -> str:
    """The stacked logo with class hooks for the start animation.

    Every animated part sits in its own group: a CSS transform on an element replaces its
    transform attribute, so the static placement stays on a parent.
    """
    angle, cx, cy = WORDMARK_ROTATION
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="{STACKED_VIEW_BOX}" role="img" aria-label="{WORDMARK_TEXT}">
  <g transform="translate(110 0) scale(1.5)" fill="none">
    <g class="card card-back"><g transform="rotate(-14 36 56)"><rect x="10" y="36" width="52" height="40" rx="9" fill="{paint.peach}" stroke="{paint.outline}" stroke-width="4"/></g></g>
    <g class="card card-middle"><g transform="rotate(-2 56 44)"><rect x="30" y="24" width="52" height="40" rx="9" fill="{paint.mint}" stroke="{paint.outline}" stroke-width="4"/></g></g>
    <g class="card card-front"><g transform="rotate(10 78 32)">
      <rect x="52" y="12" width="52" height="40" rx="9" fill="{paint.lemon}" stroke="{paint.outline}" stroke-width="4"/>
      <g class="motif"><circle cx="66" cy="25" r="5" fill="{paint.outline}"/><path d="M60 46 L72 33 L80 40 L86 35 L96 46 Z" fill="{paint.outline}"/></g>
    </g></g>
  </g>
  <g transform="rotate({angle} {cx} {cy})"><path class="wordmark" fill="{paint.wordmark}" d="{path}"/></g>
</svg>
"""


def main() -> None:
    unicodes = webfonts.parse_unicodes(LATIN_UNICODES)
    raw_sources = webfonts.build_all(FONT_SOURCES, unicodes, FONT_DIR)

    path = wordmark_path(raw_sources[BALOO2])
    BRAND_DIR.mkdir(parents=True, exist_ok=True)
    (BRAND_DIR / "logo-stacked-light.svg").write_text(stacked_logo(path, LIGHT_PAINT))
    (BRAND_DIR / "logo-stacked-dark.svg").write_text(stacked_logo(path, DARK_PAINT))
    (BRAND_DIR / "logo-stacked-animated.svg").write_text(animated_logo(path, TOKEN_PAINT))


if __name__ == "__main__":
    main()
