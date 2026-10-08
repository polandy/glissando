import { describe, expect, it } from "vitest";
import { requestPersistentStorage } from "./persistent-storage";

class FakeStorageManager {
  persistCalls = 0;
  constructor(
    private readonly alreadyPersisted: boolean,
    private readonly grantsPersist: boolean,
  ) {}
  persisted(): Promise<boolean> {
    return Promise.resolve(this.alreadyPersisted);
  }
  persist(): Promise<boolean> {
    this.persistCalls += 1;
    return Promise.resolve(this.grantsPersist);
  }
}

describe("requestPersistentStorage", () => {
  it("reports unsupported when the browser has no storage manager", async () => {
    expect(await requestPersistentStorage(undefined)).toBe("unsupported");
  });

  it.each([
    { alreadyPersisted: false, grantsPersist: true, result: "granted" },
    { alreadyPersisted: false, grantsPersist: false, result: "refused" },
  ])(
    "reports $result when the browser's answer to the request is $grantsPersist",
    async ({ alreadyPersisted, grantsPersist, result }) => {
      const storage = new FakeStorageManager(alreadyPersisted, grantsPersist);

      expect(await requestPersistentStorage(storage)).toBe(result);
      expect(storage.persistCalls).toBe(1);
    },
  );

  it("reports granted without asking again when storage is already persistent", async () => {
    const storage = new FakeStorageManager(true, false);

    expect(await requestPersistentStorage(storage)).toBe("granted");
    expect(storage.persistCalls).toBe(0);
  });
});
