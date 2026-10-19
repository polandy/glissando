import { placeChunkFrames, soundLengthFrames } from "../clip-sound-layout";
import { openClipFile } from "./open-clip";

/**
 * A clip's whole sound as one `AudioBuffer`, buffer time 0 = file time 0, so the player can play
 * a video slide's sound through Web Audio instead of the muted `<video>` element. Null for a
 * clip without a sound track, or one mediabunny cannot open at all.
 */
export async function decodeClipSound(blob: Blob): Promise<AudioBuffer | null> {
  const clip = await openClipFile(blob);
  if (clip === null) {
    return null;
  }
  try {
    if (clip.audio === null) {
      return null;
    }
    const { AudioBufferSink } = await import("./mediabunny-reader");
    const sink = new AudioBufferSink(clip.audio);
    const durationSeconds = await clip.audio.computeDuration();
    // Sized up front and filled chunk by chunk, so the decoded chunks are never held beside it.
    let assembled: AudioBuffer | null = null;
    for await (const { buffer, timestamp } of sink.buffers()) {
      if (assembled === null) {
        const length = soundLengthFrames(durationSeconds, buffer.sampleRate);
        if (length <= 0) {
          return null;
        }
        assembled = new AudioBuffer({
          numberOfChannels: buffer.numberOfChannels,
          length,
          sampleRate: buffer.sampleRate,
        });
      }
      copyChunkInto(assembled, buffer, timestamp);
    }
    return assembled;
  } finally {
    clip.dispose();
  }
}

/** Copies the part of `chunk` at or after file time 0 into `assembled`, at its placed offset. */
function copyChunkInto(assembled: AudioBuffer, chunk: AudioBuffer, timestampSeconds: number): void {
  const placement = placeChunkFrames(
    { timestampSeconds, frameCount: chunk.length },
    assembled.sampleRate,
    assembled.length,
  );
  if (placement.framesToCopy <= 0) {
    return;
  }
  for (let channel = 0; channel < assembled.numberOfChannels; channel += 1) {
    const sourceChannel = Math.min(channel, chunk.numberOfChannels - 1);
    const source = chunk
      .getChannelData(sourceChannel)
      .subarray(placement.sourceFrameOffset, placement.sourceFrameOffset + placement.framesToCopy);
    assembled.copyToChannel(source, channel, placement.targetFrameOffset);
  }
}
