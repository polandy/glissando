import {
  checkVideoExcerpt,
  checkVideoVolume,
  InvalidVideoError,
  type StoredVideo,
} from "../library/own-video";
import type { StoredPicture } from "../library/stored-slideshow";
import {
  DocumentFormatError,
  readObject,
  readPositiveInteger,
  readText,
  type JsonObject,
} from "./document-values";

/** The first version that carries a picture's `video` and the `videos/` entries (ADR-0034). */
export const VIDEO_FROM_VERSION = 14;

const VIDEO_KEYS = ["file", "mimeType", "sourceMs", "startMs", "endMs", "volume", "duckMusic"];
const CLIP_EXTENSION = /\/([a-z0-9]{1,8})$/i;
const UNKNOWN_CLIP_TYPE = "application/octet-stream";
/** The extension `video/quicktime` is known by. */
const QUICKTIME_EXTENSION = "mov";

/** A video slide's clip: `StoredVideo` with the clip's path in the container for its device id. */
export interface ManifestVideo extends Omit<StoredVideo, "mediaId"> {
  readonly file: string;
  readonly mimeType: string;
}

/** Where clip `index` (from 0, by first use) sits in the container, named by its MIME type. */
export function clipPath(index: number, mimeType: string): string {
  const base = `videos/clip-${index + 1}`;
  const subtype = CLIP_EXTENSION.exec(mimeType)?.[1]?.toLowerCase();
  if (subtype === undefined) {
    return base;
  }
  return `${base}.${subtype === "quicktime" ? QUICKTIME_EXTENSION : subtype}`;
}

export function clipMimeType(type: string): string {
  return type === "" ? UNKNOWN_CLIP_TYPE : type;
}

/** The distinct clips the pictures play, by first use. */
export function distinctClipIds(pictures: readonly Pick<StoredPicture, "video">[]): string[] {
  return [
    ...new Set(pictures.flatMap(({ video }) => (video === undefined ? [] : [video.mediaId]))),
  ];
}

/** `video` as stored, its clip at `file`. */
export function videoToManifest(video: StoredVideo, file: string, mimeType: string): ManifestVideo {
  return {
    file,
    mimeType,
    sourceMs: video.sourceMs,
    startMs: video.startMs,
    endMs: video.endMs,
    ...(video.volume === undefined ? {} : { volume: video.volume }),
    ...(video.duckMusic === undefined ? {} : { duckMusic: video.duckMusic }),
  };
}

/** The video a slide stores, its clip saved under the id `clipIds` holds for its file. */
export function storedVideo(
  video: ManifestVideo,
  clipIds: ReadonlyMap<string, string>,
): StoredVideo {
  const mediaId = clipIds.get(video.file);
  if (mediaId === undefined) {
    throw new Error(`the clip ${video.file} was never stored`);
  }
  return {
    mediaId,
    sourceMs: video.sourceMs,
    startMs: video.startMs,
    endMs: video.endMs,
    ...(video.volume === undefined ? {} : { volume: video.volume }),
    ...(video.duckMusic === undefined ? {} : { duckMusic: video.duckMusic }),
  };
}

/** Reads and checks a picture's `video`; throws `DocumentFormatError` naming the bad field. */
export function readManifestVideo(value: unknown, path: string): ManifestVideo {
  const video: JsonObject = readObject(value, path, VIDEO_KEYS);
  const sourceMs = readPositiveInteger(video["sourceMs"], `${path}.sourceMs`);
  const startMs = video["startMs"];
  const endMs = video["endMs"];
  const { volume, duckMusic } = video;
  if (duckMusic !== undefined && duckMusic !== false) {
    throw new DocumentFormatError(`${path}.duckMusic`, "false or absent", duckMusic);
  }
  try {
    return {
      file: readText(video["file"], `${path}.file`),
      mimeType: readText(video["mimeType"], `${path}.mimeType`),
      sourceMs,
      ...checkVideoExcerpt({ sourceMs, startMs: startMs as number, endMs: endMs as number }, path),
      ...(volume === undefined ? {} : { volume: checkVideoVolume(volume, path) }),
      ...(duckMusic === false ? { duckMusic: false as const } : {}),
    };
  } catch (error) {
    if (error instanceof InvalidVideoError) {
      throw new DocumentFormatError(`${path}.${error.field}`, error.expected, error.actual);
    }
    throw error;
  }
}

/** Refuses two slides that name one clip file but not one type, naming the second slide. */
export function refuseClipsOfTwoTypes(
  pictures: readonly { readonly video?: ManifestVideo }[],
  path: string,
): void {
  const types = new Map<string, string>();
  for (const [index, { video }] of pictures.entries()) {
    if (video === undefined) {
      continue;
    }
    const seen = types.get(video.file);
    if (seen !== undefined && seen !== video.mimeType) {
      throw new DocumentFormatError(
        `${path}.pictures[${index}].video.mimeType`,
        `the type "${seen}" of the clip file ${video.file} that another slide names`,
        video.mimeType,
      );
    }
    types.set(video.file, video.mimeType);
  }
}
