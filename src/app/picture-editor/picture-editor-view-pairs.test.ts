import { describe, expect, it } from "vitest";
import { composeSlideshow, NO_SONG_BEATS, NO_SONG_LOUDNESS, type SongBeats } from "../../compose";
import { ALTERNATE_TRANSITION } from "../../library/own-timing";
import type { StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import { isGroundSlide, type KenBurns, type Slide } from "../../player";
import { pictureSlide } from "../../player/testing/picture-slide";
import { NO_FOCUS_KNOWN } from "../focus/pictures-focus";
import { pictureEditorView } from "./picture-editor-view";
import { music, STEADY_BEATS, stored } from "./testing/picture-editor-fixtures";

const LANDSCAPE = { width: 300, height: 200 };
const PORTRAIT = { width: 200, height: 300 };

const at = (id: string, size: typeof LANDSCAPE): StoredPicture => ({
  id,
  capturedAt: "2025-07-01T10:00:00Z",
  fileName: `${id}.jpg`,
  colours: { veil: "#404040", accent: "#C0C0C0" },
  ...size,
});

/** Composed into five slides: l0 · (p1, p2) · l3 · (p4, p5) · l6 (ADR-0028). */
const withPairs: StoredSlideshow = {
  ...stored,
  pictures: [
    at("l0", LANDSCAPE),
    at("p1", PORTRAIT),
    at("p2", PORTRAIT),
    at("l3", LANDSCAPE),
    at("p4", PORTRAIT),
    at("p5", PORTRAIT),
    at("l6", LANDSCAPE),
  ],
  transition: ALTERNATE_TRANSITION,
  songs: [music(30_000)],
};
const BEATS: SongBeats = new Map([["m", STEADY_BEATS]]);

const motion = ({ from, to }: KenBurns) => ({ from, to });

/** What the player plays for `pictureId`, from the composed slideshow itself. */
function played(slideshow: StoredSlideshow, pictureId: string, beats: SongBeats) {
  const { slides } = composeSlideshow(
    slideshow,
    { picture: (id) => id, music: (id) => id, video: (id) => id },
    new Map(),
    beats,
    NO_SONG_LOUDNESS,
    "en",
  );
  const slideIndex = slides.findIndex((raw) => {
    if (isGroundSlide(raw)) {
      return false;
    }
    return raw.image.src === pictureId || raw.partner?.image.src === pictureId;
  });
  const slide = pictureSlide(slides[slideIndex] as Slide);
  const rawNextSlide = slides[slideIndex + 1];
  const nextSlide = rawNextSlide === undefined ? undefined : pictureSlide(rawNextSlide);
  const numberOf = (id: string) => slideshow.pictures.findIndex((each) => each.id === id) + 1;
  return {
    motion: motion(
      (slide.image.src === pictureId ? slide.kenBurns : slide.partner?.kenBurns) as KenBurns,
    ),
    durationMs: slide.durationMs,
    transition: {
      choice: slide.transitionToNext?.effect,
      durationMs: slide.transitionToNext?.durationMs ?? 0,
    },
    next:
      nextSlide === undefined
        ? null
        : {
            number: numberOf(nextSlide.image.src),
            motion: motion(nextSlide.kenBurns),
            durationMs: nextSlide.durationMs,
          },
  };
}

function previewed(slideshow: StoredSlideshow, pictureId: string, beats: SongBeats) {
  const view = pictureEditorView(slideshow, pictureId, NO_FOCUS_KNOWN, beats);
  return {
    motion: view.motion,
    durationMs: view.durationMs,
    // The last slide keeps its choice on show but plays none, like the composed slide.
    transition: {
      choice: view.next === null ? undefined : view.transition.choice,
      durationMs: view.transition.durationMs,
    },
    next:
      view.next === null
        ? null
        : { number: view.next.number, motion: view.next.motion, durationMs: view.next.durationMs },
  };
}

describe("pictureEditorView with portrait pairs (ADR-0028)", () => {
  it.each(["l0", "p1", "p2", "l3", "p4", "p5", "l6"])(
    "previews %s as the player plays its slide, pairs before it counted once, on the beats",
    (pictureId) => {
      expect(previewed(withPairs, pictureId, BEATS)).toEqual(played(withPairs, pictureId, BEATS));
    },
  );

  it("gives both halves of a pair the slide's one transition into the slide after the pair", () => {
    const first = pictureEditorView(withPairs, "p1", NO_FOCUS_KNOWN, NO_SONG_BEATS);
    const second = pictureEditorView(withPairs, "p2", NO_FOCUS_KNOWN, NO_SONG_BEATS);

    expect(first.transition).toEqual(second.transition);
    expect([first.next?.number, second.next?.number]).toEqual([4, 4]);
  });

  it("names a single slide's share of the music, a pair weighing 1.5 of it", () => {
    // l0's own 6 s leave 24 s to l3, l6 and the two pairs: weight 5, 4.8 s a single slide.
    const timed: StoredSlideshow = {
      ...withPairs,
      pictures: withPairs.pictures.map((each) =>
        each.id === "l0" ? { ...each, durationMs: 6000 } : each,
      ),
    };

    expect(pictureEditorView(timed, "l0", NO_FOCUS_KNOWN, NO_SONG_BEATS).durationBasis).toEqual({
      kind: "music",
      automaticCount: 6,
      shareMs: 4800,
      clamped: false,
    });
  });

  it("clamps by a single slide's weighted share, not by the picture count", () => {
    // 11 s left over weight 5: 2.2 s a single slide, above the 2 s minimum.
    const timed: StoredSlideshow = {
      ...withPairs,
      pictures: withPairs.pictures.map((each) =>
        each.id === "l0" ? { ...each, durationMs: 19_000 } : each,
      ),
    };

    expect(
      pictureEditorView(timed, "l0", NO_FOCUS_KNOWN, NO_SONG_BEATS).durationBasis,
    ).toMatchObject({ clamped: false });
  });
});
