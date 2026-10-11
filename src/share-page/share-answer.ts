import type { MusicBeats } from "../beats";
import { parseMusicBeats } from "../beats/music-beats-json";
import type { SongBeats } from "../compose/playlist";
import { GLISSANDO_FORMAT_VERSION } from "../glissando-file/glissando-manifest";
import {
  DocumentFormatError,
  readObject,
  type JsonObject,
} from "../glissando-file/document-values";
import {
  musicKeys,
  pictureKeys,
  readMusicFields,
  readPictureFields,
  readPictures,
  readSlideshowFields,
  readSongs,
  slideshowKeys,
} from "../glissando-file/slideshow-fields";
import { pictureKey, songKey } from "../html-export/page-contract";
import type { StoredMusic, StoredPicture, StoredSlideshow } from "../library/stored-slideshow";

/**
 * `GET /api/share/{token}` read as the page plays it (dev-docs/SHARE_LINK.md, Public): the share
 * document as a stored slideshow whose pictures and songs are named by their position
 * (`pictureKey`, `songKey`), and the beats by song.
 */
export interface ShareAnswer {
  readonly revision: number;
  readonly slideshow: StoredSlideshow;
  readonly beats: SongBeats;
}

/** The share document never names a file; the stored slideshow needs a name, never shown. */
const NAME_KEY = "fileName";
const SHARED_SLIDESHOW_ID = "shared";

/** Untrusted JSON as the share API's answer; throws `DocumentFormatError` naming path and value. */
export function readShareAnswer(json: unknown): ShareAnswer {
  const root = readObject(json, "", ["revision", "slideshow", "beats"]);
  const revision = root["revision"];
  if (typeof revision !== "number" || !Number.isInteger(revision) || revision < 1) {
    throw new DocumentFormatError("revision", "a positive whole number", revision);
  }
  const path = "slideshow";
  const show = readObject(root["slideshow"], path, slideshowKeys(GLISSANDO_FORMAT_VERSION));
  const pictures = readPictures(show, path, readPicture);
  const songs = readSongs(show, path, readSong);
  return {
    revision,
    slideshow: {
      ...readSlideshowFields(show, path),
      id: SHARED_SLIDESHOW_ID,
      pictures,
      songs,
    },
    beats: readBeats(root["beats"], songs.length),
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
