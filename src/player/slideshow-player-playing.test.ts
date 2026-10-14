import { describe, expect, it } from "vitest";
import { setUp, slide } from "./slideshow-player-fixtures";

describe("SlideshowPlayer, playing, pausing and drawing", () => {
  it("starts paused at the beginning, lasting the sum of its slides in seconds", () => {
    const { player } = setUp();

    expect(player.duration).toBe(12);
    expect(player.currentTime).toBe(0);
    expect(player.paused).toBe(true);
    expect(player.ended).toBe(false);
  });

  it("shows the first frame as soon as its picture loaded, before playing", async () => {
    const { player, renderer, ready } = setUp();
    expect(player.ready).toBe(false);

    await ready();

    expect(player.ready).toBe(true);
    expect(renderer.lastFrame).toEqual({
      kind: "slide",
      slide: {
        kind: "picture",
        picture: { src: "a.jpg", width: 1600, height: 900 },
        motion: { kenBurns: slide("a.jpg", 4000).kenBurns, progress: 0 },
      },
      endFade: 0,
    });
  });

  it("advances with the clock on every animation frame while playing", async () => {
    const { player, renderer, ready, advance } = setUp();
    await ready();

    player.play();
    advance(2000);

    expect(player.currentTime).toBe(2);
    expect(renderer.lastFrame).toMatchObject({
      kind: "slide",
      slide: { motion: { progress: 0.5 } },
    });
  });

  it("fires play and playing, and starts the music at the current time", async () => {
    const { player, events, music, ready } = setUp();
    await ready();

    player.play();

    expect(events).toEqual(["canplay", "play", "playing"]);
    expect(music.calls).toEqual(["play@0"]);
  });

  it("draws a transition with both pictures and eased progress", async () => {
    const { player, renderer, ready, advance } = setUp();
    await ready();

    player.play();
    advance(3250);

    expect(renderer.lastFrame).toMatchObject({
      kind: "transition",
      effect: "wipe-right",
      progress: 0.0625,
      from: { picture: { src: "a.jpg" } },
      to: { picture: { src: "b.jpg" }, motion: { progress: 250 / 6000 } },
    });
  });

  it("holds the time on pause and pauses the music", async () => {
    const { player, events, music, ready, advance, frames } = setUp();
    await ready();
    player.play();
    advance(1000);

    player.pause();
    advance(1000);

    expect(player.currentTime).toBe(1);
    expect(player.paused).toBe(true);
    expect(frames.hasPendingFrame).toBe(false);
    expect(events.at(-1)).toBe("pause");
    expect(music.calls).toEqual(["play@0", "pause"]);
  });
});
