import { openClipFile } from "../../video-export/browser/open-clip";
import type { ReadClipPeaks } from "./clip-sound-wave";
import { FinePeaks } from "./fine-peaks";

/** Reads a clip's sound from its file, streamed, with mediabunny behind a lazy import (ADR-0035). */
export const readClipPeaksWithMediabunny: ReadClipPeaks = async (
  blob,
  sourceMs,
  signal,
  onWave,
) => {
  if (signal.aborted) return;
  const clip = await openClipFile(blob);
  if (clip === null) {
    throw new Error("mediabunny cannot open this clip file to read its sound");
  }
  try {
    if (signal.aborted) return;
    if (clip.audio === null) {
      onWave({ kind: "no sound" });
      return;
    }
    const { AudioBufferSink } = await import("../../video-export/browser/mediabunny-reader");
    if (signal.aborted) return;
    const sink = new AudioBufferSink(clip.audio);
    const fine = new FinePeaks(sourceMs);
    const reportPeaks = (peaks: Float32Array): void => onWave({ kind: "peaks", peaks });
    reportPeaks(fine.snapshot());

    for await (const { buffer, timestamp } of sink.buffers()) {
      const channels = Array.from({ length: buffer.numberOfChannels }, (_, channel) =>
        buffer.getChannelData(channel),
      );
      fine.add(timestamp, buffer.sampleRate, channels);
      if (signal.aborted) break;
      if (fine.reachedStep()) reportPeaks(fine.snapshot());
    }
    if (!signal.aborted) reportPeaks(fine.snapshot());
  } finally {
    clip.dispose();
  }
};
