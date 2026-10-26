import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { isGroundSlide, type Card, type GroundSlide, type Slideshow } from "../../player";
import { oneSlideShow } from "../../player/testing/browser-pictures";
import { OPENED_PICTURE_SHOW } from "../../player/testing/opened-pictures";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import PlayerOverlay from "./PlayerOverlay.svelte";

/** A minimal title card, valid regardless of the test's own concerns. */
const CARD: Card = {
  title: "Sommer am See",
  style: "modern",
  position: "centre",
  ink: "light",
  entrance: "rise",
};

/** A ground slide carrying `CARD`, for a test that puts it before or in a slideshow. */
function groundCardSlide(durationMs = 2000): GroundSlide {
  return { ground: "#202020", durationMs, card: CARD };
}

let destroy = () => {};
afterEach(() => destroy());

function press(key: string): void {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, cancelable: true }));
  flushSync();
}

describe("PlayerOverlay's heading (ADR-0032)", () => {
  it("shows no title or date over a ground title card, keeping the close button and counter", () => {
    const slideshow: Slideshow = {
      formatVersion: OPENED_PICTURE_SHOW.formatVersion,
      title: "Sommer am See",
      slides: [groundCardSlide()],
    };
    const mounted = mountWithTranslator(PlayerOverlay, {
      slideshow,
      onClose: () => undefined,
      scheduler: new FakeScheduler(),
    });
    destroy = mounted.destroy;
    flushSync();

    expect(mounted.target.querySelector(".heading .name")).toBeNull();
    expect(mounted.target.querySelector(".heading .mono")).toBeNull();
    expect(mounted.target.querySelector('button[aria-label="Schließen (Esc)"]')).not.toBeNull();
    expect(mounted.target.querySelector(".counter")?.textContent).toBe("1 / 1");
  });

  it("shows no title or date over a picture slide carrying a card", async () => {
    const show = await oneSlideShow();
    const firstSlide = show.slides[0];
    if (firstSlide === undefined || isGroundSlide(firstSlide)) {
      throw new Error("oneSlideShow no longer returns a picture slide");
    }
    const slideshow: Slideshow = { ...show, slides: [{ ...firstSlide, card: CARD }] };
    const mounted = mountWithTranslator(PlayerOverlay, {
      slideshow,
      onClose: () => undefined,
      scheduler: new FakeScheduler(),
    });
    destroy = mounted.destroy;
    flushSync();

    expect(mounted.target.querySelector(".heading .name")).toBeNull();
    expect(mounted.target.querySelector(".heading .mono")).toBeNull();
    expect(mounted.target.querySelector('button[aria-label="Schließen (Esc)"]')).not.toBeNull();
    expect(mounted.target.querySelector(".counter")?.textContent).toBe("1 / 1");
  });

  it("shows the title and the slide's own capture date, not an earlier slide's, after an opening ground card", async () => {
    const show = await oneSlideShow();
    const pictureSlide = show.slides[0];
    if (pictureSlide === undefined || isGroundSlide(pictureSlide)) {
      throw new Error("oneSlideShow no longer returns a picture slide");
    }
    const firstDate = "2025-08-01T10:00:00Z";
    const secondDate = "2025-08-09T10:00:00Z";
    const slideshow: Slideshow = {
      ...show,
      slides: [
        groundCardSlide(),
        { ...pictureSlide, image: { ...pictureSlide.image, capturedAt: firstDate } },
        { ...pictureSlide, image: { ...pictureSlide.image, capturedAt: secondDate } },
      ],
    };
    const mounted = mountWithTranslator(PlayerOverlay, {
      slideshow,
      onClose: () => undefined,
      scheduler: new FakeScheduler(),
    });
    destroy = mounted.destroy;
    flushSync();

    press("ArrowRight");
    press("ArrowRight");

    expect(mounted.target.querySelector(".counter")?.textContent).toBe("3 / 3");
    expect(mounted.target.querySelector(".heading .name")?.textContent).toBe(slideshow.title);
    expect(mounted.target.querySelector(".heading .mono")?.textContent).toBe(
      createTranslator("de").formatDate(secondDate),
    );
  });
});
