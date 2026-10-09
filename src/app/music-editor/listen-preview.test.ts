import { describe, expect, it } from "vitest";
import { FakeClock, FakeFrameScheduler, FakeMusic } from "../../player/testing/fakes";
import { ListenPreview, listenRange, type ListenState } from "./listen-preview";

/** Heard from 12 s to 150 s of the track, fading in 2 s and out 4 s. */
const TIMING = { startMs: 12_000, endMs: 150_000, fadeInMs: 2000, fadeOutMs: 4000 };

function setUp() {
  const clock = new FakeClock();
  const frames = new FakeFrameScheduler();
  const music = new FakeMusic();
  const errors: unknown[] = [];
  const states: (ListenState | null)[] = [];
  const preview = new ListenPreview(
    { clock, frames, music, onError: (error) => errors.push(error) },
    (state) => states.push(state),
  );
  const after = (ms: number) => {
    clock.advance(ms);
    frames.runFrame();
  };
  return { preview, music, states, errors, after, frames };
}

describe("listenRange", () => {
  it("is the excerpt's first 8 s for its start", () => {
    expect(listenRange("start", TIMING)).toEqual({ fromMs: 12_000, toMs: 20_000 });
  });

  it("is the last 8 s before the audible end for its end", () => {
    expect(listenRange("end", TIMING)).toEqual({ fromMs: 142_000, toMs: 150_000 });
  });

  it("never reaches outside an excerpt shorter than 8 s", () => {
    const short = { ...TIMING, endMs: 17_000 };

    expect(listenRange("start", short)).toEqual({ fromMs: 12_000, toMs: 17_000 });
    expect(listenRange("end", short)).toEqual({ fromMs: 12_000, toMs: 17_000 });
  });
});

describe("ListenPreview", () => {
  it("plays the start from the excerpt's start, silent at the start of the fade-in", () => {
    const { preview, music, states } = setUp();

    preview.toggle("start", TIMING);

    expect(music.calls).toEqual(["play@12"]);
    expect(music.volume).toBe(0);
    expect(states.at(-1)).toEqual({ kind: "start", positionMs: 12_000 });
  });

  it("follows the fade envelope and moves the playhead on every frame", () => {
    const { preview, music, states, after } = setUp();
    preview.toggle("start", TIMING);

    after(1000);

    expect(music.volume).toBeCloseTo(0.5);
    expect(states.at(-1)).toEqual({ kind: "start", positionMs: 13_000 });
  });

  it("fades the end out to silence at the audible end", () => {
    const { preview, music, after } = setUp();
    preview.toggle("end", TIMING);

    after(6000);

    expect(music.calls).toEqual(["play@142"]);
    expect(music.volume).toBeCloseTo(0.5);
  });

  it("stops by itself at the end of its range", () => {
    const { preview, music, states, after, frames } = setUp();
    preview.toggle("start", TIMING);

    after(8000);

    expect(states.at(-1)).toBeNull();
    expect(music.calls).toEqual(["play@12", "pause"]);
    expect(frames.hasPendingFrame).toBe(false);
  });

  it("toggled again pauses", () => {
    const { preview, music, states } = setUp();
    preview.toggle("start", TIMING);

    preview.toggle("start", TIMING);

    expect(states.at(-1)).toBeNull();
    expect(music.calls).toEqual(["play@12", "pause"]);
  });

  it("switches straight from the start to the end", () => {
    const { preview, music, states } = setUp();
    preview.toggle("start", TIMING);

    preview.toggle("end", TIMING);

    expect(music.calls).toEqual(["play@12", "pause", "play@142"]);
    expect(states.at(-1)).toEqual({ kind: "end", positionMs: 142_000 });
  });

  it("reports music the browser refuses to play, and stops", async () => {
    const { preview, music, states, errors } = setUp();
    const refusal = new Error("NotAllowedError");
    music.refuseNextPlay(refusal);

    preview.toggle("start", TIMING);
    await preview.settled();

    expect(errors).toEqual([refusal]);
    expect(states.at(-1)).toBeNull();
  });

  it("lets go of the audio when disposed", () => {
    const { preview, music } = setUp();
    preview.toggle("start", TIMING);

    preview.dispose();

    expect(music.calls.at(-1)).toBe("dispose");
  });
});
