import type { PictureFocus } from "../library/picture-focus";
import type { StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { SLIDESHOW_FORMAT_VERSION, type Slide, type Slideshow } from "../player/slideshow";
import { beatTransitionDurationMs } from "./beat-transition";
import { filledMusicMs, playlistBeatsMs, resolvePlaylist, type SongBeats } from "./playlist";
import { pairKenBurns, pictureKenBurns } from "./picture-ken-burns";
import { pictureTransition, slideshowTransition } from "./picture-transition";
import { slideDurationsMs } from "./slide-durations-ms";
import { slideUnits, timedUnit, type SlideUnit } from "./slide-units";

/** Resolves a stored picture or music id to the URL the player loads it from. */
export interface SlideshowSources {
  picture(id: string): string;
  music(id: string): string;
}

/** `Slide.fit`, written for every slide while the layout gives every picture the crop (ADR-0028). */
const COVER_FIT = "cover";

/**
 * Composes the playable slideshow JSON from a stored slideshow, applying the automatic choices
 * wherever the user made none of their own. Two consecutive portrait pictures become one slide,
 * unless `stored.portraitPictures` turns that off (`slideUnits`, ADR-0028). An automatic motion
 * aims at a picture's `focus`, by picture id; a picture absent from it was not looked at yet. The
 * pictures change on the songs' `beats` found so far, by music id; a song absent from it gives
 * none (ADR-0021, ADR-0023).
 */
export function composeSlideshow(
  stored: StoredSlideshow,
  sources: SlideshowSources,
  focus: ReadonlyMap<string, PictureFocus>,
  beats: SongBeats,
): Slideshow {
  const units = slideUnits(stored.pictures, stored.portraitPictures);
  const defaultTransition = slideshowTransition(stored);
  const beatsMs = playlistBeatsMs(stored, beats);
  const durationsMs = slideDurationsMs(
    units.map((unit) => timedUnit(stored.pictures, unit)),
    filledMusicMs(stored),
    stored.secondsPerPicture,
    beatsMs,
  );
  const fit = stored.portraitPictures === "fill-screen" ? COVER_FIT : undefined;
  let slideEndMs = 0;

  const slides: Slide[] = units.map((unit, index) => {
    // durationsMs has exactly one entry per slide unit; the index is always in range.
    const durationMs = durationsMs[index] as number;
    slideEndMs += durationMs;
    const slide = slideFor(index, stored.pictures, unit, sources, focus, durationMs, fit);
    const transitionToNext = pictureTransition(
      index,
      units.length,
      pictureOf(stored.pictures, unit.pictureIndices[0]),
      durationMs,
      defaultTransition,
    );
    if (transitionToNext === undefined) {
      return slide;
    }
    if (beatsMs === undefined) {
      return { ...slide, transitionToNext };
    }
    const onBeatMs = beatTransitionDurationMs(slideEndMs, transitionToNext.durationMs, beatsMs);
    return { ...slide, transitionToNext: { ...transitionToNext, durationMs: onBeatMs } };
  });

  const slideshowMs = durationsMs.reduce((sum, durationMs) => sum + durationMs, 0);
  const music = resolvePlaylist(stored, slideshowMs).map(({ song, ...timing }) => ({
    src: sources.music(song.id),
    ...timing,
  }));
  return music.length === 0
    ? { formatVersion: SLIDESHOW_FORMAT_VERSION, title: stored.title, slides }
    : { formatVersion: SLIDESHOW_FORMAT_VERSION, title: stored.title, music, slides };
}

function pictureOf(pictures: readonly StoredPicture[], index: number): StoredPicture {
  return pictures[index] as StoredPicture;
}

function slideFor(
  index: number,
  pictures: readonly StoredPicture[],
  unit: SlideUnit,
  sources: SlideshowSources,
  focus: ReadonlyMap<string, PictureFocus>,
  durationMs: number,
  fit: typeof COVER_FIT | undefined,
): Slide {
  const first = pictureOf(pictures, unit.pictureIndices[0]);
  const firstFocus = focus.get(first.id);
  const partnerIndex = unit.pictureIndices[1];
  if (partnerIndex === undefined) {
    return {
      image: { src: sources.picture(first.id), capturedAt: first.capturedAt },
      durationMs,
      kenBurns: pictureKenBurns(index, first, firstFocus),
      ...(first.caption === undefined ? {} : { caption: first.caption }),
      ...(fit === undefined ? {} : { fit }),
    };
  }
  const second = pictureOf(pictures, partnerIndex);
  const motion = pairKenBurns(index, first, firstFocus, second, focus.get(second.id));
  return {
    image: { src: sources.picture(first.id), capturedAt: first.capturedAt },
    durationMs,
    kenBurns: motion.first,
    partner: {
      image: { src: sources.picture(second.id), capturedAt: second.capturedAt },
      kenBurns: motion.second,
    },
    ...(fit === undefined ? {} : { fit }),
  };
}
