import { describe, expect, it } from "vitest";
import { createMemoryStorage } from "../testing/memory-storage";
import { createStorageFrameCardPreference, FrameCardPreference } from "./frame-card-preference";

function createPreference(stored: Record<string, string> = {}) {
  const storage = createMemoryStorage(stored);
  return {
    preference: new FrameCardPreference(createStorageFrameCardPreference(storage)),
    storage,
  };
}

describe("FrameCardPreference", () => {
  it("shows the card when nothing is stored", () => {
    expect(createPreference().preference.shown).toBe(true);
  });

  it("reads a stored hidden choice", () => {
    expect(createPreference({ "glissando.frame.cardShown": "hidden" }).preference.shown).toBe(
      false,
    );
  });

  it("shows the card when the stored value is one this version does not know", () => {
    expect(createPreference({ "glissando.frame.cardShown": "maybe" }).preference.shown).toBe(true);
  });

  it("keeps a hidden card hidden for the next preference read from the same storage", () => {
    const { preference, storage } = createPreference();

    preference.setShown(false);

    const reloaded = new FrameCardPreference(createStorageFrameCardPreference(storage));
    expect(reloaded.shown).toBe(false);
  });

  it("keeps a shown card shown after it was hidden and brought back", () => {
    const { preference, storage } = createPreference();

    preference.setShown(false);
    preference.setShown(true);

    const reloaded = new FrameCardPreference(createStorageFrameCardPreference(storage));
    expect(reloaded.shown).toBe(true);
  });

  it("tells a subscriber the current choice at once, then each change, until it unsubscribes", () => {
    const { preference } = createPreference();
    const seen: boolean[] = [];

    const unsubscribe = preference.subscribe((shown) => seen.push(shown));
    preference.setShown(false);
    unsubscribe();
    preference.setShown(true);

    expect(seen).toEqual([true, false]);
  });
});
