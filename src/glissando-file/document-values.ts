/** An ISO 8601 date-time's shape; `readDateTime` also checks `Date.parse` accepts the value. */
export const ISO_8601_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

/** The type of a file whose own type is unknown or not one the format allows. */
const UNKNOWN_MEDIA_TYPE = "application/octet-stream";

/** An RFC 6838 restricted-name, lowercase only: what follows the `/` of a type, no parameters. */
const MEDIA_SUBTYPE = "[a-z0-9][a-z0-9!#$&^_.+-]{0,126}";

/** A song's type: `audio/` or `video/` (Chromium types an Opus .webm `video/webm`), or unknown. */
export const SONG_MEDIA_TYPE = new RegExp(
  `^((audio|video)/${MEDIA_SUBTYPE}|${UNKNOWN_MEDIA_TYPE})$`,
);

/** A clip's type: `video/`, or unknown. */
export const CLIP_MEDIA_TYPE = new RegExp(`^(video/${MEDIA_SUBTYPE}|${UNKNOWN_MEDIA_TYPE})$`);

/** `type` when the format allows it for a song, otherwise the unknown type. */
export function songMediaType(type: string): string {
  return SONG_MEDIA_TYPE.test(type) ? type : UNKNOWN_MEDIA_TYPE;
}

/** `type` when the format allows it for a clip, otherwise the unknown type. */
export function clipMediaType(type: string): string {
  return CLIP_MEDIA_TYPE.test(type) ? type : UNKNOWN_MEDIA_TYPE;
}

/**
 * A value in a JSON document (a .glissando manifest, a server slideshow) unlike what its path
 * expects; every reader below throws it. The message names the path and the value.
 */
export class DocumentFormatError extends Error {
  constructor(path: string, expected: string, actual: unknown) {
    super(`${path}: expected ${expected}, got ${JSON.stringify(actual)}`);
    this.name = "DocumentFormatError";
  }
}

export type JsonObject = Readonly<Record<string, unknown>>;

export function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Unknown keys are rejected, never ignored. */
export function readObject(value: unknown, path: string, keys: readonly string[]): JsonObject {
  if (!isObject(value)) {
    throw new DocumentFormatError(path || "root", "an object", value);
  }
  const unknown = Object.keys(value).find((key) => !keys.includes(key));
  if (unknown !== undefined) {
    throw new DocumentFormatError(
      `${path}.${unknown}`.replace(/^\./, ""),
      `one of ${keys.join(", ")}`,
      unknown,
    );
  }
  return value;
}

export function readText(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new DocumentFormatError(path, "a non-empty string", value);
  }
  return value;
}

export function readSongMediaType(value: unknown, path: string): string {
  if (typeof value !== "string" || !SONG_MEDIA_TYPE.test(value)) {
    throw new DocumentFormatError(
      path,
      `an audio/ or video/ MIME type, or ${UNKNOWN_MEDIA_TYPE}`,
      value,
    );
  }
  return value;
}

export function readClipMediaType(value: unknown, path: string): string {
  if (typeof value !== "string" || !CLIP_MEDIA_TYPE.test(value)) {
    throw new DocumentFormatError(path, `a video/ MIME type, or ${UNKNOWN_MEDIA_TYPE}`, value);
  }
  return value;
}

export function readDateTime(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    !ISO_8601_DATE_TIME.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new DocumentFormatError(path, "an ISO 8601 date-time", value);
  }
  return value;
}

export function readPositiveInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new DocumentFormatError(path, "a positive whole number", value);
  }
  return value;
}
