"""Fetches, hash-verifies and subsets the self-hosted OFL variable webfonts.

Each FontSource pins one Google Fonts variable font to an exact commit and file hash, and
instances the axes the app actually uses (a pin collapses an axis, a range keeps it variable)
before subsetting to the Latin set and writing a woff2. Imported by build.py.
"""

import hashlib
import io
import sys
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

GOOGLE_FONTS_RAW_ROOT = "https://raw.githubusercontent.com/google/fonts"
LICENSE_SOURCE_FILE = "OFL.txt"

# fontTools instancer spec per axis tag: a float pins the axis (removed from the result), a
# (min, max) tuple keeps it variable but narrowed to that range.
AxisLimit = float | tuple[float, float]


@dataclass(frozen=True)
class FontSource:
    """One Google Fonts OFL variable font, pinned to an exact commit and file hash."""

    family_dir: str  # the font's directory under ofl/, e.g. "baloo2"
    source_commit: str  # commit SHA the font file and its OFL.txt are fetched from
    source_file: str  # URL-encoded filename at that path, e.g. "Baloo2%5Bwght%5D.ttf"
    source_sha256: str  # expected sha256 of the downloaded font file; build fails loudly otherwise
    license_name: str  # output filename for this family's licence, e.g. "OFL.txt"
    axis_limits: dict[str, AxisLimit]  # how each variable axis is instanced for the webfont
    output_name: str  # output woff2 filename


def source_url(source: FontSource) -> str:
    return f"{GOOGLE_FONTS_RAW_ROOT}/{source.source_commit}/ofl/{source.family_dir}/"


def fetch(source: FontSource, name: str) -> bytes:
    with urllib.request.urlopen(source_url(source) + name) as response:
        return response.read()


def load_verified_source(source: FontSource) -> bytes:
    data = fetch(source, source.source_file)
    digest = hashlib.sha256(data).hexdigest()
    if digest != source.source_sha256:
        sys.exit(
            f"{source.family_dir} font source hash mismatch: "
            f"expected {source.source_sha256}, got {digest}"
        )
    return data


def parse_unicodes(spec: str) -> list[int]:
    codepoints: list[int] = []
    for part in spec.split(","):
        bounds = part.removeprefix("U+").split("-")
        start = int(bounds[0], 16)
        end = int(bounds[-1], 16)
        codepoints.extend(range(start, end + 1))
    return codepoints


def reloaded(font: TTFont) -> TTFont:
    """Serialises and re-parses an instanced font; the subsetter needs fully rebuilt tables."""
    buffer = io.BytesIO()
    font.save(buffer)
    return TTFont(io.BytesIO(buffer.getvalue()))


def build_webfont(source: FontSource, data: bytes, unicodes: list[int], font_dir: Path) -> None:
    font = reloaded(instantiateVariableFont(TTFont(io.BytesIO(data)), source.axis_limits))
    options = Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    subsetter = Subsetter(options)
    subsetter.populate(unicodes=unicodes)
    subsetter.subset(font)
    font.flavor = "woff2"
    font.save(font_dir / source.output_name)


def build_all(sources: list[FontSource], unicodes: list[int], font_dir: Path) -> dict[str, bytes]:
    """Downloads, verifies and builds every source's webfont and licence file.

    Returns each source's verified raw font bytes, keyed by family_dir, so callers that also
    need the unsubset source (e.g. to draw a logo from it) don't fetch it twice.
    """
    font_dir.mkdir(parents=True, exist_ok=True)
    raw_sources: dict[str, bytes] = {}
    for source in sources:
        data = load_verified_source(source)
        raw_sources[source.family_dir] = data
        build_webfont(source, data, unicodes, font_dir)
        (font_dir / source.license_name).write_bytes(fetch(source, LICENSE_SOURCE_FILE))
    return raw_sources
