import type { AudioCodecChoice } from "../capabilities";
import { FRAMES_PER_SECOND } from "../plan";
import type { MuxerPort } from "../ports";
import type { AudioChunkOutput, VideoChunkOutput } from "./encoders";

export interface Mp4MuxerOptions {
  /** Where the file is written, at positions; a `FileSystemWritableFileStream` takes these. */
  readonly writable: WritableStream;
  readonly audioCodec: AudioCodecChoice | null;
  /** Upper bounds, for the index reserved at the file's start. */
  readonly maxPackets: { readonly video: number; readonly audio: number };
}

export interface Mp4Muxer {
  readonly port: MuxerPort;
  readonly addVideo: VideoChunkOutput;
  /** Null without an audio track. */
  readonly addAudio: AudioChunkOutput | null;
}

/**
 * A progressive MP4 with its `moov` up front, streamed to `writable` (ADR-0015). mediabunny is
 * loaded here, on the first export, never with the player.
 */
export async function createMp4Muxer({
  writable,
  audioCodec,
  maxPackets,
}: Mp4MuxerOptions): Promise<Mp4Muxer> {
  const mediabunny = await import("./mediabunny-writer");
  const output = new mediabunny.Output({
    format: new mediabunny.Mp4OutputFormat({ fastStart: "reserve" }),
    target: new mediabunny.StreamTarget(writable),
  });
  const video = new mediabunny.EncodedVideoPacketSource("avc");
  output.addVideoTrack(video, {
    frameRate: FRAMES_PER_SECOND,
    maximumPacketCount: maxPackets.video,
  });
  const audio = audioCodec === null ? null : new mediabunny.EncodedAudioPacketSource(audioCodec);
  if (audio !== null) {
    output.addAudioTrack(audio, { maximumPacketCount: maxPackets.audio });
  }
  await output.start();

  // Packets go in one at a time, in the order the encoders emit them.
  let written: Promise<void> = Promise.resolve();
  const enqueue = (add: () => Promise<void>) => {
    written = written.then(add);
    // The error reaches the run through `written()`; this keeps it from going unhandled meanwhile.
    written.catch(() => undefined);
  };
  return {
    port: {
      written: () => written,
      finalize: async () => {
        await written;
        await output.finalize();
      },
      cancel: () => output.cancel(),
    },
    addVideo: (chunk, meta) =>
      enqueue(() => video.add(mediabunny.EncodedPacket.fromEncodedChunk(chunk), meta)),
    addAudio:
      audio === null
        ? null
        : (chunk, meta) =>
            enqueue(() => audio.add(mediabunny.EncodedPacket.fromEncodedChunk(chunk), meta)),
  };
}
