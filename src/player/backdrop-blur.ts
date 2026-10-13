/** A picture's pixels, row by row from the top left, four bytes (RGBA) each. */
export interface RgbaPixels {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

/** The radius of each box pass, as a share of the picture's long side (ADR-0028). */
export const BACKDROP_BLUR_RADIUS_SHARE = 0.03;
/** Three box passes per axis approximate a Gaussian closely enough that no edge of a box shows. */
const BOX_PASSES = 3;
const CHANNELS = 4;

/**
 * A Gaussian-like blur of a small picture: three box passes along the rows, then three along the
 * columns, each reading beyond the picture's edge as its nearest edge pixel.
 */
export function blurBackdrop({ width, height, data }: RgbaPixels): RgbaPixels {
  const radius = Math.max(1, Math.round(Math.max(width, height) * BACKDROP_BLUR_RADIUS_SHARE));
  let values: Float32Array = Float32Array.from(data);
  for (let pass = 0; pass < BOX_PASSES; pass += 1) {
    values = boxPass(values, radius, { along: width, step: 1, lines: height, lineStep: width });
  }
  for (let pass = 0; pass < BOX_PASSES; pass += 1) {
    values = boxPass(values, radius, { along: height, step: width, lines: width, lineStep: 1 });
  }
  return { width, height, data: Uint8ClampedArray.from(values, Math.round) };
}

/**
 * One axis of a pass: `lines` lines of `along` pixels, `step` pixels apart within a line and
 * each line starting `lineStep` pixels after the one before.
 */
interface Axis {
  readonly along: number;
  readonly step: number;
  readonly lines: number;
  readonly lineStep: number;
}

/** A running-sum box average of every line along `axis`, edge pixels repeated beyond the edge. */
function boxPass(
  source: Float32Array,
  radius: number,
  { along, step, lines, lineStep }: Axis,
): Float32Array {
  const target = new Float32Array(source.length);
  const windowLength = 2 * radius + 1;
  for (let line = 0; line < lines; line += 1) {
    const start = line * lineStep;
    const at = (index: number, channel: number): number => {
      const clamped = Math.min(along - 1, Math.max(0, index));
      return source[(start + clamped * step) * CHANNELS + channel] ?? 0;
    };
    for (let channel = 0; channel < CHANNELS; channel += 1) {
      let sum = 0;
      for (let index = -radius; index <= radius; index += 1) {
        sum += at(index, channel);
      }
      for (let index = 0; index < along; index += 1) {
        target[(start + index * step) * CHANNELS + channel] = sum / windowLength;
        sum += at(index + radius + 1, channel) - at(index - radius, channel);
      }
    }
  }
  return target;
}
