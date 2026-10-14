import { describe, expect, it } from "vitest";
import { composeSlideshow } from "./compose-slideshow";
import type { PictureFocus } from "../library/picture-focus";
import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { NO_SONG_BEATS } from "./playlist";

function picture(id: string, capturedAt: string): StoredPicture {
  return {
    id,
    capturedAt,
    fileName: `${id}.jpg`,
    width: 400,
    height: 300,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  };
}

const sources = {
  picture: (id: string) => `pictures/${id}.jpg`,
  music: (id: string) => `music/${id}.mp3`,
};

const NO_FOCUS: ReadonlyMap<string, PictureFocus> = new Map();

function storedSlideshow(overrides: Partial<StoredSlideshow> = {}): StoredSlideshow {
  return {
    id: "s1",
    title: "July 2025",
    createdAt: "2025-07-21T00:00:00Z",
    pictures: [picture("a", "2025-07-01T10:00:00Z"), picture("b", "2025-07-02T10:00:00Z")],
    songs: [],
    secondsPerPicture: 5,
    ...overrides,
  };
}

describe("composeSlideshow with the slideshow's default transition", () => {
  function threePictures(overrides: Partial<StoredSlideshow> = {}): StoredSlideshow {
    return storedSlideshow({
      pictures: [
        picture("a", "2025-07-01T10:00:00Z"),
        picture("b", "2025-07-02T10:00:00Z"),
        picture("c", "2025-07-03T10:00:00Z"),
      ],
      ...overrides,
    });
  }

  function effects(stored: StoredSlideshow): readonly (string | undefined)[] {
    return composeSlideshow(stored, sources, NO_FOCUS, NO_SONG_BEATS).slides.map(
      (slide) => slide.transitionToNext?.effect,
    );
  }

  it("crossfades every picture while the slideshow stores no default", () => {
    expect(effects(threePictures())).toEqual(["crossfade", "crossfade", undefined]);
  });

  it("plays the stored default on every picture without its own", () => {
    const stored = threePictures({ transition: "dissolve" });
    const [first, second, third] = stored.pictures as [StoredPicture, StoredPicture, StoredPicture];

    expect(
      effects({ ...stored, pictures: [first, { ...second, transition: "zoom-in" }, third] }),
    ).toEqual(["dissolve", "zoom-in", undefined]);
  });

  it("alternates the effects by position when the default alternates", () => {
    expect(effects(threePictures({ transition: "alternate" }))).toEqual([
      "crossfade",
      "push-left",
      undefined,
    ]);
  });
});
