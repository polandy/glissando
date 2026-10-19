/** A decoded chunk's timing, as mediabunny's `AudioBufferSink` reports it. */
export interface ClipSoundChunkTiming {
  /** The chunk's start, in the clip file's own time. */
  readonly timestampSeconds: number;
  readonly frameCount: number;
}

/** Where a chunk's frames land in the buffer assembled for the whole clip's sound. */
export interface ClipSoundChunkPlacement {
  /** Frame index in the assembled buffer where copying starts. */
  readonly targetFrameOffset: number;
  /** Frame index within the chunk's own buffer to start copying from. */
  readonly sourceFrameOffset: number;
  readonly framesToCopy: number;
}

/**
 * Where `chunk` lands in a buffer of `lengthFrames` whose frame 0 is file time 0. A chunk
 * timestamped before 0 (a clip's first chunk can start early) has its early frames cut, and one
 * running past the buffer's end its late frames, rather than placed off-buffer.
 */
export function placeChunkFrames(
  chunk: ClipSoundChunkTiming,
  sampleRate: number,
  lengthFrames: number,
): ClipSoundChunkPlacement {
  const rawTargetOffset = Math.round(chunk.timestampSeconds * sampleRate);
  const sourceFrameOffset = Math.max(0, -rawTargetOffset);
  const targetFrameOffset = Math.min(lengthFrames, Math.max(0, rawTargetOffset));
  return {
    targetFrameOffset,
    sourceFrameOffset,
    framesToCopy: Math.max(
      0,
      Math.min(chunk.frameCount - sourceFrameOffset, lengthFrames - targetFrameOffset),
    ),
  };
}

/** The frames a buffer needs to hold `durationSeconds` of sound, from file time 0. */
export function soundLengthFrames(durationSeconds: number, sampleRate: number): number {
  return Math.ceil(durationSeconds * sampleRate);
}
