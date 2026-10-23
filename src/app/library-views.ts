import {
  pictureLayoutSummaries,
  playlistMs,
  resolveMusicTiming,
  slideUnits,
  slideshowDurationMs,
  slideshowLook,
  slideshowTransition,
} from "../compose";
import { MILLISECONDS_PER_SECOND } from "../player";
import { resolvePortraitPictures } from "../library/portrait-pictures";
import type { StoredMusic, StoredSlideshow } from "../library/stored-slideshow";
import type {
  MusicFades,
  MusicSummary,
  SlideshowDetails,
  SlideshowSummary,
} from "./screens/view-models";

/** A start card's cover shows the first pictures in play order, one large and two small. */
export const COVER_PICTURE_COUNT = 3;

/** Resolves a picture id to its thumbnail's object URL. */
export type ThumbnailUrl = (pictureId: string) => string;

function coverId(stored: StoredSlideshow): string {
  const cover = stored.pictures[0];
  if (cover === undefined) {
    throw new Error(`slideshow "${stored.id}" has no pictures; a slideshow needs at least one`);
  }
  return cover.id;
}

export function slideshowSummary(
  stored: StoredSlideshow,
  thumbnailUrl: ThumbnailUrl,
): SlideshowSummary {
  return {
    id: stored.id,
    title: stored.title,
    coverUrls: stored.pictures
      .slice(0, COVER_PICTURE_COUNT)
      .map((picture) => thumbnailUrl(picture.id)),
    pictureCount: stored.pictures.length,
    durationSeconds: slideshowDurationMs(stored) / MILLISECONDS_PER_SECOND,
    hasMusic: stored.songs.length > 0,
  };
}

/** Capture dates are ISO 8601 with the same `Z` suffix, so they sort as strings. */
function captureSpan(stored: StoredSlideshow): { from: string; to: string } {
  const dates = stored.pictures.map((picture) => picture.capturedAt).sort();
  return { from: dates[0] ?? "", to: dates.at(-1) ?? "" };
}

export function slideshowDetails(
  stored: StoredSlideshow,
  thumbnailUrl: ThumbnailUrl,
): SlideshowDetails {
  const span = captureSpan(stored);
  const firstSong = stored.songs[0];
  const onlySong = stored.songs.length === 1 ? firstSong : undefined;
  const musicMs = playlistMs(stored);
  const lastIndex = stored.pictures.length - 1;
  const layouts = pictureLayoutSummaries(stored.pictures, stored.portraitPictures);
  // One summary per picture (`pictureLayoutSummaries`'s contract); every index below is in range.
  const layoutAt = (index: number) => layouts[index] as (typeof layouts)[number];
  const tiles = stored.pictures.map((picture, index) => ({
    id: picture.id,
    thumbnailUrl: thumbnailUrl(picture.id),
    capturedAt: picture.capturedAt,
    ...(picture.video === undefined ? {} : { clipMs: picture.video.endMs - picture.video.startMs }),
    ...(picture.caption === undefined ? {} : { caption: picture.caption }),
    ownMotion: picture.kenBurns !== undefined,
    ownDurationMs: picture.durationMs ?? null,
    // The last picture plays no transition; one stored there waits for a picture to follow.
    ownTransition: index === lastIndex ? null : (picture.transition ?? null),
    pairedWithNumber: layoutAt(index).pairedWithNumber,
    blurredFill: layoutAt(index).blurredFill,
    alone: picture.alone === true,
    colours: picture.colours,
  }));
  return {
    title: stored.title,
    coverUrl: thumbnailUrl(coverId(stored)),
    durationSeconds: slideshowDurationMs(stored) / MILLISECONDS_PER_SECOND,
    songCount: stored.songs.length,
    musicTitle: firstSong?.fileName ?? null,
    musicSeconds: musicMs === undefined ? null : musicMs / MILLISECONDS_PER_SECOND,
    musicSummary:
      onlySong === undefined ? null : musicSummary(onlySong, slideshowDurationMs(stored)),
    ownOrder: stored.ownOrder === true,
    ownMotionCount: stored.pictures.filter((picture) => picture.kenBurns !== undefined).length,
    ownDurationCount: tiles.filter((tile) => tile.ownDurationMs !== null).length,
    ownTransitionCount: tiles.filter((tile) => tile.ownTransition !== null).length,
    transition: slideshowTransition(stored),
    look: slideshowLook(stored),
    portraitPictures: resolvePortraitPictures(stored.portraitPictures),
    pairCount: slideUnits(stored.pictures, stored.portraitPictures).filter(
      (unit) => unit.pictureIndices.length === 2,
    ).length,
    captionCount: stored.pictures.filter((picture) => picture.caption !== undefined).length,
    capturedFrom: span.from,
    capturedTo: span.to,
    pictures: tiles,
    ...(stored.openingCard === undefined ? {} : { openingCard: stored.openingCard }),
    ...(stored.closingCard === undefined ? {} : { closingCard: stored.closingCard }),
  };
}

function musicSummary(music: StoredMusic, slideshowMs: number): MusicSummary {
  const changed =
    music.trim !== undefined || music.fadeInMs !== undefined || music.fadeOutMs !== undefined;
  const { fadeInMs, fadeOutMs } = resolveMusicTiming(music, slideshowMs);
  return {
    excerpt:
      music.trim === undefined
        ? null
        : {
            fromSeconds: music.trim.startMs / MILLISECONDS_PER_SECOND,
            toSeconds: music.trim.endMs / MILLISECONDS_PER_SECOND,
          },
    fades: changed ? fadesPlayed(fadeInMs > 0, fadeOutMs > 0) : null,
  };
}

function fadesPlayed(fadesIn: boolean, fadesOut: boolean): MusicFades | null {
  if (fadesIn && fadesOut) {
    return "in-and-out";
  }
  if (fadesIn) {
    return "in";
  }
  return fadesOut ? "out" : null;
}

/** What the player names as playing: the only song, or a playlist by its count. */
export type PlayingMusic =
  | { readonly kind: "song"; readonly fileName: string }
  | { readonly kind: "songs"; readonly count: number };

export function playingMusic(stored: Pick<StoredSlideshow, "songs">): PlayingMusic | null {
  const [first] = stored.songs;
  if (first === undefined) {
    return null;
  }
  return stored.songs.length === 1
    ? { kind: "song", fileName: first.fileName }
    : { kind: "songs", count: stored.songs.length };
}
