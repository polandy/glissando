import { describe, expect, it } from "vitest";
import { createMemoryStorage } from "../testing/memory-storage";
import { createStorageMusicEditorDetailsStore } from "./music-editor-details";

const DETAILS_KEY = "glissando.musicEditorDetails";

describe("music editor details store", () => {
  it("starts hidden when nothing is stored", () => {
    const store = createStorageMusicEditorDetailsStore(createMemoryStorage());

    expect(store.read()).toBe("hidden");
  });

  it.each(["shown", "hidden"] as const)("reads back a stored %s", (choice) => {
    const store = createStorageMusicEditorDetailsStore(createMemoryStorage());
    store.write(choice);

    expect(store.read()).toBe(choice);
  });

  it("remembers shown across a new store for the same storage", () => {
    const storage = createMemoryStorage();
    createStorageMusicEditorDetailsStore(storage).write("shown");

    expect(createStorageMusicEditorDetailsStore(storage).read()).toBe("shown");
  });

  it.each(["", "Shown", "true", "1"])("falls back to hidden for the invalid value %j", (stored) => {
    const store = createStorageMusicEditorDetailsStore(
      createMemoryStorage({ [DETAILS_KEY]: stored }),
    );

    expect(store.read()).toBe("hidden");
  });
});
