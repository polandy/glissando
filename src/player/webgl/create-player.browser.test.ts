import { afterEach, describe, expect, it } from "vitest";
import { createPlayer } from "../create-player";
import type { Fonts } from "../fonts";
import { SLIDESHOW_FORMAT_VERSION, type Slideshow } from "../slideshow";
import { firstFrame, oneSlideShow, viewportBox } from "../testing/browser-pictures";

/** The caption font, always requested eagerly: a positive signal the fake is wired up even where
 * a slideshow carries no card, so no card font follows it. */
const CAPTION_FONT = '600 16px "Instrument Sans", sans-serif';

let box: HTMLElement;
afterEach(() => box.remove());

/** Records every font face asked for, settling none: this suite cares about what is requested
 * and when, not about controlling when a face resolves (`webgl-captions.browser.test.ts`'s
 * `ControlledFonts` is for that). */
class RecordingFonts implements Fonts {
  readonly requested: string[] = [];
  load(font: string): Promise<unknown> {
    this.requested.push(font);
    return Promise.resolve();
  }
}

function slideshowWithCard(): Slideshow {
  return {
    formatVersion: SLIDESHOW_FORMAT_VERSION,
    title: "Rome",
    slides: [
      {
        ground: "#101010",
        durationMs: 4000,
        card: {
          title: "Rome",
          style: "modern",
          position: "centre",
          ink: "light",
          entrance: "rise",
        },
      },
    ],
  };
}

describe("createPlayer with WebGL2", () => {
  it("draws into a canvas that fills the container and removes it on destroy", async () => {
    box = viewportBox({ width: 160, height: 90 });
    const player = createPlayer(box, await oneSlideShow());

    await firstFrame(player);
    expect(box.querySelector("canvas")).not.toBeNull();

    player.destroy();
    expect(box.childElementCount).toBe(0);
  });

  it("starts loading a slide's card fonts as soon as the player is created, before any frame", () => {
    box = viewportBox({ width: 160, height: 90 });
    const fonts = new RecordingFonts();

    const player = createPlayer(box, slideshowWithCard(), { fonts });

    expect(fonts.requested).toEqual([
      CAPTION_FONT,
      '700 16px "Bricolage Grotesque", sans-serif',
      '500 16px "Instrument Sans", sans-serif',
    ]);
    player.destroy();
  });

  it("requests no card font for a slideshow without a card", async () => {
    box = viewportBox({ width: 160, height: 90 });
    const fonts = new RecordingFonts();

    const player = createPlayer(box, await oneSlideShow(), { fonts });

    expect(fonts.requested).toEqual([CAPTION_FONT]);
    player.destroy();
  });
});
