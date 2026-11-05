import "../../../styles/tokens.css";
import { afterEach, describe, expect, it } from "vitest";
import { separatorRoom } from "../../testing/separator-room";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import PanelActionRow from "./PanelActionRow.svelte";

/** Room the "·" gets on both sides together beyond the font's narrow spaces, in CSS pixels. */
const SEPARATOR_MIN_ROOM_PX = 6;

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
    expect(separatorRoom(separator)).toBeGreaterThanOrEqual(SEPARATOR_MIN_ROOM_PX);
  });

  it("shows the value alone with an empty summary", () => {
    const target = mountRow([]);

    expect(target.querySelector(".value")?.textContent).toBe("Crossfade");
    expect(target.querySelector(".summary")).toBeNull();
  });
});
