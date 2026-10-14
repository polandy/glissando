import { afterEach, describe, expect, it, vi } from "vitest";
import type { StoredCardBackground } from "../../../../library/stored-slideshow";
import { createTranslator } from "../../../i18n/translator";
import { mountWithTranslator } from "../../../testing/mount-with-translator";
import { reactiveProps } from "../../../testing/reactive-props.svelte";
import type { PictureTile } from "../../view-models";
import CardBackgroundPicker from "./CardBackgroundPicker.svelte";

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
  colours: { veil: "#404040", accent: "#C0C0C0" },
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
  const onChange = vi.fn();
  const onMotionChange = vi.fn();
  const props = reactiveProps<{
    background: StoredCardBackground;
    motion: boolean;
    pictures: readonly PictureTile[];
    kind: "opening" | "closing";
    onChange: (background: StoredCardBackground) => void;
    onMotionChange: (motion: boolean) => void;
  }>({ background, motion, pictures: PICTURES, kind, onChange, onMotionChange });
  const mounted = mountWithTranslator(CardBackgroundPicker, props, {
    current: createTranslator("en"),
  });
  destroy = mounted.destroy;
  return { target: mounted.target, onChange, onMotionChange };
}

describe("CardBackgroundPicker", () => {
  it("shows the six swatches for a colour background", () => {
    const { target } = setUp();

    expect(target.querySelectorAll(".swatch")).toHaveLength(6);
  });

  it("calls onChange with the picked swatch", () => {
    const { target, onChange } = setUp();

    const swatches = target.querySelectorAll<HTMLButtonElement>(".swatch");
    swatches[1]?.click();

    expect(onChange).toHaveBeenCalledWith({ kind: "colour", colour: "night" });
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
    const { target, onChange } = setUp({
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

    expect(onChange).toHaveBeenCalledWith({
      kind: "picture",
      pictureId: "a",
      fade: 80,
      tint: "dark",
    });
  });

  it("keeps the tint when a different picture is picked", () => {
    const { target, onChange } = setUp({
      kind: "picture",
      pictureId: "a",
      fade: 60,
      tint: "dark",
    });

    target.querySelectorAll<HTMLButtonElement>(".picture")[1]?.click();

    expect(onChange).toHaveBeenCalledWith({
      kind: "picture",
      pictureId: "b",
      fade: 60,
      tint: "dark",
    });
  });

  it("defaults to the picture tint when switching from a colour background", () => {
    const { target, onChange } = setUp({ kind: "colour", colour: "plum" });

    target.querySelector<HTMLButtonElement>('.option[role="radio"]:not(.checked)')?.click();

    expect(onChange).toHaveBeenCalledWith({
      kind: "picture",
      pictureId: "a",
      fade: 60,
      tint: "picture",
    });
  });

  it("calls onMotionChange when the reveal toggle is flipped", () => {
    const { target, onMotionChange } = setUp(
      { kind: "picture", pictureId: "a", fade: 60, tint: "picture" },
      true,
    );

    const checkbox = target.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (checkbox !== null) {
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    }

    expect(onMotionChange).toHaveBeenCalledWith(false);
  });
});
