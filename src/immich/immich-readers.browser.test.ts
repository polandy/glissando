import { describe, expect, it } from "vitest";
import { decodeImmichPhoto } from "../import/immich-picture-source";
import {
  countMainThreadEncodes,
  jpegFile,
  ORIGINAL_RENDITION_SIZE,
  ORIGINAL_SIZE,
} from "../import/testing/main-thread-encodes";
import { ImmichAvailability } from "./immich-availability";
import { createImmichReaders } from "./immich-readers";
import { FakeImmichClient } from "./testing/fake-immich-client";

const ALWAYS_ONLINE = { isOnline: () => true, onChange: () => () => undefined };

describe("createImmichReaders", () => {
  it("makes an Immich original's 4K rendition with no JPEG encode on the main thread, so playing it never holds a frame", async () => {
    const original = await jpegFile("beach.jpg", ORIGINAL_SIZE);
    const client = new FakeImmichClient();
    client.original = () => Promise.resolve(original);
    const availability = new ImmichAvailability({ client, network: ALWAYS_ONLINE });
    const readers = createImmichReaders(client, availability, (error) => {
      throw error;
    });
    const encodes = countMainThreadEncodes();
    try {
      const decoded = await decodeImmichPhoto({ id: "beach", fileName: "beach.jpg" }, readers);

      expect(decoded).toMatchObject(ORIGINAL_RENDITION_SIZE);
      expect(encodes.count()).toBe(0);
    } finally {
      encodes.restore();
    }
  });
});
