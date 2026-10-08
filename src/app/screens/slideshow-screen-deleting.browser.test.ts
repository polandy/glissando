import { flushSync, tick } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { buttonNamed, byLabel, mountScreen, unmountScreen } from "./slideshow-screen-harness";

afterEach(() => unmountScreen());

describe("SlideshowScreen deleting", () => {
  function openDeleteDialog(): HTMLDialogElement {
    byLabel("Mehr").click();
    flushSync();
    const items = [...document.querySelectorAll('[role="menuitem"]')];
    const deleteItem = items.find((item) => item.textContent?.trim() === "Diashow löschen …");
    if (!(deleteItem instanceof HTMLElement)) {
      throw new Error("no delete item in the menu");
    }
    deleteItem.click();
    flushSync();
    const dialog = document.querySelector("dialog");
    if (dialog === null) {
      throw new Error("no dialog opened");
    }
    return dialog;
  }

  it("asks first, naming the slideshow and its pictures, with Keep focused", () => {
    mountScreen();

    const dialog = openDeleteDialog();

    expect(dialog.querySelector("h3")?.textContent).toBe("„Sommer am See“ löschen?");
    expect(dialog.textContent).toContain("Die Diashow und ihre 3 Bilder werden");
    expect(document.activeElement?.textContent?.trim()).toBe("Behalten");
  });

  it("keeps the slideshow when the user says Keep", () => {
    const { calls } = mountScreen();
    openDeleteDialog();

    buttonNamed("Behalten").click();
    flushSync();

    expect(byLabel("Mehr")).not.toBeNull();
    expect(document.querySelector("dialog")).toBeNull();
    expect(calls.deletes).toBe(0);
  });

  it("returns focus to the ⋯ button when the user says Keep", async () => {
    mountScreen();
    openDeleteDialog();

    buttonNamed("Behalten").click();
    flushSync();
    await tick();

    expect(document.activeElement).toBe(byLabel("Mehr"));
  });

  it("returns focus to the ⋯ button when the user presses Esc", async () => {
    mountScreen();
    openDeleteDialog();

    await userEvent.keyboard("{Escape}");
    flushSync();
    await tick();

    expect(document.querySelector("dialog")).toBeNull();
    expect(document.activeElement).toBe(byLabel("Mehr"));
  });

  it("deletes the slideshow when the user says Delete", () => {
    const { calls } = mountScreen();
    openDeleteDialog();

    buttonNamed("Löschen").click();
    flushSync();

    expect(calls.deletes).toBe(1);
  });
});
