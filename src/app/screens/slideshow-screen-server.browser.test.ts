import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { buttonNamed, details, mountScreen, unmountScreen } from "./slideshow-screen-harness";

afterEach(() => unmountScreen());

const storageRow = () => document.querySelector(".storage");

function openMenu(): HTMLElement[] {
  document.querySelector<HTMLButtonElement>('[aria-label="More"]')?.click();
  flushSync();
  return [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];
}

const itemNamed = (items: HTMLElement[], name: string): HTMLElement => {
  const found = items.find((item) => item.textContent.includes(name));
  if (found === undefined) throw new Error(`no menu item "${name}"`);
  return found;
};

const SERVER = { kind: "server", saving: false, missingCount: 0 } as const;

describe("SlideshowScreen, where the slideshow lives", () => {
  it("tells nothing about it while the server library is off", () => {
    mountScreen(details(["a", "b"]), { english: true });

    expect(document.body.textContent).toContain("Sommer am See");
    expect(storageRow()).toBeNull();
    expect(document.body.textContent).not.toContain("On this device");
  });

  it("says a server slideshow is on the server and saved", () => {
    mountScreen(details(["a", "b"]), { english: true, storage: SERVER });

    expect(storageRow()?.textContent).toContain("On your Glissando server");
    expect(storageRow()?.textContent).toContain(
      "Pictures linked from Immich · edits saved for everyone",
    );
    expect(storageRow()?.textContent).toContain("Saved");
  });

  it("says an edit is being saved on the server while it is in flight", () => {
    mountScreen(details(["a", "b"]), { english: true, storage: { ...SERVER, saving: true } });

    expect(storageRow()?.textContent).toContain("Saving\u00a0…");
    expect(storageRow()?.textContent).not.toContain("Saved");
  });

  it.each([
    [{ fromImmich: 24, fromDevice: 0 }, "All 24 from Immich · plays offline"],
    [{ fromImmich: 20, fromDevice: 4 }, "20 from Immich, 4 from this device · plays offline"],
  ])("tells where a device slideshow's pictures came from: %o", (counts, line) => {
    mountScreen(details(["a"]), { english: true, storage: { kind: "device", ...counts } });

    expect(storageRow()?.textContent).toContain("On this device");
    expect(storageRow()?.textContent).toContain(line);
  });
});

describe("SlideshowScreen, pictures no longer in Immich", () => {
  it("shows a missing picture as a dashed tile and offers to remove it", () => {
    const shown = details(["a", "b"]);
    const pictures = shown.pictures.map((tile, index) =>
      index === 1 ? { ...tile, missing: true as const } : tile,
    );
    const { calls } = mountScreen(
      { ...shown, pictures },
      { english: true, storage: { ...SERVER, missingCount: 1 } },
    );

    expect(document.querySelectorAll(".missing")).toHaveLength(1);
    expect(document.querySelector(".missing")?.textContent).toContain("No longer in Immich");
    expect(document.body.textContent).toContain(
      "1 picture is no longer in Immich. It is skipped when playing.",
    );
    buttonNamed("Remove it").click();
    expect(calls.storageActions).toEqual(["removeMissing"]);
  });
});

describe("SlideshowScreen, the ⋯ menu of a server slideshow", () => {
  it("offers to keep a copy on this device, telling how many pictures it downloads", () => {
    const { calls } = mountScreen(details(["a", "b", "c"]), { english: true, storage: SERVER });

    const items = openMenu();
    const keep = itemNamed(items, "Keep a copy on this device");
    expect(keep.textContent).toContain("Downloads 3 pictures. Plays offline.");
    expect(itemNamed(items, "Export").textContent).toContain(
      "A .glissando file, pictures downloaded from Immich",
    );
    expect(itemNamed(items, "Delete slideshow").textContent).toContain("For every device");
    keep.click();
    expect(calls.storageActions).toEqual(["keepCopy"]);
  });

  it("says in the delete confirmation that it goes for every device", () => {
    mountScreen(details(["a", "b", "c"]), { english: true, storage: SERVER });

    itemNamed(openMenu(), "Delete slideshow").click();
    flushSync();

    expect(document.querySelector("dialog")?.textContent).toContain(
      "The slideshow is removed from your Glissando server, for every device.",
    );
  });

  it("offers a device slideshow to be saved on the server only while the library is on", () => {
    const { calls } = mountScreen(details(["a"]), {
      english: true,
      storage: { kind: "device", fromImmich: 1, fromDevice: 0 },
    });

    const save = itemNamed(openMenu(), "Save on the server");
    expect(save.textContent).toContain("A copy for every device at home");
    save.click();
    expect(calls.storageActions).toEqual(["saveOnServer"]);
  });

  it("offers neither while the server library is off", () => {
    mountScreen(details(["a"]), { english: true });

    const items = openMenu();
    expect(itemNamed(items, "Export")).toBeDefined();
    expect(items.map((item) => item.textContent).join()).not.toContain("server");
    expect(items.map((item) => item.textContent).join()).not.toContain("Keep a copy");
  });
});
