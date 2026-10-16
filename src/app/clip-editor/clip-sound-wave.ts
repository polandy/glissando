/**
 * What the clip editor knows of a clip's sound: its fine peaks so far — slices not read yet are
 * 0, so the bars grow from left to right while it is read — or that the clip has no sound track.
 */
export type ClipSoundWave =
  { readonly kind: "peaks"; readonly peaks: Float32Array } | { readonly kind: "no sound" };

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
