import { describe, expect, it } from "vitest";
import {
  EVERY_FIELD_FOCUS,
  EVERY_FIELD_SLIDESHOW,
  everyFieldStore,
} from "./testing/every-field-fixture";
import { asOriginal, originalIds, roundTrip } from "./testing/round-trip";

describe("a .glissando file round trip", () => {
  it("opens a slideshow with every optional field set as an equal copy, but for its ids and title", async () => {
    const store = await everyFieldStore();
    const copy = await roundTrip(EVERY_FIELD_SLIDESHOW, store);

    expect(copy.id).not.toBe(EVERY_FIELD_SLIDESHOW.id);
    expect(copy.title).toBe(`${EVERY_FIELD_SLIDESHOW.title} (2)`);
    expect(asOriginal(copy, EVERY_FIELD_SLIDESHOW)).toEqual(EVERY_FIELD_SLIDESHOW);
  });

  it("stores each picture's focus under its new id", async () => {
    const store = await everyFieldStore();
    const copy = await roundTrip(EVERY_FIELD_SLIDESHOW, store);
    const ids = originalIds(copy, EVERY_FIELD_SLIDESHOW);

    const copied = await store.pictureFocus(copy.pictures.map(({ id }) => id));
    const byOriginalId = new Map([...copied].map(([id, stored]) => [ids.get(id), stored]));
    expect(byOriginalId).toEqual(EVERY_FIELD_FOCUS);
  });

  it("stores the same bytes of every picture, thumbnail, clip and song under their new ids", async () => {
    const store = await everyFieldStore();
    const copy = await roundTrip(EVERY_FIELD_SLIDESHOW, store);
    const ids = originalIds(copy, EVERY_FIELD_SLIDESHOW);
    const same = async (read: (id: string) => Promise<Blob>, copyId: string): Promise<void> => {
      const originalId = ids.get(copyId) ?? "";
      expect(await (await read(copyId)).text()).toBe(await (await read(originalId)).text());
    };

    expect(copy.pictures[0]?.video).toBeDefined();
    for (const { id, video } of copy.pictures) {
      await same((pictureId) => store.pictureBlob(pictureId), id);
      await same((pictureId) => store.thumbnailBlob(pictureId), id);
      if (video !== undefined) await same((mediaId) => store.videoBlob(mediaId), video.mediaId);
    }
    for (const { id } of copy.songs) await same((songId) => store.musicBlob(songId), id);
  });
});
