import "../../styles/tokens.css";
import "../../styles/base.css";
import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import {
  buttonNamed,
  mountScreen,
  selectionBar,
  tile,
  unmountScreen,
} from "./slideshow-screen-harness";

const THEMES = ["light", "dark"] as const;
/** The reference phone, a Pixel 9 Pro, in CSS pixels. */
const PHONE = { width: 412, height: 915 };

afterEach(() => {
  unmountScreen();
  document.documentElement.removeAttribute("data-theme");
});

/** A token's colour as the browser resolves it, in the same form getComputedStyle reports. */
function tokenColour(token: string): string {
  const probe = document.createElement("div");
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
}

function openBar(): HTMLElement {
  mountScreen();
  tile(2, "02.07.2025").click();
  flushSync();
  const bar = selectionBar();
  if (!(bar instanceof HTMLElement)) {
    throw new Error("the selection bar did not open");
  }
  return bar;
}

describe("SlideshowScreen selection bar look", () => {
  it.each(THEMES)("stands out from the %s screen: inverse bar, Done in the accent", (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    const bar = openBar();
    const barStyle = getComputedStyle(bar);
    const done = getComputedStyle(buttonNamed("Fertig"));

    expect(barStyle.backgroundColor).toBe(tokenColour("--gl-inverse-bg"));
    expect(barStyle.backgroundColor).not.toBe(tokenColour("--gl-surface"));
    expect(barStyle.color).toBe(tokenColour("--gl-inverse-text"));
    expect(done.backgroundColor).toBe(tokenColour("--gl-accent"));
    expect(done.color).toBe(tokenColour("--gl-accent-ink"));
  });

  it.each(THEMES)("draws Remove's icon in the danger colour for the inverse bar (%s)", (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    const bar = openBar();
    const icon = buttonNamed("Bild entfernen").querySelector("svg");
    if (icon === null) {
      throw new Error("Remove shows no icon");
    }
    const iconColour = getComputedStyle(icon).color;

    expect(
      getComputedStyle(document.documentElement).getPropertyValue("--gl-inverse-danger"),
    ).not.toBe("");
    expect(iconColour).toBe(tokenColour("--gl-inverse-danger"));
    expect(iconColour).not.toBe(getComputedStyle(bar).color);
  });

  it("fits every button inside the bar on a phone, Earlier and Later as arrows that keep their names", async () => {
    await page.viewport(PHONE.width, PHONE.height);
    const bar = openBar();
    const barBox = bar.getBoundingClientRect();
    const done = buttonNamed("Fertig").getBoundingClientRect();
    const earlier = buttonNamed("Früher");

    expect(done.right).toBeLessThanOrEqual(barBox.right);
    expect(barBox.right).toBeLessThanOrEqual(PHONE.width);
    expect(earlier.getBoundingClientRect().width).toBeLessThan(done.width);
    expect(buttonNamed("Später").getBoundingClientRect().width).toBeLessThan(done.width);
  });
});
