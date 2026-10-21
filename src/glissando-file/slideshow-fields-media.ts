import { CAPTION_RULE, isCaption } from "../player/caption";
import { checkOwnKenBurns, InvalidOwnKenBurnsError, motionPath } from "../library/own-ken-burns";
import { checkOwnDurationMs, checkTransitionChoice } from "../library/own-timing";
import { isHexColour, type PictureColours } from "../library/picture-colours";
import {
  checkMusicFadeMs,
  checkMusicTrim,
  checkMusicVolumeDb,
  checkPictureChanges,
  checkSampleTrack,
  InvalidOwnMusicError,
} from "../library/own-music";
import {
  CAPTION_FROM_VERSION,
  MUSIC_TRIM_FROM_VERSION,
  MUSIC_VOLUME_FROM_VERSION,
  OWN_KEN_BURNS_FROM_VERSION,
  OWN_TIMING_FROM_VERSION,
  PICTURE_CHANGES_FROM_VERSION,
  SAMPLE_TRACK_FROM_VERSION,
} from "./glissando-manifest";
import {
  DocumentFormatError,
  readDateTime,
  readObject,
  readPositiveInteger,
  readText,
  type JsonObject,
} from "./document-values";
import { readOwnTiming, type MusicFields, type PictureFields } from "./slideshow-fields";

/** A picture's and a track's own fields, split out of `slideshow-fields.ts` for its size. */

export function pictureKeys(version: number): string[] {
  return [
    "capturedAt",
    "width",
    "height",
    "fileName",
    "colours",
    ...(version >= OWN_KEN_BURNS_FROM_VERSION ? ["kenBurns"] : []),
    ...(version >= CAPTION_FROM_VERSION ? ["caption"] : []),
    ...(version >= OWN_TIMING_FROM_VERSION ? ["durationMs", "transition"] : []),
    "alone",
  ];
}

export function readPictureFields(picture: JsonObject, path: string): PictureFields {
  const { kenBurns, caption, durationMs, transition, alone } = picture;
  if (alone !== undefined && alone !== true) {
    throw new DocumentFormatError(`${path}.alone`, "true or absent", alone);
  }
  return {
    capturedAt: readDateTime(picture["capturedAt"], `${path}.capturedAt`),
    width: readPositiveInteger(picture["width"], `${path}.width`),
    height: readPositiveInteger(picture["height"], `${path}.height`),
    fileName: readText(picture["fileName"], `${path}.fileName`),
    colours: readPictureColours(picture["colours"], `${path}.colours`),
    ...(kenBurns === undefined ? {} : { kenBurns: readOwnKenBurns(kenBurns, path) }),
    ...(caption === undefined ? {} : { caption: readCaption(caption, `${path}.caption`) }),
    ...(durationMs === undefined
      ? {}
      : { durationMs: readOwnTiming(checkOwnDurationMs, durationMs, path) }),
    ...(transition === undefined
      ? {}
      : { transition: readOwnTiming(checkTransitionChoice, transition, path) }),
    ...(alone === true ? { alone: true } : {}),
  };
}

export function musicKeys(version: number): string[] {
  return [
    "fileName",
    "durationMs",
    "mimeType",
    ...(version >= MUSIC_TRIM_FROM_VERSION ? ["trim", "fadeInMs", "fadeOutMs"] : []),
    ...(version >= PICTURE_CHANGES_FROM_VERSION ? ["pictureChanges"] : []),
    ...(version >= MUSIC_VOLUME_FROM_VERSION ? ["volumeDb"] : []),
    ...(version >= SAMPLE_TRACK_FROM_VERSION ? ["sampleTrack"] : []),
  ];
}

export function readMusicFields(music: JsonObject, path: string): MusicFields {
  const durationMs = music["durationMs"];
  if (typeof durationMs !== "number" || !Number.isInteger(durationMs) || durationMs <= 0) {
    throw new DocumentFormatError(
      `${path}.durationMs`,
      "a positive whole number of milliseconds",
      durationMs,
    );
  }
  const { trim, fadeInMs, fadeOutMs, pictureChanges, volumeDb, sampleTrack } = music;
  return {
    fileName: readText(music["fileName"], `${path}.fileName`),
    durationMs,
    mimeType: readText(music["mimeType"], `${path}.mimeType`),
    ...readOwnMusic(path, () => ({
      ...(trim === undefined ? {} : { trim: checkMusicTrim(trim, durationMs, path) }),
      ...(fadeInMs === undefined ? {} : { fadeInMs: checkMusicFadeMs(fadeInMs, "fadeInMs", path) }),
      ...(fadeOutMs === undefined
        ? {}
        : { fadeOutMs: checkMusicFadeMs(fadeOutMs, "fadeOutMs", path) }),
      ...(pictureChanges === undefined
        ? {}
        : { pictureChanges: checkPictureChanges(pictureChanges, path) }),
      ...(volumeDb === undefined ? {} : { volumeDb: checkMusicVolumeDb(volumeDb, path) }),
      ...(sampleTrack === undefined ? {} : { sampleTrack: checkSampleTrack(sampleTrack, path) }),
    })),
  };
}

/** `value` as a picture's stored colours; throws `DocumentFormatError` naming the bad field. */
function readPictureColours(value: unknown, path: string): PictureColours {
  const colours = readObject(value, path, ["veil", "accent"]);
  const veil = colours["veil"];
  const accent = colours["accent"];
  if (!isHexColour(veil)) {
    throw new DocumentFormatError(`${path}.veil`, "a #RRGGBB colour", veil);
  }
  if (!isHexColour(accent)) {
    throw new DocumentFormatError(`${path}.accent`, "a #RRGGBB colour", accent);
  }
  return { veil, accent };
}

function readCaption(value: unknown, path: string): string {
  if (!isCaption(value)) {
    throw new DocumentFormatError(path, CAPTION_RULE, value);
  }
  return value;
}

function readOwnKenBurns(value: unknown, path: string) {
  try {
    return checkOwnKenBurns(value, path);
  } catch (error) {
    if (error instanceof InvalidOwnKenBurnsError) {
      throw new DocumentFormatError(
        motionPath(`${path}.kenBurns`, error.path),
        error.expected,
        error.actual,
      );
    }
    throw error;
  }
}

export function readOwnMusic<Fields>(path: string, read: () => Fields): Fields {
  try {
    return read();
  } catch (error) {
    if (error instanceof InvalidOwnMusicError) {
      throw new DocumentFormatError(`${path}.${error.field}`, error.expected, error.actual);
    }
    throw error;
  }
}
