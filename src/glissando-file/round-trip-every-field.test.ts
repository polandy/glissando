import { describe, expect, it } from "vitest";
import type { StoredSlideshow } from "../library/stored-slideshow";
import { checkGlissandoFile } from "./check-glissando-file";
import { exportSlideshow } from "./export-slideshow";
import { EVERY_FIELD_SLIDESHOW, everyFieldStore } from "./testing/every-field-fixture";
import { fakeMediaDecoders } from "./testing/fake-media-decoders";
import { EXPORT_OPTIONS, MODIFIED_AT } from "./testing/glissando-fixtures";
import { writeGlissandoFile } from "./write-glissando-file";

/** `copy` with each new id swapped for the original's id at the same place in `original`. */
function withOriginalIds(copy: StoredSlideshow, original: StoredSlideshow): unknown {
  const originalIds = new Map<string, string>();
  const pair = (copyId: string | undefined, originalId: string | undefined): void => {
    if (copyId !== undefined && originalId !== undefined) {
      originalIds.set(copyId, originalId);
    }
  };
  copy.pictures.forEach((picture, index) => {
    const source = original.pictures[index];
    pair(picture.id, source?.id);
    pair(picture.video?.mediaId, source?.video?.mediaId);
  });
  copy.songs.forEach((song, index) => pair(song.id, original.songs[index]?.id));
  return JSON.parse(JSON.stringify(copy), (_key, value: unknown) =>
    typeof value === "string" ? (originalIds.get(value) ?? value) : value,
  );
}

describe("a .glissando file round trip", () => {
  it("opens a slideshow with every optional field set as an equal copy, but for its ids and title", async () => {
    const store = await everyFieldStore();
    const exported = await exportSlideshow(EVERY_FIELD_SLIDESHOW, store, EXPORT_OPTIONS);
    const check = await checkGlissandoFile(exported, {
      freeBytes: () => Promise.resolve(null),
      mediaDecoders: fakeMediaDecoders(),
    });
    if (check.kind !== "ok") {
      throw new Error(`the export should pass the check, got ${JSON.stringify(check)}`);
    }
    let next = 0;
    const created = await writeGlissandoFile(
      check.contents,
      { store, newId: () => `copy-${++next}`, now: () => MODIFIED_AT, log: () => undefined },
      { existingTitles: [EVERY_FIELD_SLIDESHOW.title], signal: new AbortController().signal },
    );

    const copy = await store.getSlideshow(created.id);
    expect(copy.id).not.toBe(EVERY_FIELD_SLIDESHOW.id);
    expect(copy.title).toBe(`${EVERY_FIELD_SLIDESHOW.title} (2)`);
    expect(withOriginalIds(copy, EVERY_FIELD_SLIDESHOW)).toEqual({
      ...EVERY_FIELD_SLIDESHOW,
      id: copy.id,
      title: copy.title,
      createdAt: copy.createdAt,
    });
  });
});
