import "../../styles/tokens.css";
import "../../styles/base.css";
import { afterEach, describe, expect, it } from "vitest";
import {
  buttonNamed,
  byLabel,
  click,
  details,
  mountScreen,
  press,
  selectionBar,
  tile,
  unmountScreen,
} from "./slideshow-screen-harness";

afterEach(() => unmountScreen());

function dialog(): HTMLElement {
  const found = document.querySelector('[role="dialog"]');
  if (!(found instanceof HTMLElement)) {
    throw new Error("the viewer did not open");
  }
  return found;
}

describe("SlideshowScreen, F opens the full-screen viewer", () => {
  it("opens the focused tile's picture, in play order", () => {
    mountScreen();

    press(tile(2, "02.07.2025"), "f");

    expect(dialog().getAttribute("aria-label")).toBe("Bild vom 02.07.2025");
    expect(dialog().textContent).toContain("2 von 3");
  });

  it("browses with the arrow keys and loads the shown picture", () => {
    const { calls } = mountScreen();
    press(tile(1, "01.07.2025"), "f");

    press(byLabel("Schließen"), "ArrowRight");

    expect(dialog().getAttribute("aria-label")).toBe("Bild vom 02.07.2025");
    expect(calls.loaded).toContain("b");
  });

  it("returns focus to the tile and selects the shown picture alone on close", () => {
    mountScreen();
    const first = tile(1, "01.07.2025");
    first.click();
    press(first, "f");
    press(byLabel("Schließen"), "ArrowRight");

    press(byLabel("Schließen"), "Escape");

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(tile(2, "02.07.2025"));
    expect(selectionBar()?.textContent).toContain("Bild 2 von 3");
  });

  it("leaves the selection alone when several pictures were selected", () => {
    mountScreen();
    tile(1, "01.07.2025").click();
    click(tile(2, "02.07.2025"), { ctrlKey: true });
    press(tile(1, "01.07.2025"), "f");

    press(byLabel("Schließen"), "Escape");

    expect(selectionBar()?.textContent).toContain("2 ausgewählt");
  });

  it("removes the shown picture through the editor's own removal", () => {
    const { calls } = mountScreen();
    press(tile(1, "01.07.2025"), "f");

    buttonNamed("Entfernen").click();

    expect(calls.removed).toEqual(["a"]);
  });

  it("hides Remove when the shown picture is the last one", () => {
    mountScreen(details(["a"]));

    press(tile(1, "01.07.2025"), "f");

    expect(document.querySelector(".pill.remove")).toBeNull();
  });
});
