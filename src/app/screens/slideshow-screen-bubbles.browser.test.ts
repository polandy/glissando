import "../../styles/tokens.css";
import "../../styles/base.css";
import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { byLabel, click, firePointer } from "./slideshow-screen-dom";
import { mountScreen, selectionBar, tile, unmountScreen } from "./slideshow-screen-harness";
import { BUBBLE_HOLD_MS, BUBBLE_LINGER_MS } from "./slideshow/BarAction.svelte";

/** The reference phone, a Pixel 9 Pro, in CSS pixels. */
const PHONE = { width: 412, height: 915 };
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

function bubbleOf(button: HTMLElement): HTMLElement {
  const bubble = button.querySelector<HTMLElement>(".bubble");
  if (bubble === null) {
    throw new Error(`"${button.getAttribute("aria-label")}" has no bubble`);
  }
  return bubble;
}

/** The element's opacity once its fade, a CSS transition, has run to its end. */
async function settledOpacity(element: HTMLElement): Promise<string> {
  await Promise.all(element.getAnimations().map((animation) => animation.finished));
  return getComputedStyle(element).opacity;
}

describe("SlideshowScreen selection bar: icons with label bubbles", () => {
  it("names each action of one picture in words, the same in its bubble, with no word in the bar", () => {
    selectSecond();
    const names = [
      "Früher",
      "Später",
      "Vollbild ansehen",
      "Bild bearbeiten",
      "Kapitel davor einfügen",
      "Bild entfernen",
    ];

    for (const name of names) {
      const button = byLabel(name);
      const bubble = bubbleOf(button);
      expect(selectionBar()?.contains(button)).toBe(true);
      expect(bubble.textContent?.trim()).toBe(name);
      expect(bubble.getAttribute("aria-hidden")).toBe("true");
      expect(getComputedStyle(bubble).opacity).toBe("0");
    }
  });

  it("names Remove with the count while several are selected", () => {
    mountScreen();
    byLabel("Auswählen").click();
    flushSync();
    tile(1, "01.07.2025").click();
    tile(3, "03.07.2025").click();
    flushSync();

    expect(bubbleOf(byLabel("2 Bilder entfernen")).textContent?.trim()).toBe("2 Bilder entfernen");
  });

  it("shows the bubble on a press and hold on the phone; letting go then does nothing", async () => {
    await page.viewport(PHONE.width, PHONE.height);
    const { calls, holdScheduler } = selectSecond();
    const earlier = byLabel("Früher");

    firePointer(earlier, "pointerdown", { pointerType: "touch" });
    holdScheduler.advance(BUBBLE_HOLD_MS);
    flushSync();
    expect(await settledOpacity(bubbleOf(earlier))).toBe("1");

    firePointer(earlier, "pointerup", { pointerType: "touch" });
    click(earlier);
    expect(await settledOpacity(bubbleOf(earlier))).toBe("1");
    expect(calls.shifted).toEqual([]);

    holdScheduler.advance(BUBBLE_LINGER_MS);
    flushSync();
    expect(await settledOpacity(bubbleOf(earlier))).toBe("0");
  });

  it("acts at once on a quick tap on the phone, with no bubble", async () => {
    await page.viewport(PHONE.width, PHONE.height);
    const { calls, holdScheduler } = selectSecond();
    const earlier = byLabel("Früher");

    firePointer(earlier, "pointerdown", { pointerType: "touch" });
    firePointer(earlier, "pointerup", { pointerType: "touch" });
    click(earlier);
    holdScheduler.advance(BUBBLE_HOLD_MS);
    flushSync();

    expect(calls.shifted).toEqual([[["b"], -1]]);
    expect(await settledOpacity(bubbleOf(byLabel("Früher")))).toBe("0");
  });

  it("shows the bubble while the mouse rests on the icon", async () => {
    selectSecond();
    const edit = byLabel("Bild bearbeiten");

    await userEvent.hover(edit);

    expect(await settledOpacity(bubbleOf(edit))).toBe("1");
    expect(await settledOpacity(bubbleOf(byLabel("Bild entfernen")))).toBe("0");
  });
});

describe("SlideshowScreen strip marks with a picture selected", () => {
  it("drops the selected tile's own remove mark: the bar removes it; other tiles keep theirs", async () => {
    selectSecond();
    const other = byLabel("Bild 1 entfernen");

    await userEvent.hover(other);

    expect(getComputedStyle(other).display).not.toBe("none");
    expect(await settledOpacity(other)).toBe("1");
    expect(getComputedStyle(byLabel("Bild 2 entfernen")).display).toBe("none");
  });
});
