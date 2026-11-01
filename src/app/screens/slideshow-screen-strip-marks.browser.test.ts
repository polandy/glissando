import "../../styles/tokens.css";
import "../../styles/base.css";
import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { mountScreen, tile, unmountScreen } from "./slideshow-screen-harness";

const DESKTOP = { width: 1280, height: 900 };

afterEach(async () => {
  unmountScreen();
  await page.viewport(DESKTOP.width, DESKTOP.height);
});

function selectSecond(): ReturnType<typeof mountScreen> {
  const mounted = mountScreen();
  tile(2, "02.07.2025").click();
  flushSync();
  return mounted;
}

/** Turns every transition off, so a state change shows in the computed style at once. */
function withoutTransitions(): HTMLStyleElement {
  const style = document.createElement("style");
  style.textContent = "*, *::before, *::after { transition: none !important; }";
  document.head.append(style);
  return style;
}

describe("SlideshowScreen strip marks", () => {
  it("shows the grab handle on a hovered tile and no remove button on any tile", async () => {
    const noTransitions = withoutTransitions();
    mountScreen();
    const first = tile(1, "01.07.2025");
    const grab = first.closest("li")?.querySelector<HTMLElement>(".grab");

    await userEvent.hover(first);

    expect(grab).toBeDefined();
    await expect.poll(() => first.matches(":hover")).toBe(true);
    expect(getComputedStyle(grab as HTMLElement).opacity).toBe("1");
    expect(document.querySelector(".strip button.remove")).toBeNull();
    noTransitions.remove();
  });

  it("shows no remove button on the selected tile either", () => {
    selectSecond();

    expect(tile(2, "02.07.2025").closest("li")?.querySelector(".grab")).not.toBeNull();
    expect(document.querySelector(".strip button.remove")).toBeNull();
  });
});
