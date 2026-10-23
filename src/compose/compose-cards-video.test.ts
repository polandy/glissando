import { describe, expect, it } from "vitest";
import type { PictureFocus } from "../library/picture-focus";
import type { StoredVideo } from "../library/own-video";
import type {
  CardTint,
  StoredCard,
  StoredPicture,
  StoredSlideshow,
} from "../library/stored-slideshow";
import { parseSlideshow } from "../player/parse-slideshow";
import { pictureSlide } from "../player/testing/picture-slide";
import { CARD_ALONE_MS, CARD_END_FADE_MS, CARD_SLIDE_MS } from "./compose-cards";
import { composeSlideshow } from "./compose-slideshow";
import { NO_SONG_BEATS } from "./playlist";
import { NO_SONG_LOUDNESS } from "./song-loudness";

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

/** A video picture: its clip lasts `endMs` (the excerpt starts at 0), its poster the picture. */
function clip(id: string, capturedAt: string, video: Partial<StoredVideo> = {}): StoredPicture {
  return {
    ...picture(id, capturedAt),
    video: { mediaId: `v-${id}`, sourceMs: 60_000, startMs: 0, endMs: 8400, ...video },
  };
}

const sources = {
  picture: (id: string) => `pictures/${id}.jpg`,
  music: (id: string) => `music/${id}.mp3`,
  video: (id: string) => `videos/${id}.mp4`,
};

const NO_FOCUS: ReadonlyMap<string, PictureFocus> = new Map();
// No beats: the nominal values apply directly (TITLE_CARD_COMPOSITION.md, Beats).
const REVEAL_AT_MS = 2500;
const LEAD_MS = REVEAL_AT_MS + 1400;

function storedSlideshow(overrides: Partial<StoredSlideshow> = {}): StoredSlideshow {
  return {
    id: "s1",
    title: "July 2025",
    createdAt: "2025-07-21T00:00:00Z",
    pictures: [
      picture("p1", "2025-07-01T10:00:00Z"),
      picture("p2", "2025-07-02T10:00:00Z"),
      picture("p3", "2025-07-03T10:00:00Z"),
    ],
    songs: [],
    secondsPerPicture: 5,
    ...overrides,
  };
}

function pictureCard(pictureId: string, motion: boolean, tint: CardTint = "picture"): StoredCard {
  return {
    title: "Summer at the Lake",
    style: "modern",
    position: "centre",
    entrance: "rise",
    background: { kind: "picture", pictureId, fade: 60, tint },
    motion,
  };
}

function compose(stored: StoredSlideshow) {
  return composeSlideshow(stored, sources, NO_FOCUS, NO_SONG_BEATS, NO_SONG_LOUDNESS, "en");
}

describe("composeCards, a card on a video slide", () => {
  it("a title card on a first video slide lies over the playing clip without lengthening the slide", () => {
    const stored = storedSlideshow({
      pictures: [
        clip("p1", "2025-07-01T10:00:00Z"),
        picture("p2", "2025-07-02T10:00:00Z"),
        picture("p3", "2025-07-03T10:00:00Z"),
      ],
      openingCard: pictureCard("p1", true),
    });
    const result = compose(stored);
    expect(result.slides).toHaveLength(3);
    const first = pictureSlide(result.slides[0]);
    expect(first.video).toMatchObject({ startMs: 0, endMs: 8400 });
    expect(first.durationMs).toBe(8400);
    expect(first.card).toMatchObject({ revealAtMs: REVEAL_AT_MS });
  });

  it("a title card on a video too short for its reveal gets a slide of its own in front", () => {
    const stored = storedSlideshow({
      pictures: [
        clip("p1", "2025-07-01T10:00:00Z", { endMs: 3000 }),
        picture("p2", "2025-07-02T10:00:00Z"),
      ],
      openingCard: pictureCard("p1", true),
    });
    const result = compose(stored);
    expect(result.slides).toHaveLength(3);
    const lead = pictureSlide(result.slides[0]);
    expect(lead.image.src).toBe("pictures/p1.jpg");
    expect(lead.video).toBeUndefined();
    expect(lead.durationMs).toBe(LEAD_MS + CARD_ALONE_MS);
    expect(lead.card).toMatchObject({ revealAtMs: REVEAL_AT_MS });
    // The clip itself still plays its whole excerpt, untouched, right after.
    const video = pictureSlide(result.slides[1]);
    expect(video.video).toMatchObject({ startMs: 0, endMs: 3000 });
    expect(video.durationMs).toBe(3000);
    expect(video.card).toBeUndefined();
  });

  it("a closing card on a last video slide enters before the clip ends, not after", () => {
    const stored = storedSlideshow({
      pictures: [picture("p1", "2025-07-01T10:00:00Z"), clip("p3", "2025-07-03T10:00:00Z")],
      closingCard: pictureCard("p3", true),
    });
    const result = compose(stored);
    expect(result.slides).toHaveLength(2);
    const last = pictureSlide(result.slides.at(-1));
    expect(last.video).toMatchObject({ startMs: 0, endMs: 8400 });
    expect(last.durationMs).toBe(8400);
    expect(last.card).toMatchObject({ enterAtMs: 8400 - CARD_SLIDE_MS - CARD_END_FADE_MS });
    expect(result.endFadeMs).toBe(CARD_END_FADE_MS);
  });

  it("a closing card on a video too short for it gets a trailing slide of its own", () => {
    const stored = storedSlideshow({
      pictures: [
        picture("p1", "2025-07-01T10:00:00Z"),
        clip("p3", "2025-07-03T10:00:00Z", { endMs: 3000 }),
      ],
      closingCard: pictureCard("p3", true),
    });
    const result = compose(stored);
    expect(result.slides).toHaveLength(3);
    // The clip itself still plays its whole excerpt, untouched, before the card's own slide.
    const video = pictureSlide(result.slides[1]);
    expect(video.video).toMatchObject({ startMs: 0, endMs: 3000 });
    expect(video.durationMs).toBe(3000);
    expect(video.card).toBeUndefined();
    const trailing = pictureSlide(result.slides.at(-1));
    expect(trailing.image.src).toBe("pictures/p3.jpg");
    expect(trailing.video).toBeUndefined();
    expect(trailing.durationMs).toBe(CARD_ALONE_MS + CARD_SLIDE_MS + CARD_END_FADE_MS);
    expect(trailing.card).toMatchObject({ enterAtMs: CARD_ALONE_MS });
    expect(result.endFadeMs).toBe(CARD_END_FADE_MS);
  });

  it("composes a card merged onto a video slide into JSON the player accepts", () => {
    const stored = storedSlideshow({
      pictures: [
        clip("p1", "2025-07-01T10:00:00Z"),
        picture("p2", "2025-07-02T10:00:00Z"),
        clip("p3", "2025-07-03T10:00:00Z"),
      ],
      openingCard: pictureCard("p1", true),
      closingCard: pictureCard("p3", true),
    });
    const result = compose(stored);
    expect(parseSlideshow(JSON.parse(JSON.stringify(result)))).toEqual(result);
  });
});
