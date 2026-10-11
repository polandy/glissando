/** FFmpeg's audio sample formats, numbered as libav.js reports them. */
export const SAMPLE_FORMAT = {
  U8: 0,
  S16: 1,
  S32: 2,
  FLT: 3,
  DBL: 4,
  U8P: 5,
  S16P: 6,
  S32P: 7,
  FLTP: 8,
  DBLP: 9,
} as const;

/** FLAC holds 16-bit samples in 16-bit integers and 24-bit ones left-aligned in 32-bit integers. */
export type FlacDepth = 16 | 24;
type FlacSamples = Int16Array<ArrayBuffer> | Int32Array<ArrayBuffer>;
type DecodedSamples = Uint8Array | Int16Array | Int32Array | Float32Array | Float64Array;

/** One decoded frame: one array per channel when planar, else the channels interleaved. */
export interface DecodedAudio {
  readonly format: number;
  readonly nbSamples: number;
  readonly data: DecodedSamples | readonly DecodedSamples[];
}

const DEEP_FORMATS: readonly number[] = [SAMPLE_FORMAT.S32, SAMPLE_FORMAT.S32P];
const FLOAT_FORMATS: readonly number[] = [
  SAMPLE_FORMAT.FLT,
  SAMPLE_FORMAT.DBL,
  SAMPLE_FORMAT.FLTP,
  SAMPLE_FORMAT.DBLP,
];
const UNSIGNED_FORMATS: readonly number[] = [SAMPLE_FORMAT.U8, SAMPLE_FORMAT.U8P];
const INT16_MAX = 32767;
const UNSIGNED_8_BIT_ZERO = 128;
const BITS_FROM_8_TO_16 = 8;

/**
 * Lossless sources keep their depth: a decoder that delivers 32-bit integers carries up to
 * 24 bits (ALAC, 24-bit AIFF). Lossy ones (floats) gain nothing beyond 16 bits.
 */
export function flacDepthOf(format: number): FlacDepth {
  return DEEP_FORMATS.includes(format) ? 24 : 16;
}

function toFlacSample(format: number): (value: number) => number {
  if (FLOAT_FORMATS.includes(format)) {
    return (value) => {
      const scaled = Math.min(1, Math.max(-1, value)) * INT16_MAX;
      return Math.sign(scaled) * Math.round(Math.abs(scaled));
    };
  }
  if (UNSIGNED_FORMATS.includes(format)) {
    return (value) => (value - UNSIGNED_8_BIT_ZERO) << BITS_FROM_8_TO_16;
  }
  return (value) => value;
}

/**
 * Interleaves decoded frames into the FLAC encoder's sample format and cuts them into the
 * encoder's frame size; only the last frame may be shorter.
 */
export class FlacSampleQueue {
  readonly #channels: number;
  readonly #frameSize: number;
  readonly #depth: FlacDepth;
  #pending: number[] = [];

  constructor(depth: FlacDepth, channels: number, frameSize: number) {
    this.#channels = channels;
    this.#frameSize = frameSize;
    this.#depth = depth;
  }

  push(audio: DecodedAudio): void {
    const planes = Array.isArray(audio.data) ? (audio.data as readonly DecodedSamples[]) : null;
    if (planes !== null && planes.length !== this.#channels) {
      throw new Error(
        `a decoded frame has ${planes.length} channel(s), the track ${this.#channels}: ` +
          "a channel count that changes mid-track cannot be stored as FLAC",
      );
    }
    const convert = toFlacSample(audio.format);
    const interleaved = audio.data as DecodedSamples;
    for (let index = 0; index < audio.nbSamples; index += 1) {
      for (let channel = 0; channel < this.#channels; channel += 1) {
        const value =
          planes === null
            ? interleaved[index * this.#channels + channel]
            : planes[channel]?.[index];
        this.#pending.push(convert(value ?? 0));
      }
    }
  }

  /** The whole frames queued so far; with `final`, also the shorter rest. */
  takeFrames(final: boolean): FlacSamples[] {
    const frameLength = this.#frameSize * this.#channels;
    const frames: FlacSamples[] = [];
    let start = 0;
    while (this.#pending.length - start >= frameLength) {
      frames.push(this.#frame(start, start + frameLength));
      start += frameLength;
    }
    if (final && start < this.#pending.length) {
      frames.push(this.#frame(start, this.#pending.length));
      start = this.#pending.length;
    }
    this.#pending = this.#pending.slice(start);
    return frames;
  }

  #frame(start: number, end: number): FlacSamples {
    const values = this.#pending.slice(start, end);
    return this.#depth === 24 ? Int32Array.from(values) : Int16Array.from(values);
  }
}
