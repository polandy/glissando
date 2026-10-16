import { FINE_PEAK_COUNT } from "../music-editor/decode-peaks";

const MS_PER_SECOND = 1000;
/** Report once filled by this many slices (1 % of `FINE_PEAK_COUNT`), so the bars visibly grow. */
const REPORT_STEP_SLICES = FINE_PEAK_COUNT / 100;

/**
 * Collects the loudest absolute sample across all channels in each of `FINE_PEAK_COUNT` even time
 * slices of a clip `sourceMs` long, as buffers decoded from it arrive. Raw amplitudes: the bars
 * normalise them (`waveformPeaks`).
 */
export class FinePeaks {
  readonly #peaks = new Float32Array(FINE_PEAK_COUNT);
  readonly #sourceSeconds: number;
  readonly #sliceSeconds: number;
  /** The slice past the last one any buffer has reached so far. */
  #furthestSlice = 0;
  #lastReportedSlice = 0;

  constructor(sourceMs: number) {
    this.#sourceSeconds = sourceMs / MS_PER_SECOND;
    this.#sliceSeconds = this.#sourceSeconds / FINE_PEAK_COUNT;
  }

  /**
   * Folds one decoded buffer's samples, starting `startSeconds` into the clip, into their slices.
   * Looped per overlapping slice, never per sample, so a long clip stays cheap to fold. Samples
   * before 0 or past the clip's end are ignored.
   */
  add(startSeconds: number, sampleRate: number, channels: readonly Float32Array[]): void {
    const sampleCount = channels[0]?.length ?? 0;
    if (sampleCount === 0 || this.#sliceSeconds <= 0) return;
    const endSeconds = startSeconds + sampleCount / sampleRate;
    if (endSeconds <= 0 || startSeconds >= this.#sourceSeconds) return;

    const firstSlice = this.#clampSlice(Math.floor(startSeconds / this.#sliceSeconds));
    const lastSlice = this.#clampSlice(Math.ceil(endSeconds / this.#sliceSeconds) - 1);
    for (let slice = firstSlice; slice <= lastSlice; slice += 1) {
      const sliceStartSeconds = slice * this.#sliceSeconds;
      const sliceEndSeconds = sliceStartSeconds + this.#sliceSeconds;
      const fromSample = Math.max(0, Math.ceil((sliceStartSeconds - startSeconds) * sampleRate));
      const toSample = Math.min(
        sampleCount,
        Math.ceil((sliceEndSeconds - startSeconds) * sampleRate),
      );
      let peak = this.#peaks[slice] ?? 0;
      for (const channel of channels) {
        for (let index = fromSample; index < toSample; index += 1) {
          peak = Math.max(peak, Math.abs(channel[index] ?? 0));
        }
      }
      this.#peaks[slice] = peak;
    }
    this.#furthestSlice = Math.max(this.#furthestSlice, lastSlice + 1);
  }

  /**
   * True once per `REPORT_STEP_SLICES` filled since it last was, so a caller copies the peaks
   * only that often.
   */
  reachedStep(): boolean {
    const reached = this.#furthestSlice - this.#lastReportedSlice >= REPORT_STEP_SLICES;
    if (reached) this.#lastReportedSlice = this.#furthestSlice;
    return reached;
  }

  /** A copy of the peaks read so far, which later `add` calls leave as it is. */
  snapshot(): Float32Array {
    return this.#peaks.slice();
  }

  #clampSlice(slice: number): number {
    return Math.min(FINE_PEAK_COUNT - 1, Math.max(0, slice));
  }
}
