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

function mountMenu(onPickFiles: () => void = () => {}, onPickFolder: () => void = () => {}) {
  const mounted = mountWithTranslator(AddPicturesMenu, { onPickFiles, onPickFolder }, english);
  unmounts.push(mounted.destroy);
  return mounted.target;
}

const toggle = (target: HTMLElement) =>
  target.querySelector<HTMLButtonElement>(".add-pictures > button");
const items = (target: HTMLElement) => [...target.querySelectorAll<HTMLButtonElement>(".item")];

describe("AddPicturesMenu", () => {
  it("names the toggle 'Add pictures' and starts closed", () => {
    const target = mountMenu();

    expect(toggle(target)?.textContent?.trim()).toBe("Add pictures");
    expect(toggle(target)?.getAttribute("aria-expanded")).toBe("false");
    expect(target.querySelector(".menu")).toBeNull();
  });

  it("opens a menu offering pictures or a folder, like the empty step", () => {
    const target = mountMenu();

    toggle(target)?.click();
    flushSync();

    expect(toggle(target)?.getAttribute("aria-expanded")).toBe("true");
    expect(items(target).map((item) => item.textContent?.trim())).toEqual([
      "Choose media",
      "choose a folder",
    ]);
  });

  it("picks files and closes the menu", () => {
    const picked: string[] = [];
    const target = mountMenu(
      () => picked.push("files"),
      () => picked.push("folder"),
    );
    toggle(target)?.click();
    flushSync();

    items(target)[0]?.click();
    flushSync();

    expect(picked).toEqual(["files"]);
    expect(target.querySelector(".menu")).toBeNull();
  });

  it("picks a folder and closes the menu", () => {
    const picked: string[] = [];
    const target = mountMenu(
      () => picked.push("files"),
      () => picked.push("folder"),
    );
    toggle(target)?.click();
    flushSync();

    items(target)[1]?.click();
    flushSync();

    expect(picked).toEqual(["folder"]);
  });

  it("closes on Escape without picking anything", async () => {
    const picked: string[] = [];
    const target = mountMenu(
      () => picked.push("files"),
      () => picked.push("folder"),
    );
    toggle(target)?.click();
    flushSync();

    target
      .querySelector(".menu")
      ?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
      );

    // `close()` awaits a tick before refocusing the toggle; real browsers schedule that
    // continuation at their own pace, so the menu's removal is awaited rather than flushed.
    await vi.waitFor(() => expect(target.querySelector(".menu")).toBeNull());
    expect(picked).toEqual([]);
  });
});
