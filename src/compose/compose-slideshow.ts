import type { MusicBeats } from "../beats";
import type { PictureFocus } from "../library/picture-focus";
import type { StoredSlideshow } from "../library/stored-slideshow";
import { SLIDESHOW_FORMAT_VERSION, type Slide, type Slideshow } from "../player/slideshow";
import { beatTransitionDurationMs } from "./beat-transition";
import { excerptBeatsMs } from "./excerpt-beats";
import { musicExcerptMs, resolveMusicTiming } from "./music-excerpt";
import { pictureKenBurns } from "./picture-ken-burns";
import { pictureTransition, slideshowTransition } from "./picture-transition";
import { slideDurationsMs } from "./slide-durations-ms";

/** Resolves a stored picture or music id to the URL the player loads it from. */
export interface SlideshowSources {
  picture(id: string): string;
  music(id: string): string;
}

/**
 * Composes the playable slideshow JSON from a stored slideshow, applying the automatic choices
 * wherever the user made none of their own. An automatic motion aims at the picture's `focus`,
 * by picture id; a picture absent from it was not looked at yet. The pictures change on the
 * music's `beats` found so far, `NO_BEATS` until there is a result (ADR-0021).
 */
export function composeSlideshow(
  stored: StoredSlideshow,
  sources: SlideshowSources,
  focus: ReadonlyMap<string, PictureFocus>,
  beats: MusicBeats,
): Slideshow {
  const slideCount = stored.pictures.length;
  const defaultTransition = slideshowTransition(stored);
  const beatsMs = excerptBeatsMs(stored.music, beats);
  const durationsMs = slideDurationsMs(
    stored.pictures,
    musicExcerptMs(stored.music),
    stored.secondsPerPicture,
    beatsMs,
  );
  let slideEndMs = 0;

  const slides: Slide[] = stored.pictures.map((picture, index) => {
    // durationsMs has exactly one entry per picture; the index is always in range.
    const durationMs = durationsMs[index] as number;
    slideEndMs += durationMs;
    const slide: Slide = {
      image: { src: sources.picture(picture.id), capturedAt: picture.capturedAt },
      durationMs,
      kenBurns: pictureKenBurns(index, picture, focus.get(picture.id)),
      ...(picture.caption === undefined ? {} : { caption: picture.caption }),
    };
    const transitionToNext = pictureTransition(
      index,
      slideCount,
      picture,
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

  if (stored.music === undefined) {
    return { formatVersion: SLIDESHOW_FORMAT_VERSION, title: stored.title, slides };
  }
  const slideshowMs = durationsMs.reduce((sum, durationMs) => sum + durationMs, 0);
  return {
    formatVersion: SLIDESHOW_FORMAT_VERSION,
    title: stored.title,
    music: {
      src: sources.music(stored.music.id),
      ...resolveMusicTiming(stored.music, slideshowMs),
    },
    slides,
  };
}
