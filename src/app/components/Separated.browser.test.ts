import "../../styles/tokens.css";
import { afterEach, describe, expect, it } from "vitest";
import { mountWithTranslator } from "../testing/mount-with-translator";
import Separated from "./Separated.svelte";

/** Room the "·" gets on each side beyond the font's narrow spaces, in CSS pixels. */
const SEPARATOR_MIN_PADDING_PX = 3;

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

function mountText(text: string): HTMLElement {
  const mounted = mountWithTranslator(Separated, { text });
  destroy = mounted.destroy;
  return mounted.target;
}

function separatorsIn(target: HTMLElement): HTMLElement[] {
  return [...target.querySelectorAll<HTMLElement>(".separator")];
}

describe("Separated", () => {
  it("gives every dot between parts room on both sides", () => {
    const target = mountText("Warm · harmonious · melancholic");

    expect(target.textContent).toBe("Warm · harmonious · melancholic");
    const separators = separatorsIn(target);
    expect(separators.map((separator) => separator.textContent)).toEqual([" · ", " · "]);
    for (const separator of separators) {
      const { paddingLeft, paddingRight } = getComputedStyle(separator);
      expect(parseFloat(paddingLeft)).toBeGreaterThanOrEqual(SEPARATOR_MIN_PADDING_PX);
      expect(parseFloat(paddingRight)).toBeGreaterThanOrEqual(SEPARATOR_MIN_PADDING_PX);
    }
  });

  it("shows a line without a dot as it is", () => {
    const target = mountText("Crossfade");

    expect(target.textContent).toBe("Crossfade");
    expect(separatorsIn(target)).toEqual([]);
  });
});
