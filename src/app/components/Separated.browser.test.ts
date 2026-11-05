import "../../styles/tokens.css";
import { afterEach, describe, expect, it } from "vitest";
import { separatorRoom } from "../testing/separator-room";
import { mountWithTranslator } from "../testing/mount-with-translator";
import Separated from "./Separated.svelte";

/** Room the "·" gets on both sides together beyond the font's narrow spaces, in CSS pixels. */
const SEPARATOR_MIN_ROOM_PX = 6;

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
      expect(separatorRoom(separator)).toBeGreaterThanOrEqual(SEPARATOR_MIN_ROOM_PX);
    }
  });

  it("wraps at a dot without spilling past a line only one part wide", () => {
    const probe = document.createElement("span");
    probe.textContent = "filmisch";
    document.body.append(probe);
    const partWidth = Math.ceil(probe.getBoundingClientRect().width);
    probe.remove();

    const target = mountText("filmisch · filmisch");
    target.style.width = `${partWidth}px`;

    expect(separatorsIn(target)).toHaveLength(1);
    expect(target.scrollWidth).toBeLessThanOrEqual(target.clientWidth);
  });

  it("shows a line without a dot as it is", () => {
    const target = mountText("Crossfade");

    expect(target.textContent).toBe("Crossfade");
    expect(separatorsIn(target)).toEqual([]);
  });
});
