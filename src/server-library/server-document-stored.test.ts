import { describe, expect, it } from "vitest";
import type { StoredSlideshow } from "../library/stored-slideshow";
import { serverDocumentFor } from "./server-document";
import { storedSlideshowFrom } from "./server-document";
import {
  ASSET_A,
  ASSET_B,
  MUSIC_ID,
  MUSIC_ID_2,
  slideshow,
  document,
} from "./server-document-fixtures";

describe("storedSlideshowFrom", () => {
  it("is the server slideshow with each picture's id its immichAssetId", () => {
    const stored = storedSlideshowFrom("server-show-1", document());
    expect(stored.pictures.map((picture) => picture.id)).toEqual([ASSET_A, ASSET_B]);
    expect(stored).toEqual(slideshow);
  });

  it("gives each song the id of its musicId", () => {
    expect(storedSlideshowFrom("server-show-1", document()).songs.map((song) => song.id)).toEqual([
      MUSIC_ID,
    ]);
  });

  it("gives several songs their own musicId, in play order", () => {
    const withTwoSongs: StoredSlideshow = {
      ...slideshow,
      songs: slideshow.songs.flatMap((song) => [song, { ...song, id: MUSIC_ID_2 }]),
    };
    const written = serverDocumentFor(withTwoSongs);

    const stored = storedSlideshowFrom("server-show-1", written);

    expect(stored.songs.map((song) => song.id)).toEqual([MUSIC_ID, MUSIC_ID_2]);
  });
});
