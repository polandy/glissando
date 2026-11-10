import { describe, expect, it } from "vitest";
import { FOCUS_DETECTOR_VERSION } from "../focus/focus-detector-version";
import { FocusPass } from "../library/focus-pass";
import type { FocusDetector } from "../library/focus-detector";
import type { PictureFocus, StoredFocus } from "../library/picture-focus";
import { MemoryLibraryStore } from "../library/testing/memory-store";
import { checkGlissandoFile } from "./check-glissando-file";
import { FOCUS_FROM_VERSION, GLISSANDO_FORMAT_VERSION } from "./glissando-manifest";
import { readManifest } from "./read-manifest";
import { fakeMediaDecoders } from "./testing/fake-media-decoders";
import { entryTexts, EXPORTED_SLIDESHOW, exportedFile } from "./testing/glissando-fixtures";
import { writeGlissandoFile } from "./write-glissando-file";

const FACES: PictureFocus = {
  kind: "subject",
  box: { x: 0.2, y: 0.1, width: 0.3, height: 0.4 },
  foundBy: "face",
};
const FOUND_NOW: StoredFocus = { focus: FACES, detector: FOCUS_DETECTOR_VERSION };
const FOUND_BY_AN_OLDER_DETECTOR: StoredFocus = {
  focus: FACES,
  detector: FOCUS_DETECTOR_VERSION - 1,
};
/** The thumbnail markers `exportedFile` writes for `src-p1` and `src-p2`. */
const THUMB_ONE = "thumb one";
const THUMB_TWO = "thumb two";

/** Records the marker of every thumbnail it is asked to search, and finds nothing in it. */
class RecordingDetector implements FocusDetector {
  readonly searched: string[] = [];

  async detect(thumbnail: Blob): Promise<PictureFocus> {
    const text = await thumbnail.text();
    this.searched.push([THUMB_ONE, THUMB_TWO].find((marker) => text.endsWith(marker)) ?? text);
    return { kind: "none" };
  }
}

/** Opens `file` into an empty library and runs the focus pass over it to its end. */
async function openAndSearch(file: Blob) {
  const check = await checkGlissandoFile(file, {
    freeBytes: () => Promise.resolve(null),
    mediaDecoders: fakeMediaDecoders(),
  });
  if (check.kind !== "ok") {
    throw new Error(`the exported file should pass the check, got ${check.kind}`);
  }
  const store = new MemoryLibraryStore();
  let next = 0;
  const created = await writeGlissandoFile(
    check.contents,
    { store, newId: () => `new-${++next}`, now: () => new Date(0), log: () => undefined },
    { existingTitles: [], signal: new AbortController().signal },
  );
  const detector = new RecordingDetector();
  const pass = new FocusPass({
    store,
    detector,
    log: () => undefined,
    reportError: () => undefined,
  });
  pass.start();
  await pass.settled();
  const [second, first] = created.pictures.map((picture) => picture.id);
  if (first === undefined || second === undefined) {
    throw new Error("the exported slideshow has two pictures");
  }
  return { store, detector, first, second };
}

describe("a .glissando file carries each picture's focus", () => {
  it("writes the stored focus with its detector version, and nothing for a picture without one", async () => {
    const file = await exportedFile(EXPORTED_SLIDESHOW, new Map([["src-p1", FOUND_NOW]]));
    const read = readManifest((await entryTexts(file))["glissando.json"] ?? "");
    if (read.kind !== "ok") {
      throw new Error(`the manifest should read, got ${read.kind}`);
    }

    const [second, first] = read.manifest.slideshow.pictures;
    expect(first?.fileName).toBe("a.jpg");
    expect(first?.focus).toEqual(FOUND_NOW);
    expect(second?.fileName).toBe("b.jpg");
    expect(second).not.toHaveProperty("focus");
  });

  it("is written as the format version that carries it, and refused in an older one", async () => {
    const file = await exportedFile(EXPORTED_SLIDESHOW, new Map([["src-p1", FOUND_NOW]]));
    const written = JSON.parse((await entryTexts(file))["glissando.json"] ?? "") as {
      formatVersion: number;
    };

    expect(FOCUS_FROM_VERSION).toBe(GLISSANDO_FORMAT_VERSION);
    expect(written.formatVersion).toBe(FOCUS_FROM_VERSION);
    const older = JSON.stringify({ ...written, formatVersion: FOCUS_FROM_VERSION - 1 });
    expect(readManifest(older).kind).toBe("damaged");
  });

  it("opening it skips detection for a picture whose carried focus is current, and runs it for one without", async () => {
    const file = await exportedFile(EXPORTED_SLIDESHOW, new Map([["src-p1", FOUND_NOW]]));

    const { store, detector, first, second } = await openAndSearch(file);

    expect(detector.searched).toEqual([THUMB_TWO]);
    expect((await store.pictureFocus([first])).get(first)).toEqual(FOUND_NOW);
    expect((await store.pictureFocus([second])).get(second)?.focus).toEqual({ kind: "none" });
  });

  it("opening it runs detection again for a picture whose carried focus an older detector found", async () => {
    const file = await exportedFile(
      EXPORTED_SLIDESHOW,
      new Map([
        ["src-p1", FOUND_BY_AN_OLDER_DETECTOR],
        ["src-p2", FOUND_NOW],
      ]),
    );

    const { detector } = await openAndSearch(file);

    expect(detector.searched).toEqual([THUMB_ONE]);
  });

  it("opening a file without any focus runs detection for every picture", async () => {
    const { detector } = await openAndSearch(await exportedFile());

    expect([...detector.searched].sort()).toEqual([THUMB_ONE, THUMB_TWO]);
  });
});
