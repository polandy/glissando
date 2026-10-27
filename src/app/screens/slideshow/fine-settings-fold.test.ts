import { describe, expect, it } from "vitest";
import { createMemoryStorage } from "../../testing/memory-storage";
import { createStorageFineSettingsFoldStore } from "./fine-settings-fold";

const FOLD_KEY = "glissando.fineSettingsFold";

describe("fine settings fold store", () => {
  it("starts closed when nothing is stored", () => {
    const store = createStorageFineSettingsFoldStore(createMemoryStorage());

    expect(store.read()).toBe("closed");
  });

  it.each(["open", "closed"] as const)("reads back a stored %s", (choice) => {
    const store = createStorageFineSettingsFoldStore(createMemoryStorage());
    store.write(choice);

    expect(store.read()).toBe(choice);
  });

  it("remembers open across a new store for the same storage", () => {
    const storage = createMemoryStorage();
    createStorageFineSettingsFoldStore(storage).write("open");

    expect(createStorageFineSettingsFoldStore(storage).read()).toBe("open");
  });

  it.each(["", "Open", "true", "1"])("falls back to closed for the invalid value %j", (stored) => {
    const store = createStorageFineSettingsFoldStore(createMemoryStorage({ [FOLD_KEY]: stored }));

    expect(store.read()).toBe("closed");
  });
});
