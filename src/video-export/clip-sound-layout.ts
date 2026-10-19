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
 * Where `chunk` lands in a buffer whose frame 0 is file time 0. A chunk timestamped before 0
 * (a clip's first chunk can start early) has its early frames cut rather than placed off-buffer.
 */
export function placeChunkFrames(
  chunk: ClipSoundChunkTiming,
  sampleRate: number,
): ClipSoundChunkPlacement {
  const rawTargetOffset = Math.round(chunk.timestampSeconds * sampleRate);
  const sourceFrameOffset = Math.max(0, -rawTargetOffset);
  return {
    targetFrameOffset: Math.max(0, rawTargetOffset),
    sourceFrameOffset,
    framesToCopy: Math.max(0, chunk.frameCount - sourceFrameOffset),
  };
}

/** The assembled buffer's length in frames, from file time 0 to the last chunk's end. */
export function assembledSoundLength(lastChunk: ClipSoundChunkTiming, sampleRate: number): number {
  const placement = placeChunkFrames(lastChunk, sampleRate);
  return placement.targetFrameOffset + placement.framesToCopy;
}
