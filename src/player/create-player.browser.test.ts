import { afterEach, describe, expect, it } from "vitest";
import { silentWav } from "../import/testing/silent-wav";
import { MusicOutput, type MusicVolume } from "./browser/music-output";
import { createPlayer } from "./create-player";
import type { MusicTrack } from "./slideshow";
import { oneSlideShow, firstFrame, viewportBox } from "./testing/browser-pictures";

let box: HTMLElement;
const urls: string[] = [];
afterEach(() => {
  box.remove();
  urls.splice(0).forEach((url) => URL.revokeObjectURL(url));
});

/** Counts the elements routed through it; at their own volume, as without Web Audio. */
class CountingMusicOutput extends MusicOutput {
  routed = 0;
  constructor() {
    super(() => null);
  }
  override route(element: HTMLMediaElement): MusicVolume {
    this.routed += 1;
    return super.route(element);
  }
}

function silentTrack(atMs: number): MusicTrack {
  const src = URL.createObjectURL(new Blob([silentWav(2000)], { type: "audio/wav" }));
  urls.push(src);
  return { src, atMs, startMs: 0, endMs: 2000, fadeInMs: 0, fadeOutMs: 1000 };
}

describe("createPlayer", () => {
  it("falls back to the DOM renderer when the browser has no WebGL2", async () => {
    box = viewportBox({ width: 160, height: 90 });
    const player = createPlayer(box, await oneSlideShow(), { webGl2Context: () => null });

    await firstFrame(player);

    expect(box.querySelector("img")).not.toBeNull();
    expect(box.querySelector("canvas")).toBeNull();
    player.destroy();
  });

  it("routes every track through the one music output, so one unlock lets them all sound", async () => {
    box = viewportBox({ width: 160, height: 90 });
    const musicOutput = new CountingMusicOutput();
    const slideshow = { ...(await oneSlideShow()), music: [silentTrack(0), silentTrack(1000)] };
    const player = createPlayer(box, slideshow, { webGl2Context: () => null, musicOutput });

    await firstFrame(player);

    expect(musicOutput.routed).toBe(2);
    player.destroy();
  });
});
