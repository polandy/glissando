import { describe, expect, it } from "vitest";
import { nextEvent, setUp } from "./slideshow-player-fixtures";

describe("SlideshowPlayer, music, seeking and the end", () => {
  it("resumes the music where it paused", async () => {
    const { player, music, ready, advance } = setUp();
    await ready();
    player.play();
    advance(1500);
    player.pause();

    player.play();

    expect(music.calls.at(-1)).toBe("play@1.5");
  });

  it("draws the frame at a new time when seeking while paused", async () => {
    const { player, renderer, pictures, ready } = setUp();
    await ready();
    const seeked = nextEvent(player, "seeked");

    player.currentTime = 10.5;
    pictures.complete("c.jpg");
    await seeked;

    expect(player.paused).toBe(true);
    expect(renderer.lastFrame).toMatchObject({
      kind: "slide",
      slide: { picture: { src: "c.jpg" } },
    });
  });

  it.each([
    [-5, 0],
    [99, 12],
  ])("clamps a seek to %d s to %d s", async (requested, expected) => {
    const { player, ready } = setUp();
    await ready();

    player.currentTime = requested;

    expect(player.currentTime).toBe(expected);
  });

  it("continues from the new time and moves the music when seeking while playing", async () => {
    const { player, music, ready, advance } = setUp();
    await ready();
    player.play();
    advance(500);

    player.currentTime = 2;
    advance(1000);

    expect(player.currentTime).toBe(3);
    expect(music.calls.at(-1)).toBe("play@2");
  });

  it("stops at the end: ended, paused, music paused", async () => {
    const { player, events, music, pictures, ready, advance } = setUp();
    await ready();
    player.currentTime = 11;
    pictures.complete("c.jpg");
    await nextEvent(player, "seeked");
    player.play();

    advance(5000);

    expect(player.currentTime).toBe(12);
    expect(player.ended).toBe(true);
    expect(player.paused).toBe(true);
    expect(events.slice(-2)).toEqual(["pause", "ended"]);
    expect(music.calls.at(-1)).toBe("pause");
  });

  it("restarts from the beginning when played after the end", async () => {
    const { player, pictures, ready, advance } = setUp();
    await ready();
    player.currentTime = 11;
    pictures.complete("c.jpg");
    await nextEvent(player, "seeked");
    player.play();
    advance(5000);
    const playing = nextEvent(player, "playing");

    player.play();
    pictures.complete("a.jpg");
    await playing;

    expect(player.currentTime).toBe(0);
    expect(player.ended).toBe(false);
  });
});
