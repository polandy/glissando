import { describe, expect, it } from "vitest";
import { createMemoryStorage } from "../app/testing/memory-storage";
import {
  createStorageServerLibraryMemory,
  type ServerSlideshowCard,
} from "./server-library-memory";

const ICELAND: ServerSlideshowCard = {
  id: "s-1",
  title: "Iceland 2025",
  pictureCount: 112,
  durationSeconds: 560,
  hasMusic: true,
};

function throwingStorage() {
  return {
    getItem: (): string | null => {
      throw new Error("storage is blocked");
    },
    setItem: (): void => {
      throw new Error("storage is blocked");
    },
  };
}

describe("server library memory", () => {
  it("remembers nothing on a device that never saw the server library", () => {
    const memory = createStorageServerLibraryMemory(createMemoryStorage(), () => undefined);

    expect(memory.wasOn()).toBe(false);
    expect(memory.cards()).toEqual([]);
  });

  it("remembers across app starts that the library was on and the last list's cards", () => {
    const storage = createMemoryStorage();
    const first = createStorageServerLibraryMemory(storage, () => undefined);
    first.rememberOn(true);
    first.rememberCards([ICELAND]);

    const later = createStorageServerLibraryMemory(storage, () => undefined);

    expect(later.wasOn()).toBe(true);
    expect(later.cards()).toEqual([ICELAND]);
  });

  it("forgets the cards once the server answers that it has no library", () => {
    const memory = createStorageServerLibraryMemory(createMemoryStorage(), () => undefined);
    memory.rememberOn(true);
    memory.rememberCards([ICELAND]);

    memory.rememberOn(false);

    expect(memory.wasOn()).toBe(false);
    expect(memory.cards()).toEqual([]);
  });

  it("reads a stored value it cannot understand as nothing remembered", () => {
    const storage = createMemoryStorage({
      "glissando.serverLibrary": '{"on":true,"cards":[{"id":3}]}',
    });

    const memory = createStorageServerLibraryMemory(storage, () => undefined);

    expect(memory.wasOn()).toBe(false);
    expect(memory.cards()).toEqual([]);
  });

  it("remembers nothing and logs where the device's storage refuses", () => {
    const logged: unknown[] = [];
    const memory = createStorageServerLibraryMemory(throwingStorage(), (error) =>
      logged.push(error),
    );

    memory.rememberOn(true);

    expect(memory.wasOn()).toBe(false);
    expect(memory.cards()).toEqual([]);
    expect(logged.length).toBeGreaterThan(0);
  });
});
