import { flushSync } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import AddPicturesMenu from "./AddPicturesMenu.svelte";

const english = { current: createTranslator("en") };

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
});

function mountMenu(
  options: {
    onPickFiles?: () => void;
    onPickFolder?: () => void;
    onOpenImmich?: (() => void) | null;
    tile?: boolean;
  } = {},
) {
  const {
    onPickFiles = () => {},
    onPickFolder = () => {},
    onOpenImmich = null,
    tile = false,
  } = options;
  const mounted = mountWithTranslator(
    AddPicturesMenu,
    { onAddMore: { onPickFiles, onPickFolder }, onOpenImmich, tile },
    english,
  );
  unmounts.push(mounted.destroy);
  return mounted.target;
}

const toggle = (target: HTMLElement) => target.querySelector<HTMLButtonElement>("button");
const items = (target: HTMLElement) => [...target.querySelectorAll<HTMLButtonElement>(".item")];

describe("AddPicturesMenu, the head trigger", () => {
  it("names the toggle 'Add pictures' and starts closed", () => {
    const target = mountMenu();

    expect(toggle(target)?.getAttribute("aria-label")).toBe("Add pictures");
    expect(toggle(target)?.getAttribute("aria-expanded")).toBe("false");
    expect(target.querySelector('[role="menu"]')).toBeNull();
  });

  it("opens a menu offering pictures, a folder, and focuses the first item", () => {
    const target = mountMenu();

    toggle(target)?.click();
    flushSync();

    expect(toggle(target)?.getAttribute("aria-expanded")).toBe("true");
    expect(items(target).map((item) => item.textContent?.trim())).toEqual([
      "Pictures and videos",
      "A folder",
    ]);
    expect(document.activeElement).toBe(items(target)[0]);
  });

  it("offers From Immich as a third item only once it can be opened", () => {
    const target = mountMenu({ onOpenImmich: () => {} });

    toggle(target)?.click();
    flushSync();

    expect(items(target).map((item) => item.textContent?.trim())).toEqual([
      "Pictures and videos",
      "A folder",
      "From Immich",
    ]);
  });

  it("picks files and closes the menu", () => {
    const picked: string[] = [];
    const target = mountMenu({
      onPickFiles: () => picked.push("files"),
      onPickFolder: () => picked.push("folder"),
    });
    toggle(target)?.click();
    flushSync();

    items(target)[0]?.click();
    flushSync();

    expect(picked).toEqual(["files"]);
    expect(target.querySelector('[role="menu"]')).toBeNull();
  });

  it("picks a folder and closes the menu", () => {
    const picked: string[] = [];
    const target = mountMenu({
      onPickFiles: () => picked.push("files"),
      onPickFolder: () => picked.push("folder"),
    });
    toggle(target)?.click();
    flushSync();

    items(target)[1]?.click();
    flushSync();

    expect(picked).toEqual(["folder"]);
  });

  it("opens Immich and closes the menu", () => {
    const picked: string[] = [];
    const target = mountMenu({ onOpenImmich: () => picked.push("immich") });
    toggle(target)?.click();
    flushSync();

    items(target)[2]?.click();
    flushSync();

    expect(picked).toEqual(["immich"]);
    expect(target.querySelector('[role="menu"]')).toBeNull();
  });

  it("closes on Escape without picking anything, and returns focus to the toggle", async () => {
    const picked: string[] = [];
    const target = mountMenu({
      onPickFiles: () => picked.push("files"),
      onPickFolder: () => picked.push("folder"),
    });
    toggle(target)?.click();
    flushSync();

    target
      .querySelector('[role="menu"]')
      ?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
      );

    // `close()` awaits a tick before refocusing the toggle; real browsers schedule that
    // continuation at their own pace, so the menu's removal is awaited rather than flushed.
    await vi.waitFor(() => expect(target.querySelector('[role="menu"]')).toBeNull());
    expect(picked).toEqual([]);
    expect(document.activeElement).toBe(toggle(target));
  });
});

describe("AddPicturesMenu, the add-tile trigger", () => {
  it("shows the dashed add tile instead of the head button", () => {
    const target = mountMenu({ tile: true });

    expect(target.querySelector("li.tile")).not.toBeNull();
    expect(target.querySelector(".add-tile")).not.toBeNull();
    expect(toggle(target)?.getAttribute("aria-label")).toBeNull();
  });

  it("opens the same menu as the head trigger", () => {
    const target = mountMenu({ tile: true, onOpenImmich: () => {} });

    toggle(target)?.click();
    flushSync();

    expect(items(target).map((item) => item.textContent?.trim())).toEqual([
      "Pictures and videos",
      "A folder",
      "From Immich",
    ]);
  });
});
