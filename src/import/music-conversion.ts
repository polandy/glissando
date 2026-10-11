/** The decoder could not read the music, so there is no FLAC copy of it. */
export class UnconvertibleMusicError extends Error {
  constructor(
    readonly fileName: string,
    options?: ErrorOptions,
  ) {
    super(`the music file "${fileName}" could not be converted to FLAC`, options);
    this.name = "UnconvertibleMusicError";
  }
}

/**
 * Makes a FLAC copy of music a target browser cannot decode (ADR-0020). Reports progress as a
 * fraction from 0 to 1; rejects with `UnconvertibleMusicError` when the decoder cannot read
 * the file, with an `AbortError` once `signal` aborts.
 */
export type ConvertMusic = (
  file: File,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
) => Promise<File>;
