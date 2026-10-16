/**
 * What the clip editor knows of a clip's sound: its fine peaks so far — slices not read yet are
 * 0, so the bars grow from left to right while it is read — that the clip has no sound track, or
 * that its sound cannot be read here (a damaged file, a codec or decoder this browser lacks).
 */
export type ClipSoundWave =
  | { readonly kind: "peaks"; readonly peaks: Float32Array }
  | { readonly kind: "no sound" }
  | { readonly kind: "unreadable" };

/**
 * Reads the sound of the clip file `blob`, `sourceMs` long, streamed from the file, and reports
 * each step to `onWave`. Settles once it is read, or soon after `signal` aborts, never reporting
 * again after that.
 */
export type ReadClipPeaks = (
  blob: Blob,
  sourceMs: number,
  signal: AbortSignal,
  onWave: (wave: ClipSoundWave) => void,
) => Promise<void>;
