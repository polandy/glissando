import { flushSync, tick } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { SlideshowStorage } from "../view-models";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import MoreMenu from "./MoreMenu.svelte";

let destroy = () => {};
afterEach(() => destroy());

function openMenu(storage: SlideshowStorage | null = null) {
  const mounted = mountWithTranslator(MoreMenu, {
    onDelete: () => {},
    storage,
    pictureCount: 3,
    onStorageAction: () => {},
    focusFailed: 0,
    onFocus: () => {},
  });
  destroy = mounted.destroy;
  document.body.append(mounted.target);
  const toggle = mounted.target.querySelector<HTMLButtonElement>('button[aria-label="Mehr"]');
  if (toggle === null) {
    throw new Error("no more button");
  }
  toggle.click();
  flushSync();
  const menu = mounted.target.querySelector<HTMLElement>('[role="menu"]');
  if (menu === null) {
    throw new Error("menu did not open");
  }
  const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  const press = (key: string) => {
    menu.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    flushSync();
  };
  return { menu, items, toggle, press, target: mounted.target };
}

describe("MoreMenu keyboard handling", () => {
  it("opens with the first item focused", () => {
    const { items } = openMenu();

    expect(document.activeElement).toBe(items[0]);
  });

  it("moves down and wraps to the first item", () => {
    const { items, press } = openMenu();

    press("ArrowDown");
    expect(document.activeElement).toBe(items[1]);
    press("ArrowDown");
    expect(document.activeElement).toBe(items[0]);
  });

  it("moves up and wraps to the last item", () => {
    const { items, press } = openMenu();

    press("ArrowUp");

    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it("jumps to the first and last item with Home and End", () => {
    const { items, press } = openMenu();

    press("End");
    expect(document.activeElement).toBe(items[items.length - 1]);
    press("Home");
    expect(document.activeElement).toBe(items[0]);
  });

  it("closes on Tab and returns focus to the ⋯ button", async () => {
    const { toggle, press, target } = openMenu();
    expect(target.querySelector('[role="menu"]')).not.toBeNull();

    press("Tab");
    await tick();
    await tick();

    expect(target.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });
});

describe("MoreMenu separators", () => {
  it("draws one separator between the two groups when no storage is shown", () => {
    const { menu, items } = openMenu(null);

    expect(items).toHaveLength(2);
    expect(menu.querySelectorAll("hr")).toHaveLength(1);
  });

  it("separates all three groups when storage is shown", () => {
    const { menu, items } = openMenu({ kind: "device", fromImmich: 0, fromDevice: 3 });

    expect(items).toHaveLength(3);
    expect(menu.querySelectorAll("hr")).toHaveLength(2);
  });
});
