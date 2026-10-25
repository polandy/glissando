import { describe, expect, it } from "vitest";
import type { MusicBeats } from "../beats";
import type { PictureFocus } from "../library/picture-focus";
import type {
  CardTint,
  StoredCard,
  StoredMusic,
  StoredPicture,
  StoredSlideshow,
} from "../library/stored-slideshow";
import { composeSlideshow } from "./compose-slideshow";
import { playlistBeatsMs } from "./playlist";
import { slideUnits } from "./slide-units";
import { NO_SONG_LOUDNESS } from "./song-loudness";

/**
 * A title card or a trip chapter adds real playlist time ahead of or inside the first slides
 * (ADR-0032, `TRIP_CHAPTERS.md` Rule F). These tests prove that every picture-to-picture boundary
 * still lands on a beat of `playlistBeatsMs`, measured in that real, composed time — the bug this
 * fix addresses let the inserted time shift every boundary after it off the beat.
 */

function picture(id: string, overrides: Partial<StoredPicture> = {}): StoredPicture {
  return {
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    fileName: `${id}.jpg`,
    width: 400,
    height: 300,
    colours: { veil: "#404040", accent: "#C0C0C0" },
    ...overrides,
  };
}

function pictures(count: number): StoredPicture[] {
  return Array.from({ length: count }, (_, index) => picture(`p${index}`));
}

const sources = {
  picture: (id: string) => `pictures/${id}.jpg`,
  music: (id: string) => `music/${id}.mp3`,
  video: (id: string) => `videos/${id}.mp4`,
};

const NO_FOCUS: ReadonlyMap<string, PictureFocus> = new Map();

const MUSIC: StoredMusic = {
  id: "m1",
  fileName: "Sommerwind.mp3",
  durationMs: 60_000,
  mimeType: "audio/mpeg",
};

/** A beat every 450 ms of the track from its start, reaching well past the composed shows below. */
const BEATS: MusicBeats = {
  kind: "beats",
  beatsMs: Array.from({ length: 120 }, (_, n) => n * 450),
  beatsPerMinute: 133,
};

const COLOUR_CARD: StoredCard = {
  title: "Summer at the Lake",
  style: "modern",
  position: "centre",
  entrance: "rise",
  background: { kind: "colour", colour: "plum" },
  motion: true,
};

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

function storedSlideshow(overrides: Partial<StoredSlideshow> = {}): StoredSlideshow {
  return {
    id: "s1",
    title: "July 2025",
    createdAt: "2025-07-21T00:00:00Z",
    pictures: pictures(4),
    secondsPerPicture: 5,
    songs: [MUSIC],
    ...overrides,
  };
}

function composed(stored: StoredSlideshow) {
  return composeSlideshow(
    stored,
    sources,
    NO_FOCUS,
    new Map([[MUSIC.id, BEATS]]),
    NO_SONG_LOUDNESS,
    "en",
  );
}

/**
 * Every slide-unit-to-slide-unit boundary's real end in playlist ms, i.e. a genuine picture
 * change — not the boundary right after a title card's own dedicated (prepended) slide, nor the
 * show's end. With neither a prepended card nor an inserted chapter slide, the composed slides'
 * last `unitCount` entries are exactly the slide units, in order; a card merged onto one widens it
 * in place rather than adding a slide, so this still holds.
 */
function pictureBoundariesMs(stored: StoredSlideshow): number[] {
  const slides = composed(stored).slides;
  const unitCount = slideUnits(stored.pictures, stored.portraitPictures).length;
  const firstUnitSlideIndex = slides.length - unitCount;
  const boundaries: number[] = [];
  let endMs = 0;
  slides.forEach((slide, index) => {
    endMs += slide.durationMs;
    if (index >= firstUnitSlideIndex && index < slides.length - 1) {
      boundaries.push(endMs);
    }
  });
  return boundaries;
}

function expectBoundariesOnBeats(stored: StoredSlideshow): void {
  const beatsMs = new Set(playlistBeatsMs(stored, new Map([[MUSIC.id, BEATS]])));
  for (const boundaryMs of pictureBoundariesMs(stored)) {
    expect(beatsMs.has(boundaryMs)).toBe(true);
  }
}

describe("composeSlideshow keeps picture boundaries on the beat around a title card", () => {
  it("with a colour title card", () => {
    const stored = storedSlideshow({ openingCard: COLOUR_CARD });
    expect(pictureBoundariesMs(stored).length).toBeGreaterThan(0);
    expectBoundariesOnBeats(stored);
  });

  it("with a motion picture title card merged onto a mergeable first slide", () => {
    const stored = storedSlideshow({ openingCard: pictureCard("p0", true) });
    expect(pictureBoundariesMs(stored).length).toBeGreaterThan(0);
    expectBoundariesOnBeats(stored);
  });

  it("with a motion picture title card played standalone, the first slide paired", () => {
    // Two adjacent portrait pictures pair into one slide unit (ADR-0028), so the card cannot merge
    // onto slide unit 0 (slideOfPicture(units, 0) holds two pictures) and plays alone instead.
    const stored = storedSlideshow({
      pictures: [
        picture("p0", { width: 300, height: 400 }),
        picture("p1", { width: 300, height: 400 }),
        ...pictures(2),
      ],
      openingCard: pictureCard("p0", true),
    });
    expect(pictureBoundariesMs(stored).length).toBeGreaterThan(0);
    expectBoundariesOnBeats(stored);
  });

  it("with a trip chapter merged onto its anchor's own slide", () => {
    const stored = storedSlideshow({ addedChapters: [{ beforePictureId: "p2" }] });
    expect(pictureBoundariesMs(stored).length).toBeGreaterThan(0);
    expectBoundariesOnBeats(stored);
  });

  it("with both a title card and a trip chapter", () => {
    const stored = storedSlideshow({
      openingCard: pictureCard("p0", true),
      addedChapters: [{ beforePictureId: "p2" }],
    });
    expect(pictureBoundariesMs(stored).length).toBeGreaterThan(0);
    expectBoundariesOnBeats(stored);
  });

  it("without any music beats, composes without throwing", () => {
    const stored = storedSlideshow({ openingCard: COLOUR_CARD, songs: [] });
    expect(() =>
      composeSlideshow(stored, sources, NO_FOCUS, new Map(), NO_SONG_LOUDNESS, "en"),
    ).not.toThrow();
  });
});
