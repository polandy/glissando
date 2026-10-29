import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import MoreMenu from "./MoreMenu.svelte";

let destroy = () => {};
afterEach(() => destroy());

function openMenu(focusFailed: number) {
  const calls: string[] = [];
  const mounted = mountWithTranslator(MoreMenu, {
    onDelete: () => {},
    pictureCount: 3,
    onStorageAction: () => {},
    focusFailed,
    onFocus: () => calls.push("focus"),
  });
  destroy = mounted.destroy;
  mounted.target.querySelector<HTMLButtonElement>('button[aria-label="Mehr"]')?.click();
  flushSync();
  const entry = [...mounted.target.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
    (item) => item.textContent?.includes("Gesichter und Motive\u00a0…"),
  );
  if (entry === undefined) {
    throw new Error("no faces and subjects entry");
  }
  return { entry, calls };
}

describe("MoreMenu's faces and subjects entry", () => {
  it("is named in user language and carries no progress line when nothing failed", () => {
    const { entry, calls } = openMenu(0);

    entry.click();

    expect(entry.textContent?.trim()).toBe("Gesichter und Motive\u00a0…");
    expect(entry.querySelector("small")).toBeNull();
    expect(calls).toEqual(["focus"]);
  });

  it("names the pictures that couldn't be looked at", () => {
    const { entry } = openMenu(2);

    expect(entry.querySelector("small")?.textContent).toBe("2 konnten nicht angesehen werden");
  });

  it("uses the singular for exactly one", () => {
    const { entry } = openMenu(1);

    expect(entry.querySelector("small")?.textContent).toBe("1 konnte nicht angesehen werden");
  });
});
