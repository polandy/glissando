import type { StoredSlideshow } from "../library/stored-slideshow";
import { SLIDESHOW_FORMAT_VERSION, type Slide, type Slideshow } from "../player/slideshow";
import { autoTransition } from "./auto-transition";
import { pictureKenBurns } from "./picture-ken-burns";
import { slideDurationsMs } from "./slide-durations-ms";

/** Resolves a stored picture or music id to the URL the player loads it from. */
export interface SlideshowSources {
  picture(id: string): string;
  music(id: string): string;
}

/**
 * Composes the playable slideshow JSON from a stored slideshow, applying the automatic choices
 * wherever the user made none of their own.
 */
export function composeSlideshow(stored: StoredSlideshow, sources: SlideshowSources): Slideshow {
  const slideCount = stored.pictures.length;
  const durationsMs = slideDurationsMs(
    slideCount,
    stored.music?.durationMs,
    stored.secondsPerPicture,
  );

  const slides: Slide[] = stored.pictures.map((picture, index) => {
    // durationsMs has exactly one entry per picture; the index is always in range.
    const durationMs = durationsMs[index] as number;
    const slide: Slide = {
      image: { src: sources.picture(picture.id), capturedAt: picture.capturedAt },
      durationMs,
      kenBurns: pictureKenBurns(index, picture),
      ...(picture.caption === undefined ? {} : { caption: picture.caption }),
    };
    const transitionToNext = autoTransition(index, slideCount, durationMs);
    return transitionToNext === undefined ? slide : { ...slide, transitionToNext };
  });

  return stored.music === undefined
    ? { formatVersion: SLIDESHOW_FORMAT_VERSION, title: stored.title, slides }
    : {
        formatVersion: SLIDESHOW_FORMAT_VERSION,
        title: stored.title,
        music: { src: sources.music(stored.music.id) },
        slides,
      };
}
