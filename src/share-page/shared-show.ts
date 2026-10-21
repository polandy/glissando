import { slideBoundaries } from "../app/player/slide-boundaries";
import {
  composeSlideshow,
  slideOfPicture,
  slideUnits,
  type SongBeats,
  type SongLoudness,
} from "../compose";
import type { PlayablePage } from "../export-player/page-player";
import type { PictureFocus } from "../library/picture-focus";
import type { StoredSlideshow } from "../library/stored-slideshow";
import type { Slideshow } from "../player/slideshow";
import { ShareMediumMissingError, type ShareApi } from "./share-api";
import type { ShareSummary } from "./share-page-words";

/** A shared slideshow as loaded at one revision, with its songs ready to play. */
export interface SharedShow {
  readonly revision: number;
  /** Its pictures and songs named by their position (`pictureKey`, `songKey`). */
  readonly stored: StoredSlideshow;
  readonly beats: SongBeats;
  readonly loudness: SongLoudness;
  /** Each song the slideshow plays, by its key, as a playable URL. */
  readonly songUrls: ReadonlyMap<string, string>;
}

/** The server no longer has this picture (Immich lost it); playing skips it. */
export class SharedPictureMissingError extends Error {
  override readonly name = "SharedPictureMissingError";
  constructor(
    readonly pictureKey: string,
    cause: unknown,
  ) {
    super(`the shared slideshow no longer has its picture ${pictureKey}`, { cause });
  }
}

/** No focus is shared: the automatic motions aim at the middle. */
const NO_FOCUS: ReadonlyMap<string, PictureFocus> = new Map();

/**
 * The slideshow as it is now. While the revision is still `known`'s, `known` is kept, songs and
 * all; otherwise each song it plays is fetched once and made a URL by `createUrl`.
 */
export async function loadSharedShow(
  api: ShareApi,
  createUrl: (song: Blob) => string,
  known: SharedShow | null,
): Promise<SharedShow> {
  const answer = await api.answer();
  if (known !== null && known.revision === answer.revision) return known;
  const byKey = composeSlideshow(
    answer.slideshow,
    // A server slideshow holds no video slides, so no clip is ever looked up.
    { picture: (key) => key, music: (key) => key, video: (key) => key },
    NO_FOCUS,
    answer.beats,
    answer.loudness,
  );
  const playedSongs = [...new Set(byKey.music?.map(({ src }) => src))];
  const songIndex = new Map(answer.slideshow.songs.map(({ id }, index) => [id, index]));
  const songUrls = await Promise.all(
    playedSongs.map(async (key) => {
      const index = songIndex.get(key);
      if (index === undefined) throw new Error(`the shared slideshow plays no song ${key}`);
      return [key, createUrl(await api.song(index))] as const;
    }),
  );
  return {
    revision: answer.revision,
    stored: answer.slideshow,
    beats: answer.beats,
    loudness: answer.loudness,
    songUrls: new Map(songUrls),
  };
}

/**
 * What the start card sums up for `show` played as `slideshow`: every stored picture, two on a
 * paired slide (ADR-0028), and the slides' durations.
 */
export function shareSummary(show: SharedShow, slideshow: Slideshow): ShareSummary {
  return {
    pictureCount: show.stored.pictures.length,
    durationMs: slideshow.slides.reduce((sum, { durationMs }) => sum + durationMs, 0),
    withMusic: slideshow.music !== undefined,
    withSampleMusic: show.stored.songs.some(
      (song) => song.sampleTrack !== undefined && show.songUrls.has(song.id),
    ),
  };
}

/** `show` to play without the pictures `skipped`; each picture is fetched by its position. */
export function playableShow(
  show: SharedShow,
  api: ShareApi,
  skipped: ReadonlySet<string>,
): PlayablePage {
  const pictureIndex = new Map(show.stored.pictures.map(({ id }, index) => [id, index]));
  return {
    slideshow: composed(show, skipped),
    async openPicture(key) {
      const index = pictureIndex.get(key);
      if (index === undefined) throw new Error(`the shared slideshow has no picture ${key}`);
      try {
        return await api.picture(show.revision, index);
      } catch (error: unknown) {
        if (error instanceof ShareMediumMissingError) {
          throw new SharedPictureMissingError(key, error);
        }
        throw error;
      }
    },
  };
}

/**
 * Skips the missing picture `key`: the pictures skipped from now on, and where playing goes on.
 * Null when no picture would be left.
 */
export function skipMissingPicture(
  show: SharedShow,
  skipped: ReadonlySet<string>,
  key: string,
): { readonly skipped: ReadonlySet<string>; readonly atSeconds: number } | null {
  const after = new Set([...skipped, key]);
  const remaining = show.stored.pictures.filter(({ id }) => !after.has(id));
  if (remaining.length === 0) return null;
  const boundaries = slideBoundaries(composed(show, after));
  // The picture right after the missing one, among those still playing: a pair can turn into a
  // single slide once its partner goes missing, so its slide index no longer matches its
  // picture index (ADR-0028) and is looked up through the new slide units instead.
  const keyIndex = show.stored.pictures.findIndex(({ id }) => id === key);
  const next = show.stored.pictures.slice(keyIndex + 1).find(({ id }) => !after.has(id));
  if (next === undefined) {
    return { skipped: after, atSeconds: boundaries.duration };
  }
  const units = slideUnits(remaining, show.stored.portraitPictures);
  const slideIndex = slideOfPicture(
    units,
    remaining.findIndex(({ id }) => id === next.id),
  );
  return { skipped: after, atSeconds: boundaries.starts[slideIndex] ?? boundaries.duration };
}

function composed(show: SharedShow, skipped: ReadonlySet<string>): Slideshow {
  const pictures = show.stored.pictures.filter(({ id }) => !skipped.has(id));
  return composeSlideshow(
    { ...show.stored, pictures },
    {
      picture: (key) => key,
      video: (key) => key,
      music: (key) => {
        const url = show.songUrls.get(key);
        if (url === undefined) throw new Error(`the shared slideshow's song ${key} was not loaded`);
        return url;
      },
    },
    NO_FOCUS,
    show.beats,
    show.loudness,
  );
}
