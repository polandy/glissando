import { describe, expect, it } from "vitest";
import { DeferredMusic } from "./deferred-music";
import { FakeMusic } from "./testing/fakes";

function setUp() {
  const opened: FakeMusic[] = [];
  const music = new DeferredMusic(() => {
    const fake = new FakeMusic();
    opened.push(fake);
    return fake;
  });
  return { music, opened };
}

describe("DeferredMusic", () => {
  it("opens the music at the first play, not before", async () => {
    const { music, opened } = setUp();
    music.setVolume(0.5);
    music.pause();
    expect(opened).toHaveLength(0);

    await music.play(12);
    expect(opened).toHaveLength(1);
    expect(opened[0]?.calls).toEqual(["play@12"]);
  });

  it("plays at the volume set before it was opened", async () => {
    const { music, opened } = setUp();
    music.setVolume(0.25);
    await music.play(0);
    expect(opened[0]?.volumesAtPlay).toEqual([0.25]);
  });

  it("opens once and hands every later call to that music", async () => {
    const { music, opened } = setUp();
    await music.play(3);
    music.setVolume(0.75);
    music.pause();
    await music.play(5);
    music.dispose();
    expect(opened).toHaveLength(1);
    expect(opened[0]?.calls).toEqual(["play@3", "pause", "play@5", "dispose"]);
    expect(opened[0]?.volume).toBe(0.75);
  });

  it("opens nothing when disposed unplayed", () => {
    const { music, opened } = setUp();
    music.setVolume(1);
    music.dispose();
    expect(opened).toHaveLength(0);
  });
});
