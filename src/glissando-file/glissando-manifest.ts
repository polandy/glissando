import {
  MAX_SECONDS_PER_PICTURE,
  MIN_SECONDS_PER_PICTURE,
  type StoredSlideshow,
} from "../library/stored-slideshow";

/**
 * `glissando.json`, the first entry of a .glissando file: the format's id and version and the
 * slideshow as stored, with media named by their path in the container instead of a device id.
 */

export const GLISSANDO_FORMAT_ID = "glissando";
export const GLISSANDO_FORMAT_VERSION = 1;
export const MANIFEST_ENTRY_NAME = "glissando.json";

const PICTURE_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const PICTURE_NUMBER_DIGITS = 4;
const MUSIC_EXTENSION = /\.([a-z0-9]{1,8})$/i;
const ISO_8601_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export interface ManifestPicture {
  readonly file: string;
  readonly thumbnail: string;
  readonly capturedAt: string;
  readonly width: number;
  readonly height: number;
  readonly fileName: string;
}

export interface ManifestMusic {
  readonly file: string;
  readonly fileName: string;
  readonly durationMs: number;
  readonly mimeType: string;
}

export interface ManifestSlideshow {
  readonly title: string;
  readonly createdAt: string;
  readonly secondsPerPicture: number;
  readonly ownOrder?: true;
  readonly pictures: readonly ManifestPicture[];
  readonly music?: ManifestMusic;
}

export interface GlissandoManifest {
  readonly format: typeof GLISSANDO_FORMAT_ID;
  readonly formatVersion: typeof GLISSANDO_FORMAT_VERSION;
  readonly slideshow: ManifestSlideshow;
}

export type ManifestReading =
  | { readonly kind: "ok"; readonly manifest: GlissandoManifest }
  | { readonly kind: "foreign" }
  | { readonly kind: "newer" }
  | { readonly kind: "damaged"; readonly reason: string };

/** Where picture `index` (from 0) and its thumbnail sit in the container. */
export function picturePaths(
  index: number,
  types: PictureTypes,
): { readonly file: string; readonly thumbnail: string } {
  const number = String(index + 1).padStart(PICTURE_NUMBER_DIGITS, "0");
  return {
    file: `pictures/${number}.${pictureExtension(types.display)}`,
    thumbnail: `thumbnails/${number}.${pictureExtension(types.thumbnail)}`,
  };
}

/** The music keeps its file's extension, so an unzipped file opens in any player. */
export function musicPath(fileName: string): string {
  const extension = MUSIC_EXTENSION.exec(fileName)?.[1];
  return extension === undefined ? "music/track" : `music/track.${extension.toLowerCase()}`;
}

/** A picture's MIME type from its path's extension; null for one the format does not use. */
export function typeOfPicturePath(path: string): string | null {
  const extension = path.slice(path.lastIndexOf(".") + 1);
  const found = Object.entries(PICTURE_EXTENSIONS).find(([, known]) => known === extension);
  return found?.[0] ?? null;
}

/** A picture's two renditions' MIME types. */
export interface PictureTypes {
  readonly display: string;
  readonly thumbnail: string;
}

/** The manifest of `slideshow`; `pictureTypes` holds each picture's types, in play order. */
export function manifestFor(
  slideshow: StoredSlideshow,
  pictureTypes: readonly PictureTypes[],
): GlissandoManifest {
  const pictures = slideshow.pictures.map((picture, index) => ({
    ...picturePaths(index, typesAt(pictureTypes, index)),
    capturedAt: picture.capturedAt,
    width: picture.width,
    height: picture.height,
    fileName: picture.fileName,
  }));
  const { music } = slideshow;
  return {
    format: GLISSANDO_FORMAT_ID,
    formatVersion: GLISSANDO_FORMAT_VERSION,
    slideshow: {
      title: slideshow.title,
      createdAt: slideshow.createdAt,
      secondsPerPicture: slideshow.secondsPerPicture,
      ...(slideshow.ownOrder ? { ownOrder: true } : {}),
      pictures,
      ...(music === undefined
        ? {}
        : {
            music: {
              file: musicPath(music.fileName),
              fileName: music.fileName,
              durationMs: music.durationMs,
              mimeType: music.mimeType,
            },
          }),
    },
  };
}

/** Untrusted manifest text: foreign, from a newer version, damaged or a valid manifest. */
export function readManifest(text: string): ManifestReading {
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { kind: "damaged", reason: `glissando.json is no JSON: ${error.message}` };
    }
    throw error;
  }
  if (!isObject(input) || input["format"] !== GLISSANDO_FORMAT_ID) {
    return { kind: "foreign" };
  }
  const version = input["formatVersion"];
  if (
    typeof version === "number" &&
    Number.isInteger(version) &&
    version > GLISSANDO_FORMAT_VERSION
  ) {
    return { kind: "newer" };
  }
  try {
    return { kind: "ok", manifest: readValidManifest(input) };
  } catch (error) {
    if (error instanceof ManifestFormatError) {
      return { kind: "damaged", reason: error.message };
    }
    throw error;
  }
}

class ManifestFormatError extends Error {
  constructor(path: string, expected: string, actual: unknown) {
    super(`glissando.json ${path}: expected ${expected}, got ${JSON.stringify(actual)}`);
    this.name = "ManifestFormatError";
  }
}

type JsonObject = Readonly<Record<string, unknown>>;

function readValidManifest(input: JsonObject): GlissandoManifest {
  const root = readObject(input, "", ["format", "formatVersion", "slideshow"]);
  if (root["formatVersion"] !== GLISSANDO_FORMAT_VERSION) {
    throw new ManifestFormatError(
      "formatVersion",
      String(GLISSANDO_FORMAT_VERSION),
      root["formatVersion"],
    );
  }
  const show = readObject(root["slideshow"], "slideshow", [
    "title",
    "createdAt",
    "secondsPerPicture",
    "ownOrder",
    "pictures",
    "music",
  ]);
  const secondsPerPicture = show["secondsPerPicture"];
  if (
    typeof secondsPerPicture !== "number" ||
    secondsPerPicture < MIN_SECONDS_PER_PICTURE ||
    secondsPerPicture > MAX_SECONDS_PER_PICTURE
  ) {
    throw new ManifestFormatError(
      "slideshow.secondsPerPicture",
      `a number from ${MIN_SECONDS_PER_PICTURE} to ${MAX_SECONDS_PER_PICTURE}`,
      secondsPerPicture,
    );
  }
  if (show["ownOrder"] !== undefined && show["ownOrder"] !== true) {
    throw new ManifestFormatError("slideshow.ownOrder", "true or absent", show["ownOrder"]);
  }
  const pictures = show["pictures"];
  if (!Array.isArray(pictures) || pictures.length === 0) {
    throw new ManifestFormatError("slideshow.pictures", "at least one picture", pictures);
  }
  return {
    format: GLISSANDO_FORMAT_ID,
    formatVersion: GLISSANDO_FORMAT_VERSION,
    slideshow: {
      title: readText(show["title"], "slideshow.title"),
      createdAt: readDateTime(show["createdAt"], "slideshow.createdAt"),
      secondsPerPicture,
      ...(show["ownOrder"] === true ? { ownOrder: true } : {}),
      pictures: pictures.map((picture: unknown, index) =>
        readPicture(picture, `slideshow.pictures[${index}]`),
      ),
      ...(show["music"] === undefined ? {} : { music: readMusic(show["music"]) }),
    },
  };
}

function readPicture(value: unknown, path: string): ManifestPicture {
  const picture = readObject(value, path, [
    "file",
    "thumbnail",
    "capturedAt",
    "width",
    "height",
    "fileName",
  ]);
  return {
    file: readText(picture["file"], `${path}.file`),
    thumbnail: readText(picture["thumbnail"], `${path}.thumbnail`),
    capturedAt: readDateTime(picture["capturedAt"], `${path}.capturedAt`),
    width: readPositiveInteger(picture["width"], `${path}.width`),
    height: readPositiveInteger(picture["height"], `${path}.height`),
    fileName: readText(picture["fileName"], `${path}.fileName`),
  };
}

function readMusic(value: unknown): ManifestMusic {
  const path = "slideshow.music";
  const music = readObject(value, path, ["file", "fileName", "durationMs", "mimeType"]);
  const durationMs = music["durationMs"];
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs <= 0) {
    throw new ManifestFormatError(`${path}.durationMs`, "a positive number", durationMs);
  }
  return {
    file: readText(music["file"], `${path}.file`),
    fileName: readText(music["fileName"], `${path}.fileName`),
    durationMs,
    mimeType: readText(music["mimeType"], `${path}.mimeType`),
  };
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Unknown keys are rejected, never ignored. */
function readObject(value: unknown, path: string, keys: readonly string[]): JsonObject {
  if (!isObject(value)) {
    throw new ManifestFormatError(path || "root", "an object", value);
  }
  const unknown = Object.keys(value).find((key) => !keys.includes(key));
  if (unknown !== undefined) {
    throw new ManifestFormatError(
      `${path}.${unknown}`.replace(/^\./, ""),
      `one of ${keys.join(", ")}`,
      unknown,
    );
  }
  return value;
}

function readText(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ManifestFormatError(path, "a non-empty string", value);
  }
  return value;
}

function readDateTime(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    !ISO_8601_DATE_TIME.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new ManifestFormatError(path, "an ISO 8601 date-time", value);
  }
  return value;
}

function readPositiveInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new ManifestFormatError(path, "a positive whole number", value);
  }
  return value;
}

function typesAt(pictureTypes: readonly PictureTypes[], index: number): PictureTypes {
  const types = pictureTypes[index];
  if (types === undefined) {
    throw new Error(`picture ${index} has no types: pass one entry per picture`);
  }
  return types;
}

function pictureExtension(type: string): string {
  const extension = PICTURE_EXTENSIONS[type];
  if (extension === undefined) {
    throw new Error(
      `a picture of type "${type}" cannot go into a .glissando file: expected one of ${Object.keys(PICTURE_EXTENSIONS).join(", ")}`,
    );
  }
  return extension;
}
