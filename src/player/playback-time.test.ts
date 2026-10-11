import { describe, expect, it } from "vitest";
import { PlaybackTime } from "./playback-time";
import { FakeClock } from "./testing/fakes";

const DURATION_MS = 10_000;

function playbackTime(): { time: PlaybackTime; clock: FakeClock } {
  const clock = new FakeClock();
  return { time: new PlaybackTime(clock, DURATION_MS), clock };
}

describe("PlaybackTime", () => {
  it("stays where it is held while the clock runs", () => {
    const { time, clock } = playbackTime();
    time.holdAt(2_000);
    clock.advance(500);
    expect(time.liveMs()).toBe(2_000);
    expect(time.frameMs).toBe(2_000);
  });

  it("clamps a held time to the slideshow", () => {
    const { time } = playbackTime();
    time.holdAt(-1);
    expect(time.frameMs).toBe(0);
    time.holdAt(DURATION_MS + 1);
    expect(time.frameMs).toBe(DURATION_MS);
    expect(time.isAtEnd).toBe(true);
  });

  it("advances with the clock, and the frame time follows only on catching up", () => {
    const { time, clock } = playbackTime();
    time.holdAt(1_000);
    time.startAdvancing();
    clock.advance(300);
    expect(time.liveMs()).toBe(1_300);
    expect(time.frameMs).toBe(1_000);
    expect(time.catchUp()).toBe(1_300);
    expect(time.frameMs).toBe(1_300);
  });

  it("never runs past the end", () => {
    const { time, clock } = playbackTime();
    time.holdAt(DURATION_MS - 100);
    time.startAdvancing();
    clock.advance(500);
    expect(time.liveMs()).toBe(DURATION_MS);
  });

  it("holds at the live time when it stops advancing, and says it was advancing", () => {
    const { time, clock } = playbackTime();
    time.startAdvancing();
    clock.advance(400);
    expect(time.stopAdvancing()).toBe(true);
    clock.advance(400);
    expect(time.liveMs()).toBe(400);
    expect(time.stopAdvancing()).toBe(false);
  });
});
