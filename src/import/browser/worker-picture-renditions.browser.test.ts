import { afterEach, describe, expect, it } from "vitest";
import {
  countMainThreadEncodes,
  jpegFile,
  ORIGINAL_RENDITION_SIZE,
  ORIGINAL_SIZE,
} from "../testing/main-thread-encodes";
import { UnreadablePictureError } from "../unreadable-picture";
import { startPictureRenditionsWorker } from "./start-picture-renditions-worker";
import { WorkerPictureRenditions } from "./worker-picture-renditions";

let worker: Worker | null = null;
afterEach(() => worker?.terminate());

function renditionsOnlyInTheWorker(): WorkerPictureRenditions {
  return new WorkerPictureRenditions(
    () => (worker = startPictureRenditionsWorker()),
    () => Promise.reject(new Error("the main-thread fallback was used")),
  );
}

describe("WorkerPictureRenditions in the browser", () => {
  it("makes an original's display rendition and thumbnail in the worker, with no JPEG encode on the main thread", async () => {
    const original = await jpegFile("original.jpg", ORIGINAL_SIZE);
    const encodes = countMainThreadEncodes();
    try {
      const decoded = await renditionsOnlyInTheWorker().decode(original);

      expect(decoded).toMatchObject(ORIGINAL_RENDITION_SIZE);
      const display = await createImageBitmap(decoded.display);
      expect([display.width, display.height]).toEqual([decoded.width, decoded.height]);
      expect(decoded.thumbnail.size).toBeGreaterThan(0);
      expect(encodes.count()).toBe(0);
    } finally {
      encodes.restore();
    }
  });

  it("rejects a file that is no picture with UnreadablePictureError naming it", async () => {
    const notAPicture = new File(["not a picture"], "notes.jpg", { type: "image/jpeg" });

    await expect(renditionsOnlyInTheWorker().decode(notAPicture)).rejects.toThrow(
      new UnreadablePictureError("notes.jpg", "decode"),
    );
  });
});
