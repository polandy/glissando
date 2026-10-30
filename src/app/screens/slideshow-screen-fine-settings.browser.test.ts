import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { createStorageFineSettingsFoldStore } from "./slideshow/fine-settings-fold";
import { createMemoryStorage } from "../testing/memory-storage";
import { details, mountScreen, unmountScreen } from "./slideshow-screen-harness";
import type { KeyValueStorage } from "../start/first-launch";

afterEach(() => unmountScreen());

const toggle = () => {
  const found = document.querySelector<HTMLButtonElement>(".toggle");
  if (found === null) {
    throw new Error("no Fine settings toggle");
  }
  return found;
};
describe("SlideshowScreen, the Fine settings fold", () => {
  it("starts folded, without anything stored for the device", () => {
    mountScreen(details(["a"]), {
      fineSettingsFold: createStorageFineSettingsFoldStore(createMemoryStorage()),
    });

    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    const foldId = toggle().getAttribute("aria-controls");
    expect(foldId).not.toBeNull();
    expect(document.getElementById(foldId ?? "")).not.toBeNull();
  });

  it("opens on a tap, which also stores the choice for the device", () => {
    const storage: KeyValueStorage = createMemoryStorage();

    mountScreen(details(["a"]), { fineSettingsFold: createStorageFineSettingsFoldStore(storage) });
    toggle().click();
    flushSync();

    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(storage.getItem("glissando.fineSettingsFold")).toBe("open");
  });

  it("starts open on a device that left it open before", () => {
    const storage: KeyValueStorage = createMemoryStorage({ "glissando.fineSettingsFold": "open" });

    mountScreen(details(["a"]), { fineSettingsFold: createStorageFineSettingsFoldStore(storage) });

    expect(toggle().getAttribute("aria-expanded")).toBe("true");
  });

  it("folds again on a second tap, which also stores the choice", () => {
    const storage: KeyValueStorage = createMemoryStorage({ "glissando.fineSettingsFold": "open" });

    mountScreen(details(["a"]), { fineSettingsFold: createStorageFineSettingsFoldStore(storage) });
    toggle().click();
    flushSync();

    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(storage.getItem("glissando.fineSettingsFold")).toBe("closed");
  });
});
