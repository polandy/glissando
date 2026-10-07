import { describe, expect, it } from "vitest";
import {
  consumeFirstLaunch,
  createStorageFirstLaunchStore,
  type KeyValueStorage,
} from "./first-launch";

function createMemoryStorage(): KeyValueStorage {
  const entries = new Map<string, string>();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => void entries.set(key, value),
  };
}

describe("consumeFirstLaunch", () => {
  it("reports the very first launch as first", () => {
    const store = createStorageFirstLaunchStore(createMemoryStorage());

    expect(consumeFirstLaunch(store)).toBe(true);
  });

  it("reports every later launch as not first", () => {
    const store = createStorageFirstLaunchStore(createMemoryStorage());
    consumeFirstLaunch(store);

    expect(consumeFirstLaunch(store)).toBe(false);
    expect(consumeFirstLaunch(store)).toBe(false);
  });

  it("remembers the launch across app starts sharing the same storage", () => {
    const storage = createMemoryStorage();
    consumeFirstLaunch(createStorageFirstLaunchStore(storage));

    expect(consumeFirstLaunch(createStorageFirstLaunchStore(storage))).toBe(false);
  });
});
