import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { details, mountScreen, unmountScreen } from "./slideshow-screen-harness";

afterEach(() => unmountScreen());

/** The strip's Title slide / Closing slide tile, found by its visible label (TITLE_SLIDES.md). */
function cardTile(label: string): HTMLButtonElement {
  const found = [...document.querySelectorAll<HTMLButtonElement>("button.card-tile")].find(
    (button) => button.textContent?.includes(label),
  );
  if (found === undefined) {
    throw new Error(`no card tile labelled "${label}"`);
  }
  return found;
}

describe("SlideshowScreen, the title and closing slide tiles (TITLE_SLIDES.md)", () => {
  it("opens the title slide sheet with its defaults on first tap", () => {
    const { calls } = mountScreen(details(["a", "b", "c"]), { english: true });

    cardTile("Title slide").click();
    flushSync();

    expect(calls.openingCardsEnsured).toBe(1);
    expect(document.querySelector("dialog")).not.toBeNull();
    expect(document.querySelector("#card-sheet-title")?.textContent).toBe("Title slide");
    expect(document.querySelector<HTMLInputElement>("#card-title")?.value).toBe("Sommer am See");
    expect(document.querySelector<HTMLInputElement>("#card-subtitle")?.value).toBe(
      "1.–3. Juli 2025",
    );
  });

  it("opens the closing slide sheet with its defaults on first tap", () => {
    const { calls } = mountScreen(details(["a", "b", "c"]), { english: true });

    cardTile("Closing slide").click();
    flushSync();

    expect(calls.closingCardsEnsured).toBe(1);
    expect(document.querySelector("dialog")).not.toBeNull();
    expect(document.querySelector("#card-sheet-title")?.textContent).toBe("Closing slide");
    expect(document.querySelector<HTMLInputElement>("#card-title")?.value).toBe("");
    // The closing card has no subtitle field (TITLE_SLIDES.md).
    expect(document.querySelector("#card-subtitle")).toBeNull();
  });
});
