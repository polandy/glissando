import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { buttonNamed, byLabel, mountScreen, unmountScreen } from "./slideshow-screen-harness";

afterEach(() => unmountScreen());

function openDialog(): HTMLDialogElement {
  const dialog = document.querySelector("dialog");
  if (dialog === null) throw new Error("no dialog opened");
  return dialog;
}

function closeDialog(dialog: HTMLDialogElement): void {
  const close = dialog.querySelector<HTMLButtonElement>('button[aria-label="Schließen"]');
  if (close === null) throw new Error("the dialog has no close button");
  close.click();
  flushSync();
}

describe("SlideshowScreen overlays", () => {
  it("gives focus back to the ⋯ button when the Focus sheet closes", () => {
    mountScreen();
    byLabel("Mehr").click();
    flushSync();
    const focusItem = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
      (item) => item.textContent.trim().startsWith("Gesichter und Motive"),
    );
    if (focusItem === undefined) throw new Error("no Focus item in the menu");
    focusItem.click();
    flushSync();
    const dialog = openDialog();
    expect(dialog.getAttribute("aria-labelledby")).toBe("focus-sheet-title");

    closeDialog(dialog);

    expect(document.querySelector("dialog")).toBeNull();
    expect(document.activeElement).toBe(byLabel("Mehr"));
  });

  it("gives focus back to the Share button when the Share sheet closes", () => {
    const { calls } = mountScreen();
    const share = buttonNamed("Teilen");
    share.click();
    flushSync();
    expect(calls.sharesOpened).toBe(1);

    closeDialog(openDialog());

    expect(document.querySelector("dialog")).toBeNull();
    expect(document.activeElement).toBe(share);
  });
});
