import { describe, expect, it } from "vitest";
import { FakeClock } from "../player/testing/fakes";
import { exportVideo, type ExportProgress } from "./export-video";
import {
  FakeAudioEncoder,
  FakeAudioSource,
  FakeFrameSource,
  FakeMuxer,
  FakeSink,
  FakeVideoEncoder,
  type ExportLog,
} from "./testing/fakes";

function setUp({ durationMs = 100, withMusic = false } = {}) {
  const log: ExportLog = [];
  const frames = new FakeFrameSource(log);
  const videoEncoder = new FakeVideoEncoder(log);
  const audioSource = new FakeAudioSource(log);
  const audioEncoder = new FakeAudioEncoder(log);
  const muxer = new FakeMuxer(log);
  const sink = new FakeSink(log);
  const clock = new FakeClock();
  const controller = new AbortController();
  const progress: ExportProgress[] = [];
  const run = () =>
    exportVideo({
      durationMs,
      frames,
      videoEncoder,
      audio: withMusic ? { source: audioSource, encoder: audioEncoder } : null,
      muxer,
      sink,
      clock,
      signal: controller.signal,
      onProgress: (update) => progress.push(update),
    });
  return {
    log,
    frames,
    videoEncoder,
    audioSource,
    audioEncoder,
    muxer,
    clock,
    controller,
    progress,
    run,
  };
}

function quotaExceeded(): DOMException {
  return new DOMException("the disk is full", "QuotaExceededError");
}

describe("exportVideo", () => {
  it("draws every frame at n / 30 s of the export's own time, stamped in µs", async () => {
    const { frames, videoEncoder, run } = setUp({ durationMs: 100 });

    expect(await run()).toEqual({ kind: "done", frames: 3 });

    expect(videoEncoder.encoded.map((frame) => frame.label)).toEqual([
      "0s 0+33333",
      `${1 / 30}s 33333+33334`,
      `${2 / 30}s 66667+33333`,
    ]);
    expect(frames.frames.every((frame) => frame.closed)).toBe(true);
  });

  it("asks for a keyframe every 60 frames", async () => {
    const { videoEncoder, run } = setUp({ durationMs: 4100 });

    await run();

    const keyFrames = videoEncoder.encoded.flatMap((frame, index) =>
      frame.keyFrame ? [index] : [],
    );
    expect(keyFrames).toEqual([0, 60, 120]);
  });

  it("flushes both encoders, then finalizes the file", async () => {
    const { log, run } = setUp({ durationMs: 34, withMusic: true });

    await run();

    expect(log.slice(-3)).toEqual(["flush video", "flush audio", "finalize"]);
  });

  it("waits for a dequeue while more than two frames are queued in the encoder", async () => {
    const { videoEncoder, run } = setUp({ durationMs: 200 });
    videoEncoder.holdQueue = true;
    const waiting = videoEncoder.nextWait();

    const running = run();
    await waiting;
    expect(videoEncoder.encoded).toHaveLength(3);
    videoEncoder.holdQueue = false;
    videoEncoder.dequeue();

    expect(await running).toEqual({ kind: "done", frames: 6 });
  });

  it("hands each 30 s audio segment over once the video reaches its start", async () => {
    const { log, audioEncoder, audioSource, run } = setUp({ durationMs: 61_000, withMusic: true });

    await run();

    const handedOver = log.filter(
      (entry) => entry.startsWith("audio") || entry === "frame 30" || entry === "frame 60",
    );
    expect(handedOver).toEqual(["audio 0", "audio 30", "frame 30", "audio 60", "frame 60"]);
    expect(audioEncoder.encoded.map((segment) => segment.sampleCount)).toEqual([
      1_440_000, 1_440_000, 48_000,
    ]);
    expect(audioSource.blocks.every((block) => block.closed)).toBe(true);
  });

  it("writes no audio for a slideshow without music", async () => {
    const { log, run } = setUp({ durationMs: 100 });

    await run();

    expect(log).toContain("finalize");
    expect(log.some((entry) => entry.includes("audio"))).toBe(false);
  });

  it("reports frames done of the total and the time left from the time per frame so far", async () => {
    const { frames, clock, progress, run } = setUp({ durationMs: 100 });
    frames.onFrame = () => clock.advance(500);

    await run();

    expect(progress).toEqual([
      { framesDone: 1, framesTotal: 3, remainingMs: 1000 },
      { framesDone: 2, framesTotal: 3, remainingMs: 500 },
      { framesDone: 3, framesTotal: 3, remainingMs: 0 },
    ]);
  });

  it("cancels at once on abort: closes the encoders, cancels the muxer, discards the file", async () => {
    const { log, frames, controller, run } = setUp({ durationMs: 1000, withMusic: true });
    frames.onFrame = (index) => {
      if (index === 5) {
        controller.abort();
      }
    };

    expect(await run()).toEqual({ kind: "cancelled" });

    expect(log.filter((entry) => entry === "encode video")).toHaveLength(5);
    expect(log.slice(-4)).toEqual(["close video", "close audio", "cancel muxer", "discard file"]);
    expect(frames.frames).toHaveLength(6);
    expect(frames.frames.every((frame) => frame.closed)).toBe(true);
  });

  it("cancels while it waits for the encoder to dequeue", async () => {
    const { log, videoEncoder, controller, run } = setUp({ durationMs: 1000 });
    videoEncoder.holdQueue = true;
    const waiting = videoEncoder.nextWait();

    const running = run();
    await waiting;
    controller.abort();

    expect(await running).toEqual({ kind: "cancelled" });
    expect(log.at(-1)).toBe("discard file");
  });

  it("ends storage-full at the frame reached when a write runs out of space", async () => {
    const { log, muxer, run } = setUp({ durationMs: 1000 });
    muxer.failWrittenAt(8, quotaExceeded());

    expect(await run()).toEqual({ kind: "storage-full", frameReached: 7 });
    expect(log.slice(-3)).toEqual(["close video", "cancel muxer", "discard file"]);
  });

  it("still discards the file and ends storage-full when cancelling the failed file rejects too", async () => {
    const { log, muxer, run } = setUp({ durationMs: 1000 });
    const error = quotaExceeded();
    muxer.failWrittenAt(8, error);
    muxer.failCancelWith(error);

    expect(await run()).toEqual({ kind: "storage-full", frameReached: 7 });
    expect(log.slice(-2)).toEqual(["cancel muxer", "discard file"]);
  });

  it("ends storage-full when the encoder's flush runs out of space", async () => {
    const { videoEncoder, frames, run } = setUp({ durationMs: 100 });
    frames.onFrame = (index) => {
      if (index === 2) {
        videoEncoder.failWith(quotaExceeded());
      }
    };

    expect(await run()).toEqual({ kind: "storage-full", frameReached: 2 });
  });

  it("fails with any other error, after the same clean-up", async () => {
    const { log, frames, run } = setUp({ durationMs: 1000 });
    const error = new Error("the picture is gone");
    frames.failAt(3, error);

    expect(await run()).toEqual({ kind: "failed", error });
    expect(log.slice(-3)).toEqual(["close video", "cancel muxer", "discard file"]);
  });
});
