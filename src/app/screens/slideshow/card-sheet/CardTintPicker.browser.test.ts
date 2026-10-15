import { afterEach, describe, expect, it, vi } from "vitest";
import type { CardTint } from "../../../../library/stored-slideshow";
import { createTranslator } from "../../../i18n/translator";
import { mountWithTranslator } from "../../../testing/mount-with-translator";
import { reactiveProps } from "../../../testing/reactive-props.svelte";
import CardTintPicker from "./CardTintPicker.svelte";

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

function setUp(tint: CardTint = "picture") {
  const onChange = vi.fn();
  const props = reactiveProps<{ tint: CardTint; onChange: (tint: CardTint) => void }>({
    tint,
    onChange,
  });
  const mounted = mountWithTranslator(CardTintPicker, props, { current: createTranslator("en") });
  destroy = mounted.destroy;
  return { target: mounted.target, onChange };
}

describe("CardTintPicker", () => {
  it("shows the three tint chips", () => {
    const { target } = setUp();

    expect(target.querySelectorAll(".chip")).toHaveLength(3);
  });

  it("marks the current tint as pressed", () => {
    const { target } = setUp("dark");

    const pressed = target.querySelector('.chip[aria-pressed="true"]');
    expect(pressed?.textContent).toBe("Dark");
  });

  it("calls onChange with the picked tint", () => {
    const { target, onChange } = setUp("picture");

    const chips = target.querySelectorAll<HTMLButtonElement>(".chip");
    const light = Array.from(chips).find((chip) => chip.textContent === "Light");
    light?.click();

    expect(onChange).toHaveBeenCalledWith("light");
  });
});
