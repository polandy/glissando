import { afterEach, describe, expect, it } from "vitest";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import FocusSearchIndicator from "./FocusSearchIndicator.svelte";

let destroy = () => {};
afterEach(() => destroy());

describe("FocusSearchIndicator", () => {
  it("says how many pictures it looked at and draws the progress line", () => {
    const mounted = mountWithTranslator(
      FocusSearchIndicator,
      { search: { done: 12, total: 40, again: false }, besideExport: false },
      { current: createTranslator("en") },
    );
    destroy = mounted.destroy;

    expect(mounted.target.querySelector('[role="status"]')?.textContent).toContain(
      "Looking for subjects · 12 of 40",
    );
    expect(mounted.target.querySelector<HTMLElement>(".line")?.style.width).toBe("30%");
  });

  it("says it is looking again when every slideshow searched had a focus already", () => {
    const mounted = mountWithTranslator(FocusSearchIndicator, {
      search: { done: 1, total: 4, again: true },
      besideExport: false,
    });
    destroy = mounted.destroy;

    expect(mounted.target.querySelector('[role="status"]')?.textContent).toContain(
      "Motive werden erneut gesucht · 1 von 4",
    );
  });

  it.each([
    { besideExport: true, raised: true },
    { besideExport: false, raised: false },
  ])("lifts its line above the export's: $raised beside an export", ({ besideExport, raised }) => {
    const mounted = mountWithTranslator(FocusSearchIndicator, {
      search: { done: 1, total: 4, again: false },
      besideExport,
    });
    destroy = mounted.destroy;

    const line = mounted.target.querySelector(".line");
    expect(line).not.toBeNull();
    expect(line?.classList.contains("raised")).toBe(raised);
  });
});
