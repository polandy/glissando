import type { MusicBeats } from "../beats";
import { parseMusicBeats } from "../beats/music-beats-json";
import type { SongBeats, SongLoudness } from "../compose";
import { GLISSANDO_FORMAT_VERSION } from "../glissando-file/glissando-manifest";
import {
  DocumentFormatError,
  readObject,
  type JsonObject,
} from "../glissando-file/document-values";
import { cardFromManifest } from "../glissando-file/manifest-card";
import {
  readPictures,
  readSlideshowFields,
  readSongs,
  slideshowKeys,
} from "../glissando-file/slideshow-fields";
import {
  musicKeys,
  pictureKeys,
  readMusicFields,
  readPictureFields,
} from "../glissando-file/slideshow-fields-media";
import { pictureKey, songKey } from "../html-export/page-contract";
import type { StoredMusic, StoredPicture, StoredSlideshow } from "../library/stored-slideshow";
import { parseMusicLoudness, type MusicLoudness } from "../loudness";

/**
 * `GET /api/share/{token}` read as the page plays it (dev-docs/share_link/HTTP_API.md, Public): the share
 * document as a stored slideshow whose pictures and songs are named by their position
 * (`pictureKey`, `songKey`), and the beats and loudness by song.
 */
export interface ShareAnswer {
  readonly revision: number;
  readonly slideshow: StoredSlideshow;
  readonly beats: SongBeats;
  readonly loudness: SongLoudness;
}

/** The share document never names a file; the stored slideshow needs a name, never shown. */
const NAME_KEY = "fileName";
const SHARED_SLIDESHOW_ID = "shared";

/** Untrusted JSON as the share API's answer; throws `DocumentFormatError` naming path and value. */
export function readShareAnswer(json: unknown): ShareAnswer {
  const root = readObject(json, "", ["revision", "slideshow", "beats", "loudness"]);
  const revision = root["revision"];
  if (typeof revision !== "number" || !Number.isInteger(revision) || revision < 1) {
    throw new DocumentFormatError("revision", "a positive whole number", revision);
  }
  const path = "slideshow";
  const show = readObject(root["slideshow"], path, slideshowKeys(GLISSANDO_FORMAT_VERSION));
  const pictures = readPictures(show, path, readPicture);
  const songs = readSongs(show, path, readSong);
  const { openingCard, closingCard, ...fields } = readSlideshowFields(show, path, pictures.length);
  const pictureIds = pictures.map((picture) => picture.id);
  const resolvedOpeningCard = cardFromManifest(openingCard, pictureIds);
  const resolvedClosingCard = cardFromManifest(closingCard, pictureIds);
  return {
    revision,
    slideshow: {
      ...fields,
      id: SHARED_SLIDESHOW_ID,
      pictures,
      songs,
      ...(resolvedOpeningCard === undefined ? {} : { openingCard: resolvedOpeningCard }),
      ...(resolvedClosingCard === undefined ? {} : { closingCard: resolvedClosingCard }),
    },
    beats: readBeats(root["beats"], songs.length),
    loudness: readLoudness(root["loudness"], songs.length),
  };
}

function readPicture(value: unknown, path: string, index: number): StoredPicture {
  const keys = pictureKeys(GLISSANDO_FORMAT_VERSION).filter((key) => key !== NAME_KEY);
  const id = pictureKey(index);
  return { ...readPictureFields(named(readObject(value, path, keys), id), path), id };
}

function readSong(value: unknown, path: string, index: number): StoredMusic {
  const keys = musicKeys(GLISSANDO_FORMAT_VERSION).filter((key) => key !== NAME_KEY);
  const id = songKey(index);
  return { ...readMusicFields(named(readObject(value, path, keys), id), path), id };
}

function named(fields: JsonObject, name: string): JsonObject {
  return { ...fields, [NAME_KEY]: name };
}

function readBeats(value: unknown, songCount: number): SongBeats {
  if (!Array.isArray(value) || value.length !== songCount) {
    throw new DocumentFormatError("beats", `${songCount} entries, one per song`, value);
  }
  const found = new Map<string, MusicBeats>();
  value.forEach((entry: unknown, index) => {
    if (entry === null) return;
    const beats = parseMusicBeats(entry);
    if (beats === undefined) {
      throw new DocumentFormatError(`beats[${index}]`, "a song's beats or null", entry);
    }
    found.set(songKey(index), beats);
  });
  return found;
}

function readLoudness(value: unknown, songCount: number): SongLoudness {
  if (!Array.isArray(value) || value.length !== songCount) {
    throw new DocumentFormatError("loudness", `${songCount} entries, one per song`, value);
  }
  const found = new Map<string, MusicLoudness>();
  value.forEach((entry: unknown, index) => {
    if (entry === null) return;
    try {
      found.set(songKey(index), parseMusicLoudness(entry));
    } catch {
      throw new DocumentFormatError(`loudness[${index}]`, "a song's loudness or null", entry);
    }
  });
  return found;
}
