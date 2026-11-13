import { describe, expect, it } from "vitest";
import { nextEvent, setUp } from "./slideshow-player-fixtures";
import type { FakePicture } from "./testing/fakes";
import type { RenderFrame } from "./ports";

/** The source of the picture a drawn slide frame shows. */
function drawnPicture(frame: RenderFrame<FakePicture> | undefined): string | undefined {
  return frame?.kind === "slide" && frame.slide.kind === "picture"
    ? frame.slide.picture.src
    : undefined;
}

describe("SlideshowPlayer, loading, errors and destroy", () => {
  it("plays the music and the clock on while a picture is late, then shows it for the rest of its slot", async () => {
    const { player, events, music, pictures, renderer, advance } = setUp();
    const shown = nextEvent(player, "canplay");
    pictures.complete("a.jpg");
    await shown;
    player.play();
    const drawn = renderer.frames.length;

    // The transition into b starts at 3 s; b is not loaded, so a stays on screen.
    advance(3200);
    expect(player.currentTime).toBe(3.2);
    expect(events.at(-1)).toBe("waiting");
    expect(music.calls).toEqual(["play@0"]);
    expect(renderer.frames).toHaveLength(drawn);
    advance(1000);
    expect(player.currentTime).toBe(4.2);
    expect(music.calls).toEqual(["play@0"]);
    expect(events.at(-1)).toBe("waiting");

    pictures.complete("b.jpg");
    await pictures.settled("b.jpg");
    advance(300);

    expect(player.currentTime).toBe(4.5);
    expect(events.at(-1)).toBe("playing");
    expect(music.calls).toEqual(["play@0"]);
    expect(drawnPicture(renderer.frames.at(-1))).toBe("b.jpg");
  });

  it("skips a picture that arrives after its slot has passed and draws the slide that is on", async () => {
    const { player, events, pictures, renderer, advance } = setUp();
    const shown = nextEvent(player, "canplay");
    pictures.complete("a.jpg");
    await shown;
    player.play();
    const drawn = renderer.frames.length;

    // b's slot is 3–9 s; c (9–12 s) is requested while b is late and arrives first.
    advance(9500);
    expect(events.at(-1)).toBe("waiting");
    expect(pictures.requested).toEqual(["a.jpg", "b.jpg", "c.jpg"]);
    pictures.complete("c.jpg");
    await pictures.settled("c.jpg");
    advance(100);

    expect(player.currentTime).toBe(9.6);
    expect(events.at(-1)).toBe("playing");
    expect(renderer.frames).toHaveLength(drawn + 1);
    expect(drawnPicture(renderer.frames.at(-1))).toBe("c.jpg");

    const released = pictures.nextRelease();
    pictures.complete("b.jpg");
    expect(await released).toBe("b.jpg");
    advance(100);
    expect(renderer.frames).toHaveLength(drawn + 2);
    expect(renderer.frames.slice(drawn).map(drawnPicture)).toEqual(["c.jpg", "c.jpg"]);
  });

  it("reports a picture that fails to load at its turn as an error, once, and pauses the music", async () => {
    const { player, events, music, pictures, advance } = setUp();
    const shown = nextEvent(player, "canplay");
    pictures.complete("a.jpg");
    await shown;
    player.play();
    advance(3200);
    advance(100);
    expect(events.at(-1)).toBe("waiting");

    const failed = nextEvent(player, "error");
    pictures.fail("b.jpg", new Error("fetch failed"));
    await failed;
    advance(100);

    expect(player.paused).toBe(true);
    expect(player.currentTime).toBe(3.3);
    expect(player.error?.message).toContain("b.jpg");
    expect(music.calls).toEqual(["play@0", "pause"]);
    expect(events).toEqual(["canplay", "play", "playing", "waiting", "pause", "error"]);
  });

  it("ends on a frame that lands past the end once the last picture has loaded", async () => {
    const { player, events, pictures, renderer, ready, advance } = setUp();
    await ready();
    player.play();

    // One late frame, as after a busy main thread or a hidden tab, skips the last slide.
    advance(13_000);
    expect(player.currentTime).toBe(12);
    expect(events.at(-1)).toBe("waiting");
    expect(player.ended).toBe(false);

    const ended = nextEvent(player, "ended");
    pictures.complete("c.jpg");
    await ended;

    expect(player.paused).toBe(true);
    expect(renderer.frames.at(-1)?.kind).toBe("slide");
  });

  it("preloads the next slide and releases the slides it has left behind", async () => {
    const { player, pictures, renderer, ready, advance } = setUp();
    await ready();
    expect(pictures.requested).toEqual(["a.jpg", "b.jpg"]);

    player.play();
    advance(5000);

    expect(pictures.requested).toEqual(["a.jpg", "b.jpg", "c.jpg"]);
    expect(renderer.forgotten).toEqual(["a.jpg"]);
    expect(pictures.released).toEqual(["a.jpg"]);
  });

  it("preloads as many slides ahead as it is told", async () => {
    const { pictures, ready } = setUp({ picturesAhead: 2 });
    await ready();

    expect(pictures.requested).toEqual(["a.jpg", "b.jpg", "c.jpg"]);
  });

  it.each([-1, 1.5])("refuses to preload %s slides ahead", (picturesAhead) => {
    expect(() => setUp({ picturesAhead })).toThrow(RangeError);
  });

  it("releases a picture that arrives after the player moved past it", async () => {
    const { player, pictures } = setUp();
    const seeked = nextEvent(player, "seeked");
    player.currentTime = 10;
    pictures.complete("c.jpg");
    await seeked;

    const released = pictures.nextRelease();
    pictures.complete("a.jpg");
    expect(await released).toBe("a.jpg");
  });

  it("reports a picture that fails to load as an error and pauses", async () => {
    const { player, events, pictures } = setUp();
    const failed = nextEvent(player, "error");
    player.play();

    pictures.fail("a.jpg", new Error("decode failed"));
    await failed;

    expect(player.paused).toBe(true);
    expect(player.error?.message).toContain("a.jpg");
    expect(player.error?.cause).toEqual(new Error("decode failed"));
    expect(events).toEqual(["play", "waiting", "pause", "error"]);
  });

  it("reports music the browser refuses to play as an error and pauses", async () => {
    const { player, music, ready } = setUp();
    await ready();
    const refusal = new Error("NotAllowedError");
    music.refuseNextPlay(refusal);
    const failed = nextEvent(player, "error");

    player.play();
    await failed;

    expect(player.error?.cause).toBe(refusal);
    expect(player.paused).toBe(true);
  });

  it("frees everything on destroy and refuses to play afterwards", async () => {
    const { player, renderer, pictures, music, frames, ready } = setUp();
    await ready();
    player.play();

    player.destroy();

    expect(renderer.disposed).toBe(true);
    expect(pictures.released).toEqual(["a.jpg", "b.jpg"]);
    expect(pictures.disposed).toBe(true);
    expect(music.calls.at(-1)).toBe("dispose");
    expect(frames.hasPendingFrame).toBe(false);
    expect(() => player.play()).toThrow(/destroyed/);
  });

  it("draws the current frame again on redraw, e.g. after a resize", async () => {
    const { player, renderer, ready } = setUp();
    await ready();
    const drawn = renderer.frames.length;

    player.redraw();

    expect(renderer.frames).toHaveLength(drawn + 1);
  });
});
