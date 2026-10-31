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

    // A progress bar, not a live status: it changes with every picture, and the toast is the status.
    const bar = mounted.target.querySelector('[role="progressbar"]');
    expect(bar?.textContent).toContain("Looking for subjects · 12 of 40");
    expect(bar?.getAttribute("aria-valuenow")).toBe("12");
    expect(bar?.getAttribute("aria-valuemax")).toBe("40");
    expect(mounted.target.querySelector('[role="status"]')).toBeNull();
    expect(mounted.target.querySelector<HTMLElement>(".line")?.style.width).toBe("30%");
  });

  it("says it is looking again when every slideshow searched had a focus already", () => {
    const mounted = mountWithTranslator(FocusSearchIndicator, {
      search: { done: 1, total: 4, again: true },
      besideExport: false,
    });
    destroy = mounted.destroy;

    expect(mounted.target.querySelector('[role="progressbar"]')?.textContent).toContain(
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

  it("keeps a visible short text label beside the ring in a phone-wide container", () => {
    const mounted = mountWithTranslator(
      FocusSearchIndicator,
      { search: { done: 1, total: 30, again: false }, besideExport: false },
      { current: createTranslator("en") },
    );
    destroy = mounted.destroy;
    const host = mounted.target;
    host.style.cssText = "container-type: inline-size; width: 390px";

    expect(host.querySelector(".progress-ring")).not.toBeNull();
    const short = host.querySelector<HTMLElement>(".label-short");
    const box = short?.getBoundingClientRect();
    expect(box?.width).toBeGreaterThan(0);
    expect(getComputedStyle(short as HTMLElement).visibility).toBe("visible");
    expect(short?.textContent).toContain("1/30");
    expect(host.querySelector('[role="progressbar"]')?.getAttribute("aria-label")).toBe(
      "Looking for subjects",
    );
  });
});
