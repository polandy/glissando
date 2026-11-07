import { afterEach, describe, expect, it } from "vitest";
import { CARD_STYLES, type CardStyle } from "../../../../player/slideshow";
import { mountWithTranslator } from "../../../testing/mount-with-translator";
import { reactiveProps } from "../../../testing/reactive-props.svelte";
import CardStylePicker from "./CardStylePicker.svelte";

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

function setUp(style: CardStyle = "modern") {
  const changes: CardStyle[] = [];
  const props = reactiveProps<{ style: CardStyle; onChange: (style: CardStyle) => void }>({
    style,
    onChange: (value) => changes.push(value),
  });
  const mounted = mountWithTranslator(CardStylePicker, props);
  destroy = mounted.destroy;
  return { target: mounted.target, changes, props };
}

describe("CardStylePicker", () => {
  it("renders the four styles as a radiogroup", () => {
    const { target } = setUp();

    const radios = target.querySelectorAll('[role="radio"]');
    expect(radios).toHaveLength(CARD_STYLES.length);
    expect(target.querySelector('[role="radio"][aria-checked="true"]')?.textContent).toContain(
      "Modern",
    );
  });

  it("calls onChange when a style is picked", () => {
    const { target, changes } = setUp();

    const options = target.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    options[2]?.click();

    expect(changes).toEqual(["bold"]);
  });

  it("moves to the next style with ArrowRight", () => {
    const { target, changes } = setUp("modern");

    const first = target.querySelector<HTMLButtonElement>('[role="radio"]');
    first?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));

    expect(changes).toEqual(["quiet"]);
  });

  it("jumps to the last style with End", () => {
    const { target, changes } = setUp("modern");

    const first = target.querySelector<HTMLButtonElement>('[role="radio"]');
    first?.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));

    expect(changes).toEqual(["classic"]);
  });

  it("stays on the first style when Home is pressed there already", () => {
    const { target, changes } = setUp("modern");

    const first = target.querySelector<HTMLButtonElement>('[role="radio"]');
    first?.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));

    expect(changes).toEqual(["modern"]);
  });
});
