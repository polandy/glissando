import { afterEach, describe, expect, it, vi } from "vitest";
import type { CardEntrance } from "../../../../player/slideshow";
import { createTranslator } from "../../../i18n/translator";
import { mountWithTranslator } from "../../../testing/mount-with-translator";
import { reactiveProps } from "../../../testing/reactive-props.svelte";
import CardEntrancePicker from "./CardEntrancePicker.svelte";

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

function setUp(entrance: CardEntrance = "rise") {
  const onChange = vi.fn();
  const props = reactiveProps<{
    entrance: CardEntrance;
    onChange: (entrance: CardEntrance) => void;
  }>({ entrance, onChange });
  const mounted = mountWithTranslator(CardEntrancePicker, props, {
    current: createTranslator("en"),
  });
  destroy = mounted.destroy;
  return { target: mounted.target, onChange };
}

describe("CardEntrancePicker", () => {
  it("shows a chip for each entrance", () => {
    const { target } = setUp();

    expect(target.querySelectorAll(".chip")).toHaveLength(5);
  });

  it("marks the current entrance as pressed", () => {
    const { target } = setUp("words");

    const pressed = target.querySelector('.chip[aria-pressed="true"]');
    expect(pressed?.textContent).toBe("Word by word");
  });

  it("calls onChange with the picked entrance", () => {
    const { target, onChange } = setUp("rise");

    const chips = target.querySelectorAll<HTMLButtonElement>(".chip");
    const letters = Array.from(chips).find((chip) => chip.textContent === "Letter by letter");
    letters?.click();

    expect(onChange).toHaveBeenCalledWith("letters");
  });

  it("names each chip accessibly and keeps it keyboard reachable", () => {
    const { target } = setUp();

    const chips = target.querySelectorAll<HTMLButtonElement>(".chip");
    for (const chip of chips) {
      expect(chip.tagName).toBe("BUTTON");
      expect(chip.textContent?.trim()).not.toBe("");
    }
  });
});
