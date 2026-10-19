import { describe, expect, it } from "vitest";
import { MILLISECONDS_PER_SECOND } from "../slideshow";
import type {
  AudioBufferSourceNodeLike,
  AudioNodeLike,
  ClipSoundContext,
  ClipSoundOutput,
  GainNodeLike,
} from "./music-output";
import { CLIP_SOUND_RESYNC_MS, ClipSoundTrack } from "./clip-sound-track";

const END_MS = 10_000;

class FakeNode implements AudioNodeLike {
  readonly connections: AudioNodeLike[] = [];
  connect(destination: AudioNodeLike): void {
    this.connections.push(destination);
  }
  disconnect(): void {
    this.connections.length = 0;
  }
}

class FakeGain extends FakeNode implements GainNodeLike {
  disconnected = false;
  readonly scheduled: (readonly [number, number])[] = [];
  readonly gain = {
    setValueAtTime: (value: number, startTime: number) => {
      this.scheduled.push([value, startTime]);
    },
  };
  override disconnect(): void {
    this.disconnected = true;
    super.disconnect();
  }
}

class FakeBufferSource extends FakeNode implements AudioBufferSourceNodeLike {
  buffer: AudioBuffer | null = null;
  readonly startCalls: (readonly [number | undefined, number | undefined, number | undefined])[] =
    [];
  stopCalls = 0;
  start(when?: number, offset?: number, duration?: number): void {
    this.startCalls.push([when, offset, duration]);
  }
  stop(): void {
    this.stopCalls += 1;
  }
}

class FakeContext implements ClipSoundContext {
  currentTime = 0;
  readonly gains: FakeGain[] = [];
  readonly sources: FakeBufferSource[] = [];
  createGain(): FakeGain {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
  createBufferSource(): FakeBufferSource {
    const source = new FakeBufferSource();
    this.sources.push(source);
    return source;
  }
}

function outputWith(context: FakeContext): { output: ClipSoundOutput; destination: FakeNode } {
  const destination = new FakeNode();
  return { output: { context, destination }, destination };
}

/** A decoded buffer ready before the track is even asked to play. */
async function decodedTrack(context: FakeContext, buffer: AudioBuffer | null = {} as AudioBuffer) {
  const { output } = outputWith(context);
  const track = new ClipSoundTrack(Promise.resolve(buffer), output, END_MS);
  // The constructor's `.then` settles on a microtask, even for an already-resolved promise.
  await Promise.resolve();
  return track;
}

describe("ClipSoundTrack", () => {
  it("connects its gain to the output's destination", () => {
    const context = new FakeContext();
    const { output, destination } = outputWith(context);

    new ClipSoundTrack(Promise.resolve(null), output, END_MS);

    expect(context.gains[0]?.connections).toEqual([destination]);
  });

  it("stays silent until its buffer is decoded, then starts where the clock then is", async () => {
    let resolveDecode: (buffer: AudioBuffer | null) => void = () => undefined;
    const decoded = new Promise<AudioBuffer | null>((resolve) => (resolveDecode = resolve));
    const context = new FakeContext();
    const { output } = outputWith(context);
    const track = new ClipSoundTrack(decoded, output, END_MS);
    const buffer = {} as AudioBuffer;

    track.play(0);
    track.follow(500);
    expect(context.sources).toHaveLength(0);

    resolveDecode(buffer);
    await Promise.resolve();
    track.follow(500);

    expect(context.sources[0]?.buffer).toBe(buffer);
  });

  it("stays silent when the decode settles to null, e.g. a decode failure", async () => {
    const context = new FakeContext();
    const track = await decodedTrack(context, null);

    track.play(0);
    track.follow(0);

    expect(context.sources).toHaveLength(0);
  });

  it("starts the source at the clip's offset, for the time remaining to endMs", async () => {
    const context = new FakeContext();
    context.currentTime = 3;
    const buffer = {} as AudioBuffer;
    const track = await decodedTrack(context, buffer);

    track.play(2000);

    const source = context.sources[0];
    expect(source?.buffer).toBe(buffer);
    expect(source?.startCalls).toEqual([[3, 2, 8]]);
  });

  it("does not restart while its position tracks the clip clock within the resync tolerance", async () => {
    const context = new FakeContext();
    const track = await decodedTrack(context);
    track.play(0);
    context.currentTime = (CLIP_SOUND_RESYNC_MS - 1) / MILLISECONDS_PER_SECOND;

    track.follow(0);

    expect(context.sources).toHaveLength(1);
  });

  it("restarts once its position drifts from the clip clock by more than the tolerance", async () => {
    const context = new FakeContext();
    const track = await decodedTrack(context);
    track.play(0);
    context.currentTime = (CLIP_SOUND_RESYNC_MS + 1) / MILLISECONDS_PER_SECOND;

    track.follow(0);

    expect(context.sources).toHaveLength(2);
    expect(context.sources[0]?.stopCalls).toBe(1);
  });

  it("stops the source once the clip reaches endMs", async () => {
    const context = new FakeContext();
    const track = await decodedTrack(context);
    track.play(0);

    track.follow(END_MS);

    expect(context.sources[0]?.stopCalls).toBe(1);
  });

  it("silences the clip on stop, and does not resume until play is called again", async () => {
    const context = new FakeContext();
    const track = await decodedTrack(context);
    track.play(0);

    track.stop();
    track.follow(500);

    expect(context.sources).toHaveLength(1);
    expect(context.sources[0]?.stopCalls).toBe(1);
  });

  it("starts fresh at the given clip time when played again after a stop", async () => {
    const context = new FakeContext();
    const track = await decodedTrack(context);
    track.play(0);
    track.stop();

    track.play(4000);

    expect(context.sources).toHaveLength(2);
    expect(context.sources[1]?.startCalls[0]?.[1]).toBeCloseTo(4);
  });

  it("replaces a sounding source when played again, never layering a second one over it", async () => {
    const context = new FakeContext();
    const track = await decodedTrack(context);
    track.play(0);

    track.play(4000);

    expect(context.sources).toHaveLength(2);
    expect(context.sources[0]?.stopCalls).toBe(1);
  });

  it("schedules the volume on its gain at the context's current time", () => {
    const context = new FakeContext();
    context.currentTime = 2.5;
    const { output } = outputWith(context);
    const track = new ClipSoundTrack(Promise.resolve(null), output, END_MS);

    track.setVolume(0.4);

    expect(context.gains[0]?.scheduled).toEqual([[0.4, 2.5]]);
  });

  it("disposes: stops any source and disconnects the gain", async () => {
    const context = new FakeContext();
    const track = await decodedTrack(context);
    track.play(0);

    track.dispose();

    expect(context.sources[0]?.stopCalls).toBe(1);
    expect(context.gains[0]?.disconnected).toBe(true);
  });

  it("ignores a decode that settles after dispose, so nothing starts late", async () => {
    let resolveDecode: (buffer: AudioBuffer | null) => void = () => undefined;
    const decoded = new Promise<AudioBuffer | null>((resolve) => (resolveDecode = resolve));
    const context = new FakeContext();
    const { output } = outputWith(context);
    const track = new ClipSoundTrack(decoded, output, END_MS);
    track.play(0);

    track.dispose();
    resolveDecode({} as AudioBuffer);
    await Promise.resolve();
    track.follow(0);

    expect(context.sources).toHaveLength(0);
  });

  it("stays silent for its life without Web Audio, and never throws", () => {
    const track = new ClipSoundTrack(Promise.resolve({} as AudioBuffer), null, END_MS);

    expect(() => {
      track.play(0);
      track.follow(0);
      track.setVolume(0.5);
      track.stop();
      track.dispose();
    }).not.toThrow();
  });
});
