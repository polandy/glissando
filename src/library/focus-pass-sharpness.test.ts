import { describe, expect, it } from "vitest";
import type { FocusPassPorts } from "./focus-pass";
import { MediaNotFoundError } from "./library-store";
import type { FocusDetector } from "./focus-detector";
import type { PictureFocus } from "./picture-focus";
import { NOTHING, passOver, storeWith, storedFocus } from "./focus-pass-fixtures";

/** Records each detection's thumbnail and display rendition, answering `NOTHING`. */
class RecordingDetector implements FocusDetector {
  readonly seen: Array<{ thumbnail: Blob; display: Blob | undefined }> = [];

  detect(thumbnail: Blob, display?: Blob): Promise<PictureFocus> {
    this.seen.push({ thumbnail, display });
    return Promise.resolve(NOTHING);
  }
}

/** `store` without `playbackPictureBlob`, the way the server pass hands its store over. */
function withoutDisplay(store: FocusPassPorts["store"]): FocusPassPorts["store"] {
  return {
    listSlideshows: () => store.listSlideshows(),
    pictureFocus: (ids) => store.pictureFocus(ids),
    thumbnailBlob: (id) => store.thumbnailBlob(id),
    putPictureFocus: (id, focus) => store.putPictureFocus(id, focus),
  };
}

describe("FocusPass hands the detector the picture as shown, to measure its sharpness (ADR-0061)", () => {
  it("passes each picture's display rendition beside its thumbnail", async () => {
    const { store, thumbnails, displays } = await storeWith({ "show-1": ["a"] });
    const detector = new RecordingDetector();
    const { pass } = passOver(store, detector);

    pass.start();
    await pass.settled();

    expect(detector.seen).toHaveLength(1);
    expect(detector.seen[0]?.thumbnail).toBe(thumbnails.get("a"));
    expect(detector.seen[0]?.display).toBe(displays.get("a"));
  });

  it("passes no display rendition when the store has none to read", async () => {
    const { store, thumbnails } = await storeWith({ "show-1": ["a"] });
    const detector = new RecordingDetector();
    const { pass } = passOver(withoutDisplay(store), detector);

    pass.start();
    await pass.settled();

    expect(detector.seen).toHaveLength(1);
    expect(detector.seen[0]?.thumbnail).toBe(thumbnails.get("a"));
    expect(detector.seen[0]?.display).toBeUndefined();
  });

  it("skips a picture whose display rendition is gone, as one without a thumbnail", async () => {
    const { store } = await storeWith({ "show-1": ["a"] });
    const detector = new RecordingDetector();
    const gone: FocusPassPorts["store"] = {
      ...withoutDisplay(store),
      playbackPictureBlob: (id) => Promise.reject(new MediaNotFoundError(id)),
    };
    const { pass, reported } = passOver(gone, detector);

    pass.start();
    await pass.settled();

    expect(detector.seen).toEqual([]);
    expect(reported).toEqual([]);
    expect(await store.pictureFocus(["a"])).toEqual(new Map());
  });

  it("stores the focus the detector answers, sharpness included", async () => {
    const { store } = await storeWith({ "show-1": ["a"] });
    const measured: PictureFocus = { kind: "none", sharpness: 120 };
    const detector: FocusDetector = { detect: () => Promise.resolve(measured) };
    const { pass } = passOver(store, detector);

    pass.start();
    await pass.settled();

    expect(await store.pictureFocus(["a"])).toEqual(new Map([["a", storedFocus(measured)]]));
  });
});
