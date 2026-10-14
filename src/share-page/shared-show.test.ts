import { describe, expect, it } from "vitest";
import { pictureKey, songKey } from "../html-export/page-contract";
import type { StoredSlideshow } from "../library/stored-slideshow";
import { pictureSlide } from "../player/testing/picture-slide";
import type { ShareAnswer } from "./share-answer";
import { ShareMediumMissingError, ShareUnreachableError, type ShareApi } from "./share-api";
import {
  loadSharedShow,
  playableShow,
  shareSummary,
  SharedPictureMissingError,
  skipMissingPicture,
} from "./shared-show";

const SLIDE_MS = 3000;

function stored(songCount: number): StoredSlideshow {
  return {
    id: "shared",
    title: "Lake Garda",
    createdAt: "2026-07-02T10:00:00Z",
    secondsPerPicture: SLIDE_MS / 1000,
    pictures: [0, 1, 2].map((index) => ({
      id: pictureKey(index),
      capturedAt: "2026-07-01T00:00:00Z",
      width: 1600,
      height: 900,
      fileName: pictureKey(index),
      durationMs: SLIDE_MS,
    })),
    songs: Array.from({ length: songCount }, (_, index) => ({
      id: songKey(index),
      fileName: songKey(index),
      durationMs: 6000,
      mimeType: "audio/wav",
    })),
  };
}

/** A share API over `answers`, served one after the other; records what was fetched. */
function fakeApi(answers: ShareAnswer[], missing: ReadonlySet<number> = new Set()) {
  const fetched: string[] = [];
  const queue = [...answers];
  const api: ShareApi = {
    answer() {
      fetched.push("answer");
      const next = queue.length > 1 ? queue.shift() : queue[0];
      return next === undefined
        ? Promise.reject(new ShareUnreachableError("no answer"))
        : Promise.resolve(next);
    },
    picture(revision, index) {
      fetched.push(`picture ${revision}/${index}`);
      return missing.has(index)
        ? Promise.reject(new ShareMediumMissingError(`no picture ${index}`))
        : Promise.resolve(new Blob([`picture ${index}`]));
    },
    song(index) {
      fetched.push(`song ${index}`);
      return Promise.resolve(new Blob([`song ${index}`]));
    },
  };
  return { api, fetched };
}

let made = 0;
const countedUrl = () => `blob:song-${made++}`;

describe("loadSharedShow", () => {
  it("fetches each song the slideshow plays once, before it can play", async () => {
    const { api, fetched } = fakeApi([{ revision: 1, slideshow: stored(2), beats: new Map() }]);

    const show = await loadSharedShow(api, countedUrl, null);

    expect(fetched).toEqual(["answer", "song 0", "song 1"]);
    expect([...show.songUrls.keys()]).toEqual([songKey(0), songKey(1)]);
    const { slideshow } = playableShow(show, api, new Set());
    expect(slideshow.music?.map(({ src }) => src)).toEqual([...show.songUrls.values()]);
  });

  it("keeps the slideshow it has, songs and all, while the revision is the same", async () => {
    const answer: ShareAnswer = { revision: 4, slideshow: stored(1), beats: new Map() };
    const { api, fetched } = fakeApi([answer, answer]);
    const first = await loadSharedShow(api, countedUrl, null);

    const again = await loadSharedShow(api, countedUrl, first);

    expect(again).toBe(first);
    expect(fetched).toEqual(["answer", "song 0", "answer"]);
  });

  it("takes the slideshow as it is now once it was edited", async () => {
    const edited: StoredSlideshow = { ...stored(0), title: "Lake Garda, edited" };
    const { api } = fakeApi([
      { revision: 4, slideshow: stored(0), beats: new Map() },
      { revision: 5, slideshow: edited, beats: new Map() },
    ]);
    const first = await loadSharedShow(api, countedUrl, null);

    const again = await loadSharedShow(api, countedUrl, first);

    expect(again.revision).toBe(5);
    expect(again.stored.title).toBe("Lake Garda, edited");
  });
});

describe("playableShow", () => {
  it("fetches a picture by its position in the revision, also after one before it was skipped", async () => {
    const { api, fetched } = fakeApi([{ revision: 2, slideshow: stored(0), beats: new Map() }]);
    const show = await loadSharedShow(api, countedUrl, null);

    const played = playableShow(show, api, new Set([pictureKey(0)]));
    await played.openPicture(pictureKey(2));

    expect(played.slideshow.slides.map((slide) => pictureSlide(slide).image.src)).toEqual([
      pictureKey(1),
      pictureKey(2),
    ]);
    expect(fetched.at(-1)).toBe("picture 2/2");
  });

  it("names the picture the server no longer has", async () => {
    const { api } = fakeApi(
      [{ revision: 2, slideshow: stored(0), beats: new Map() }],
      new Set([1]),
    );
    const show = await loadSharedShow(api, countedUrl, null);

    const opened = playableShow(show, api, new Set()).openPicture(pictureKey(1));

    await expect(opened).rejects.toThrow(SharedPictureMissingError);
    await expect(opened).rejects.toHaveProperty("pictureKey", pictureKey(1));
  });
});

describe("skipMissingPicture", () => {
  it("goes on where the missing picture would have started", async () => {
    const { api } = fakeApi([{ revision: 2, slideshow: stored(0), beats: new Map() }]);
    const show = await loadSharedShow(api, countedUrl, null);

    const skip = skipMissingPicture(show, new Set(), pictureKey(1));

    expect(skip).toEqual({ skipped: new Set([pictureKey(1)]), atSeconds: SLIDE_MS / 1000 });
  });

  it("gives up when no picture would be left", async () => {
    const { api } = fakeApi([{ revision: 2, slideshow: stored(0), beats: new Map() }]);
    const show = await loadSharedShow(api, countedUrl, null);

    const skip = skipMissingPicture(show, new Set([pictureKey(0), pictureKey(1)]), pictureKey(2));

    expect(skip).toBeNull();
  });

  it("goes on at the slide its pair's survivor moves to, a picture index no longer matching a slide index (ADR-0028)", async () => {
    // Four portrait pictures, automatically paired two by two: (0,1) and (2,3).
    const portraitStored: StoredSlideshow = {
      ...stored(0),
      pictures: [0, 1, 2, 3].map((index) => ({
        id: pictureKey(index),
        capturedAt: "2026-07-01T00:00:00Z",
        width: 900,
        height: 1600,
        fileName: pictureKey(index),
      })),
    };
    const { api } = fakeApi([{ revision: 2, slideshow: portraitStored, beats: new Map() }]);
    const show = await loadSharedShow(api, countedUrl, null);

    // Picture 2 going missing leaves picture 3 without a partner: it plays alone, on the slide
    // right after the surviving pair (0, 1) — not at the pair's own slide index (1), which a
    // picture-indexed lookup into the slide starts would wrongly use.
    const skip = skipMissingPicture(show, new Set(), pictureKey(2));

    // The pair (0, 1) lasts 1.5 times a single slide's seconds (ADR-0028).
    expect(skip).toEqual({
      skipped: new Set([pictureKey(2)]),
      atSeconds: (SLIDE_MS / 1000) * 1.5,
    });
  });
});

describe("shareSummary", () => {
  it("counts the pictures, two on a paired slide, and sums the slides' durations", async () => {
    // Four portrait pictures, automatically paired two by two: two slides of 1.5 times the seconds.
    const portraitStored: StoredSlideshow = {
      ...stored(0),
      pictures: [0, 1, 2, 3].map((index) => ({
        id: pictureKey(index),
        capturedAt: "2026-07-01T00:00:00Z",
        width: 900,
        height: 1600,
        fileName: pictureKey(index),
      })),
    };
    const { api } = fakeApi([{ revision: 2, slideshow: portraitStored, beats: new Map() }]);
    const show = await loadSharedShow(api, countedUrl, null);

    expect(shareSummary(show, playableShow(show, api, new Set()).slideshow)).toEqual({
      pictureCount: 4,
      durationMs: 2 * SLIDE_MS * 1.5,
      withMusic: false,
    });
  });
});
