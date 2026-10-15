import type { PictureFocus } from "../library/picture-focus";
import { greyFromRgba } from "./grey-image";
import type { RgbaImage } from "./object-focus";

// A picture needs this much more width than height to have room for a sideways sweep.
const MIN_ASPECT = 1.3;
// The upper third is where the sky sits.
const SKY_SHARE = 1 / 3;
// The most luminance change per pixel step (0..255) the sky may have on average.
const MAX_SKY_ACTIVITY = 6;
// A bright sky (overcast, hazy) counts without being blue.
const MIN_BRIGHT_SKY = 170;
// The ground must change at least this much per pixel step, and this many times the sky's.
const MIN_GROUND_ACTIVITY = 8;
const GROUND_TO_SKY_ACTIVITY = 2;
// A sky is blue when its blue is clearly above its red; a pale grey ceiling is not.
const BLUE_SKY_RATIO = 1.1;
const RGBA_CHANNELS = 4;
// Foliage, grass, sea and sky: hues from yellow-green to blue, saturated and not black.
const NATURE_HUE_MIN = 70;
const NATURE_HUE_MAX = 250;
const NATURE_MIN_SATURATION = 0.2;
const NATURE_MIN_VALUE = 0.15;
const DEGREES_PER_SECTOR = 60;
// A picture this much nature-coloured is scenery with or without a sky; a bright sky needs
// this much of the ground to be nature-coloured.
const SCENERY_NATURE_SHARE = 0.6;
const BRIGHT_SKY_GROUND_NATURE_SHARE = 0.25;

/**
 * Whether a picture is scenery: a wide picture that is mostly the colours of nature, or has a
 * calm blue upper third above a busier remainder, or a calm bright one above a ground partly of
 * those colours (ADR-0037). Scenery has no box to aim at, it is swept as a whole.
 */
export function sceneryFocus(image: RgbaImage): PictureFocus {
  if (image.width < image.height * MIN_ASPECT) return { kind: "none" };
  const skyRows = Math.max(1, Math.floor(image.height * SKY_SHARE));
  const grey = greyFromRgba(image.data, image.width, image.height);
  const skyActivity = activity(grey.pixels, image.width, 0, skyRows);
  const groundActivity = activity(grey.pixels, image.width, skyRows, image.height);
  const skyIsCalm = skyActivity <= MAX_SKY_ACTIVITY;
  const groundIsBusier =
    groundActivity >= MIN_GROUND_ACTIVITY && groundActivity >= skyActivity * GROUND_TO_SKY_ACTIVITY;
  const isScenery =
    natureShare(image, 0, image.height) >= SCENERY_NATURE_SHARE ||
    (skyIsCalm &&
      groundIsBusier &&
      (skyIsBlue(image, skyRows) ||
        (skyIsBright(grey.pixels, image.width, skyRows) &&
          natureShare(image, skyRows, image.height) >= BRIGHT_SKY_GROUND_NATURE_SHARE)));
  return isScenery ? { kind: "scenery" } : { kind: "none" };
}

/** The mean luminance step to the right and below, over the rows `from` up to `to`. */
function activity(pixels: Uint8Array, width: number, from: number, to: number): number {
  let sum = 0;
  let steps = 0;
  for (let row = from; row < to; row++) {
    for (let column = 0; column < width; column++) {
      const here = pixels[row * width + column] ?? 0;
      if (column + 1 < width) {
        sum += Math.abs(here - (pixels[row * width + column + 1] ?? 0));
        steps++;
      }
      if (row + 1 < to) {
        sum += Math.abs(here - (pixels[(row + 1) * width + column] ?? 0));
        steps++;
      }
    }
  }
  return steps === 0 ? 0 : sum / steps;
}

function skyIsBlue(image: RgbaImage, skyRows: number): boolean {
  let red = 0;
  let blue = 0;
  for (let pixel = 0; pixel < skyRows * image.width; pixel++) {
    red += image.data[pixel * RGBA_CHANNELS] ?? 0;
    blue += image.data[pixel * RGBA_CHANNELS + 2] ?? 0;
  }
  return blue > red * BLUE_SKY_RATIO;
}

function skyIsBright(pixels: Uint8Array, width: number, skyRows: number): boolean {
  let luminance = 0;
  for (let pixel = 0; pixel < skyRows * width; pixel++) luminance += pixels[pixel] ?? 0;
  return luminance / (skyRows * width) >= MIN_BRIGHT_SKY;
}

/** The share of the rows `from` up to `to` whose pixels are green to blue and saturated. */
function natureShare(image: RgbaImage, from: number, to: number): number {
  let natural = 0;
  for (let pixel = from * image.width; pixel < to * image.width; pixel++) {
    const red = image.data[pixel * RGBA_CHANNELS] ?? 0;
    const green = image.data[pixel * RGBA_CHANNELS + 1] ?? 0;
    const blue = image.data[pixel * RGBA_CHANNELS + 2] ?? 0;
    const highest = Math.max(red, green, blue);
    const range = highest - Math.min(red, green, blue);
    const hue = hueOf(red, green, blue, highest, range);
    if (
      highest / 255 >= NATURE_MIN_VALUE &&
      range / highest >= NATURE_MIN_SATURATION &&
      hue >= NATURE_HUE_MIN &&
      hue <= NATURE_HUE_MAX
    ) {
      natural++;
    }
  }
  return natural / ((to - from) * image.width);
}

/** Degrees 0..360 around the colour wheel; `range` is the spread of the channels, above 0. */
function hueOf(red: number, green: number, blue: number, highest: number, range: number): number {
  const sector =
    highest === red
      ? ((green - blue) / range) % 6
      : highest === green
        ? (blue - red) / range + 2
        : (red - green) / range + 4;
  return (sector * DEGREES_PER_SECTOR + 360) % 360;
}
