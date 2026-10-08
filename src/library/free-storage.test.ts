import { describe, expect, it } from "vitest";
import { freeStorageBytes } from "./free-storage";

const storageWith = (estimate: StorageEstimate) => ({ estimate: () => Promise.resolve(estimate) });

describe("freeStorageBytes", () => {
  it("is the quota the browser grants minus what the app uses", async () => {
    expect(await freeStorageBytes(storageWith({ quota: 1000, usage: 400 }))).toBe(600);
  });

  it("is unknown where the browser has no storage manager, e.g. over plain HTTP", async () => {
    expect(await freeStorageBytes(undefined)).toBeNull();
  });

  it("is unknown when the estimate leaves out the quota or the usage", async () => {
    expect(await freeStorageBytes(storageWith({ usage: 400 }))).toBeNull();
    expect(await freeStorageBytes(storageWith({ quota: 1000 }))).toBeNull();
  });
});
