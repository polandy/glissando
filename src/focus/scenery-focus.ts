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
const RGBA_CHANNELS = 4;

/**
 * Whether a picture is scenery: a wide picture with a calm, blue or bright upper third above
 * a busier remainder (ADR-0037). The scenery has no box to aim at, it is swept as a whole.
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
  return skyIsCalm && groundIsBusier && skyIsBlueOrBright(image, skyRows, grey.pixels)
    ? { kind: "scenery" }
    : { kind: "none" };
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

function skyIsBlueOrBright(image: RgbaImage, skyRows: number, pixels: Uint8Array): boolean {
  const count = skyRows * image.width;
  let red = 0;
  let blue = 0;
  let luminance = 0;
  for (let pixel = 0; pixel < count; pixel++) {
    red += image.data[pixel * RGBA_CHANNELS] ?? 0;
    blue += image.data[pixel * RGBA_CHANNELS + 2] ?? 0;
    luminance += pixels[pixel] ?? 0;
  }
  return blue > red || luminance / count >= MIN_BRIGHT_SKY;
}
