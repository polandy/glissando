import { afterEach, describe, expect, it } from "vitest";
import type { StoredCardBackground } from "../../../../library/stored-slideshow";
import { createTranslator } from "../../../i18n/translator";
import { mountWithTranslator } from "../../../testing/mount-with-translator";
import { reactiveProps } from "../../../testing/reactive-props.svelte";
import type { PictureTile } from "../../view-models";
import CardBackgroundPicker from "./CardBackgroundPicker.svelte";

const PICTURE_COLOURS: Record<string, { veil: string; accent: string }> = {
  a: { veil: "#404040", accent: "#C0C0C0" },
  b: { veil: "#101010", accent: "#EFEFEF" },
};

const PICTURES: PictureTile[] = ["a", "b"].map((id) => ({
  id,
  thumbnailUrl: `${id}.jpg`,
  capturedAt: "2025-07-01T10:00:00Z",
  ownMotion: false,
  ownDurationMs: null,
  ownTransition: null,
  pairedWithNumber: null,
  blurredFill: false,
  alone: false,
  colours: PICTURE_COLOURS[id] ?? { veil: "#000000", accent: "#FFFFFF" },
}));

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

function setUp(
  background: StoredCardBackground = { kind: "colour", colour: "plum" },
  motion = true,
  kind: "opening" | "closing" = "opening",
) {
  const changes: StoredCardBackground[] = [];
  const motionChanges: boolean[] = [];
  const props = reactiveProps<{
    background: StoredCardBackground;
    motion: boolean;
    pictures: readonly PictureTile[];
    kind: "opening" | "closing";
    onChange: (background: StoredCardBackground) => void;
    onMotionChange: (motion: boolean) => void;
  }>({
    background,
    motion,
    pictures: PICTURES,
    kind,
    onChange: (value) => changes.push(value),
    onMotionChange: (value) => motionChanges.push(value),
  });
  const mounted = mountWithTranslator(CardBackgroundPicker, props, {
    current: createTranslator("en"),
  });
  destroy = mounted.destroy;
  return { target: mounted.target, changes, motionChanges };
}

describe("CardBackgroundPicker", () => {
  it("shows the six fixed swatches plus the first picture's two swatches, for the title slide", () => {
    const { target } = setUp();

    expect(target.querySelectorAll(".swatch")).toHaveLength(8);
    expect(target.querySelector(".hairline")).not.toBeNull();
  });

  it("shows the last picture's two swatches for the closing slide", () => {
    const { target } = setUp({ kind: "colour", colour: "plum" }, true, "closing");

    const swatches = target.querySelectorAll<HTMLButtonElement>(".swatch");
    expect(swatches[0]?.getAttribute("aria-label")).toBe("Picture veil colour");
    expect(swatches[0]?.style.background).not.toBe(swatches[2]?.style.background);
  });

  it("shows only the six fixed swatches, with no hairline, when there is no picture", () => {
    const props = reactiveProps<{
      background: StoredCardBackground;
      motion: boolean;
      pictures: readonly PictureTile[];
      kind: "opening" | "closing";
      onChange: (background: StoredCardBackground) => void;
      onMotionChange: (motion: boolean) => void;
    }>({
      background: { kind: "colour", colour: "plum" },
      motion: true,
      pictures: [],
      kind: "opening",
      onChange: () => undefined,
      onMotionChange: () => undefined,
    });
    const mounted = mountWithTranslator(CardBackgroundPicker, props, {
      current: createTranslator("en"),
    });
    destroy = mounted.destroy;

    expect(mounted.target.querySelectorAll(".swatch")).toHaveLength(6);
    expect(mounted.target.querySelector(".hairline")).toBeNull();
  });

  it("calls onChange with the picked swatch", () => {
    const { target, changes } = setUp();

    const swatches = target.querySelectorAll<HTMLButtonElement>(".swatch");
    swatches[3]?.click();

    expect(changes).toEqual([{ kind: "colour", colour: "night" }]);
  });

  it("calls onChange with the picture's hex when a picture swatch is picked", () => {
    const { target, changes } = setUp();

    target.querySelectorAll<HTMLButtonElement>(".swatch")[0]?.click();

    expect(changes).toEqual([{ kind: "colour", colour: "#404040" }]);
  });

  it("marks a picture swatch pressed by comparing hex, not position", () => {
    const { target } = setUp({ kind: "colour", colour: "#C0C0C0" });

    const swatches = target.querySelectorAll<HTMLButtonElement>(".swatch");
    expect(swatches[1]?.getAttribute("aria-pressed")).toBe("true");
  });

  it("shows the tint chips over a picture background", () => {
    const { target } = setUp({ kind: "picture", pictureId: "a", fade: 60, tint: "picture" });

    expect(target.textContent).toContain("From picture");
  });

  it("calls onChange with the picked tint, keeping the picture and fade", () => {
    const { target, changes } = setUp({
      kind: "picture",
      pictureId: "a",
      fade: 80,
      tint: "picture",
    });

    const chips = target.querySelectorAll<HTMLButtonElement>(".chip");
    const dark = Array.from(chips).find((chip) => chip.textContent === "Dark");
    dark?.click();

    expect(changes).toEqual([
      {
        kind: "picture",
        pictureId: "a",
        fade: 80,
        tint: "dark",
      },
    ]);
  });

  it("shows the pictures, fade slider and reveal toggle for a picture background", () => {
    const { target } = setUp({ kind: "picture", pictureId: "a", fade: 60, tint: "picture" });

    expect(target.querySelectorAll(".picture")).toHaveLength(2);
    expect(target.querySelector('input[type="range"]')).not.toBeNull();
    expect(target.textContent).toContain("Reveal");
  });

  it("shows the fade in toggle for the closing card", () => {
    const { target } = setUp(
      { kind: "picture", pictureId: "a", fade: 60, tint: "picture" },
      true,
      "closing",
    );

    expect(target.textContent).toContain("Fade in");
  });

  it("moves the fade slider, keeping the tint", () => {
    const { target, changes } = setUp({
      kind: "picture",
      pictureId: "a",
      fade: 60,
      tint: "dark",
    });

    const slider = target.querySelector<HTMLInputElement>('input[type="range"]');
    if (slider !== null) {
      slider.value = "80";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    }

    expect(changes).toEqual([
      {
        kind: "picture",
        pictureId: "a",
        fade: 80,
        tint: "dark",
      },
    ]);
  });

  it("keeps the tint when a different picture is picked", () => {
    const { target, changes } = setUp({
      kind: "picture",
      pictureId: "a",
      fade: 60,
      tint: "dark",
    });

    target.querySelectorAll<HTMLButtonElement>(".picture")[1]?.click();

    expect(changes).toEqual([
      {
        kind: "picture",
        pictureId: "b",
        fade: 60,
        tint: "dark",
      },
    ]);
  });

  it("defaults to the picture tint when switching from a colour background", () => {
    const { target, changes } = setUp({ kind: "colour", colour: "plum" });

    target.querySelector<HTMLButtonElement>('.option[role="radio"]:not(.checked)')?.click();

    expect(changes).toEqual([
      {
        kind: "picture",
        pictureId: "a",
        fade: 60,
        tint: "picture",
      },
    ]);
  });

  it("calls onMotionChange when the reveal toggle is flipped", () => {
    const { target, motionChanges } = setUp(
      { kind: "picture", pictureId: "a", fade: 60, tint: "picture" },
      true,
    );

    const checkbox = target.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (checkbox !== null) {
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    }

    expect(motionChanges).toEqual([false]);
  });
  describe("radio keys", () => {
    const key = (el: Element | null | undefined, name: string) =>
      el?.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true }));

    it("keeps one tab stop in the Colour | Picture toggle, on the checked option", () => {
      const { target } = setUp({ kind: "colour", colour: "plum" });

      const radios = target.querySelectorAll<HTMLButtonElement>(".kind-toggle [role=radio]");
      expect([...radios].map((radio) => radio.tabIndex)).toEqual([0, -1]);
    });

    it("moves the toggle to Picture with ArrowRight and focuses it", () => {
      const { target, changes } = setUp({ kind: "colour", colour: "plum" });

      const radios = target.querySelectorAll<HTMLButtonElement>(".kind-toggle [role=radio]");
      radios[0]?.focus();
      key(radios[0], "ArrowRight");

      expect(changes).toEqual([expect.objectContaining({ kind: "picture" })]);
      expect(document.activeElement).toBe(radios[1]);
    });

    it("keeps one tab stop among the pictures and moves with ArrowRight", () => {
      const { target, changes } = setUp({
        kind: "picture",
        pictureId: "a",
        fade: 60,
        tint: "picture",
      });

      const pictures = target.querySelectorAll<HTMLButtonElement>(".picture");
      expect([...pictures].map((picture) => picture.tabIndex)).toEqual([0, -1]);
      key(pictures[0], "ArrowRight");

      expect(changes).toEqual([expect.objectContaining({ pictureId: "b" })]);
      expect(document.activeElement).toBe(pictures[1]);
    });
  });
});
