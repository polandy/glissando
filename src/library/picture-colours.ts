/**
 * A picture's two stored colours (ADR-0033, `dev-docs/player/TITLE_CARD_COLOURS.md`): `veil`, a
 * dark muted tone to tint a card's veil, and `accent`, a light clearer tone for a colour ground.
 * Pure: it takes the pixels of the stored, downscaled picture, sampled to at most 64 × 64.
 */

/** One sampled pixel, 0 to 255 per channel. */
export interface RgbPixel {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface PictureColours {
  readonly veil: string;
  readonly accent: string;
}

/** The side, in pixels, a picture is sampled down to before `pictureColours` reads it. */
export const PICTURE_COLOURS_SAMPLE_SIDE = 64;

const BIN_COUNT = 24;
const BIN_DEGREES = 360 / BIN_COUNT;
const LOW_LIGHTNESS_SKIP = 0.08;
const HIGH_LIGHTNESS_SKIP = 0.97;
/** Below this weight per sampled pixel, the picture counts as grey. */
const GREY_WEIGHT_PER_PIXEL = 0.02;
const SECOND_HUE_MIN_SEPARATION_DEGREES = 60;
const SECOND_HUE_MIN_WEIGHT_RATIO = 0.25;

const VEIL_LIGHTNESS = 0.27;
const VEIL_MAX_CHROMA = 0.05;
const ACCENT_LIGHTNESS = 0.8;
const ACCENT_CHROMA_SCALE = 1.2;
const ACCENT_MAX_CHROMA = 0.12;

/** A hue and chroma picked for one of the two colours. */
interface HueChroma {
  readonly hue: number;
  readonly chroma: number;
}

const GREY: HueChroma = { hue: 0, chroma: 0 };

/** One 15° bin's accumulated, chroma-weighted pixels. */
interface Bin {
  weight: number;
  x: number;
  y: number;
  chromaSquared: number;
}

function emptyBin(): Bin {
  return { weight: 0, x: 0, y: 0, chromaSquared: 0 };
}

function addBin(a: Bin, b: Bin): Bin {
  return {
    weight: a.weight + b.weight,
    x: a.x + b.x,
    y: a.y + b.y,
    chromaSquared: a.chromaSquared + b.chromaSquared,
  };
}

/** `veil` and `accent` for `pixels`, by the algorithm in TITLE_CARD_COLOURS.md. */
export function pictureColours(pixels: readonly RgbPixel[]): PictureColours {
  const bins: Bin[] = Array.from({ length: BIN_COUNT }, emptyBin);
  for (const pixel of pixels) {
    const { lightness, chroma, hue } = oklch(pixel);
    if (lightness < LOW_LIGHTNESS_SKIP || lightness > HIGH_LIGHTNESS_SKIP) {
      continue;
    }
    const bin = bins[binIndexOf(hue)];
    if (bin === undefined) {
      continue;
    }
    const radians = degreesToRadians(hue);
    bin.weight += chroma;
    bin.x += chroma * Math.cos(radians);
    bin.y += chroma * Math.sin(radians);
    bin.chromaSquared += chroma * chroma;
  }

  const totalWeight = bins.reduce((sum, bin) => sum + bin.weight, 0);
  const isGrey = pixels.length === 0 || totalWeight / pixels.length < GREY_WEIGHT_PER_PIXEL;
  const dominant = isGrey ? GREY : dominantHueOf(bins);
  const second = isGrey ? dominant : secondHueOf(bins, dominant);

  return {
    veil: hexOf(VEIL_LIGHTNESS, Math.min(dominant.chroma, VEIL_MAX_CHROMA), dominant.hue),
    accent: hexOf(
      ACCENT_LIGHTNESS,
      Math.min(second.chroma * ACCENT_CHROMA_SCALE, ACCENT_MAX_CHROMA),
      second.hue,
    ),
  };
}

function binIndexOf(hue: number): number {
  return Math.floor(hue / BIN_DEGREES) % BIN_COUNT;
}

/** The 3-bin group centred on each bin: that bin plus its circular neighbours. */
function groupAt(bins: readonly Bin[], index: number): Bin {
  const before = bins[(index - 1 + BIN_COUNT) % BIN_COUNT] ?? emptyBin();
  const at = bins[index] ?? emptyBin();
  const after = bins[(index + 1) % BIN_COUNT] ?? emptyBin();
  return addBin(addBin(before, at), after);
}

function hueChromaOf(group: Bin): HueChroma {
  if (group.weight <= 0) {
    return GREY;
  }
  return {
    hue: normalizeDegrees(radiansToDegrees(Math.atan2(group.y, group.x))),
    chroma: group.chromaSquared / group.weight,
  };
}

function dominantHueOf(bins: readonly Bin[]): HueChroma {
  let bestIndex = 0;
  let bestWeight = -1;
  for (let index = 0; index < BIN_COUNT; index += 1) {
    const weight = groupAt(bins, index).weight;
    if (weight > bestWeight) {
      bestWeight = weight;
      bestIndex = index;
    }
  }
  return hueChromaOf(groupAt(bins, bestIndex));
}

function secondHueOf(bins: readonly Bin[], dominant: HueChroma): HueChroma {
  const dominantGroupWeight = groupAt(bins, binIndexOf(dominant.hue)).weight;
  let bestIndex = -1;
  let bestWeight = -1;
  for (let index = 0; index < BIN_COUNT; index += 1) {
    const binCentre = index * BIN_DEGREES + BIN_DEGREES / 2;
    if (circularDistance(binCentre, dominant.hue) < SECOND_HUE_MIN_SEPARATION_DEGREES) {
      continue;
    }
    const weight = groupAt(bins, index).weight;
    if (weight > bestWeight) {
      bestWeight = weight;
      bestIndex = index;
    }
  }
  if (bestIndex < 0 || bestWeight < SECOND_HUE_MIN_WEIGHT_RATIO * dominantGroupWeight) {
    return dominant;
  }
  return hueChromaOf(groupAt(bins, bestIndex));
}

function circularDistance(a: number, b: number): number {
  const delta = Math.abs(a - b) % 360;
  return Math.min(delta, 360 - delta);
}

function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/** A sampled pixel's OKLCH lightness, chroma and hue in degrees. */
function oklch(pixel: RgbPixel): { lightness: number; chroma: number; hue: number } {
  const [l, a, b] = oklabOf(pixel.r, pixel.g, pixel.b);
  const chroma = Math.hypot(a, b);
  return { lightness: l, chroma, hue: normalizeDegrees(radiansToDegrees(Math.atan2(b, a))) };
}

/** `#RRGGBB` of OKLCH(`lightness`, `chroma`, `hue`), reducing `chroma` until it fits sRGB. */
function hexOf(lightness: number, chroma: number, hue: number): string {
  const radians = degreesToRadians(hue);
  const inGamut = (candidateChroma: number): RgbPixel | null =>
    rgbOf(lightness, candidateChroma * Math.cos(radians), candidateChroma * Math.sin(radians));

  let fits = inGamut(0);
  if (fits === null) {
    // Even a grey of this lightness clips (impossible for 0..1 lightness, but fail safe).
    return toHex({ r: 0, g: 0, b: 0 });
  }
  let low = 0;
  let high = chroma;
  const atHigh = inGamut(high);
  if (atHigh !== null) {
    return toHex(atHigh);
  }
  for (let iteration = 0; iteration < 20; iteration += 1) {
    const mid = (low + high) / 2;
    const candidate = inGamut(mid);
    if (candidate === null) {
      high = mid;
    } else {
      low = mid;
      fits = candidate;
    }
  }
  return toHex(fits);
}

/** Linear-sRGB components of OKLab(`l`, `a`, `b`); `null` once any component leaves 0..1. */
function rgbOf(l: number, a: number, b: number): RgbPixel | null {
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const lCubed = l_ ** 3;
  const mCubed = m_ ** 3;
  const sCubed = s_ ** 3;
  const linearRed = 4.0767416621 * lCubed - 3.3077115913 * mCubed + 0.2309699292 * sCubed;
  const linearGreen = -1.2684380046 * lCubed + 2.6097574011 * mCubed - 0.3413193965 * sCubed;
  const linearBlue = -0.0041960863 * lCubed - 0.7034186147 * mCubed + 1.707614701 * sCubed;
  if (!inUnitRange(linearRed) || !inUnitRange(linearGreen) || !inUnitRange(linearBlue)) {
    return null;
  }
  return { r: fromLinear(linearRed), g: fromLinear(linearGreen), b: fromLinear(linearBlue) };
}

const GAMUT_TOLERANCE = 1e-4;

function inUnitRange(value: number): boolean {
  return value >= -GAMUT_TOLERANCE && value <= 1 + GAMUT_TOLERANCE;
}

/** OKLab of an sRGB pixel (0..255 per channel). */
function oklabOf(red: number, green: number, blue: number): readonly [number, number, number] {
  const r = toLinear(red / 255);
  const g = toLinear(green / 255);
  const b = toLinear(blue / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function toLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function fromLinear(channel: number): number {
  const clamped = Math.min(1, Math.max(0, channel));
  const srgb = clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, srgb)) * 255);
}

function toHex(pixel: RgbPixel): string {
  const channel = (value: number): string => value.toString(16).padStart(2, "0");
  return `#${channel(pixel.r)}${channel(pixel.g)}${channel(pixel.b)}`.toUpperCase();
}

const HEX_COLOUR = /^#[0-9A-F]{6}$/i;

/** Whether `value` is a `#RRGGBB` colour (case-insensitive), e.g. a card's own ground colour. */
export function isHexColour(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOUR.test(value);
}
