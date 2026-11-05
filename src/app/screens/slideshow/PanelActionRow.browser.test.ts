import "../../../styles/tokens.css";
import { afterEach, describe, expect, it } from "vitest";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import PanelActionRow from "./PanelActionRow.svelte";

/** Room the "·" gets on each side beyond the font's narrow spaces, in CSS pixels. */
const SEPARATOR_MIN_PADDING_PX = 3;

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

function mountRow(summary: readonly string[]): HTMLElement {
  const mounted = mountWithTranslator(PanelActionRow, {
    name: "transitions",
    label: "Transitions",
    value: "Crossfade",
    summary,
    onclick: () => {},
  });
  destroy = mounted.destroy;
  return mounted.target;
}

describe("PanelActionRow", () => {
  it("parts the summary with a dot that has room on both sides", () => {
    const target = mountRow(["automatic", "1 picture chosen"]);

    const summary = target.querySelector(".summary");
    expect(summary?.textContent?.trim()).toBe("automatic · 1 picture chosen");
    const separators = [...target.querySelectorAll<HTMLElement>(".summary .separator")];
    expect(separators.map((separator) => separator.textContent)).toEqual([" · "]);
    const [separator] = separators;
    if (separator === undefined) throw new Error("no separator in the summary");
    const { paddingLeft, paddingRight } = getComputedStyle(separator);
    expect(parseFloat(paddingLeft)).toBeGreaterThanOrEqual(SEPARATOR_MIN_PADDING_PX);
    expect(parseFloat(paddingRight)).toBeGreaterThanOrEqual(SEPARATOR_MIN_PADDING_PX);
  });

  it("shows the value alone with an empty summary", () => {
    const target = mountRow([]);

    expect(target.querySelector(".value")?.textContent).toBe("Crossfade");
    expect(target.querySelector(".summary")).toBeNull();
  });
});
