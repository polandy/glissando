import { describe, expect, it } from "vitest";
import { nextEvent, setUp } from "./slideshow-player-fixtures";

describe("SlideshowPlayer, loading, errors and destroy", () => {
  it("waits for a picture that is not loaded yet, then goes on from the same time", async () => {
    const { player, events, music, pictures, advance } = setUp();
    const shown = nextEvent(player, "canplay");
    pictures.complete("a.jpg");
    await shown;
    player.play();

    advance(3200);
    expect(player.currentTime).toBe(3.2);
    expect(events.at(-1)).toBe("waiting");
    expect(music.calls.at(-1)).toBe("pause");
    advance(1000);
    expect(player.currentTime).toBe(3.2);

    const playing = nextEvent(player, "playing");
    pictures.complete("b.jpg");
    await playing;
    advance(300);

    expect(player.currentTime).toBe(3.5);
    expect(music.calls.at(-1)).toBe("play@3.2");
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
