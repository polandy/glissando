import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { FocusPass } from "../../library/focus-pass";
import { FakeFocusDetector } from "../../library/testing/fake-focus-detector";
import { whenRendered } from "../testing/when-rendered";
import { mountRoute, storeWithShow, unmountRoute } from "./slideshow-route-harness";

const EVERY_PICTURE_STAYS =
  "Mindestens ein Bild bleibt. Um alle loszuwerden, die ganze Diashow löschen.";

afterEach(() => unmountRoute());

function button(target: HTMLElement, name: string): HTMLButtonElement {
  const found = [...target.querySelectorAll<HTMLButtonElement>("button")].find(
    (candidate) => candidate.textContent?.trim() === name || candidate.ariaLabel === name,
  );
  if (found === undefined) {
    throw new Error(`no button "${name}"`);
  }
  return found;
}

describe("the slideshow route, removing every picture", () => {
  it("answers Remove with every picture selected with a toast, keeping the selection", async () => {
    const store = await storeWithShow();
    // Never started: the pass stays idle and finds nothing.
    const focusPass = new FocusPass({
      store,
      detector: new FakeFocusDetector(() => ({ kind: "none" })),
      log: () => {},
      reportError: () => {},
    });
    const { target, toaster } = mountRoute(store, focusPass, null);
    await whenRendered(target, ".strip .pick");
    const picks = [...target.querySelectorAll<HTMLButtonElement>(".strip .pick")];
    button(target, "Auswählen").click();
    flushSync();
    for (const pick of picks) {
      pick.click();
      flushSync();
    }

    button(target, "Entfernen").click();
    flushSync();

    expect(toaster.current?.text).toBe(EVERY_PICTURE_STAYS);
    expect(picks.map((pick) => pick.getAttribute("aria-pressed"))).toEqual(["true", "true"]);
    expect(target.querySelector('[role="toolbar"]')?.textContent).toContain("2 ausgewählt");
    expect((await store.getSlideshow("show")).pictures).toHaveLength(2);
  });
});
