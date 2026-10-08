import { CAPTION_RULE, isCaption } from "../player/caption";
import { checkOwnKenBurns, InvalidOwnKenBurnsError, motionPath } from "../library/own-ken-burns";
import {
  checkOwnDurationMs,
  checkTransitionChoice,
  InvalidOwnTimingError,
} from "../library/own-timing";
import { MAX_SECONDS_PER_PICTURE, MIN_SECONDS_PER_PICTURE } from "../library/stored-slideshow";
import {
  CAPTION_FROM_VERSION,
  GLISSANDO_FORMAT_ID,
  GLISSANDO_FORMAT_VERSION,
  OLDEST_READABLE_FORMAT_VERSION,
  OWN_KEN_BURNS_FROM_VERSION,
  OWN_TIMING_FROM_VERSION,
  type GlissandoManifest,
  type ManifestMusic,
  type ManifestPicture,
  type ManifestReading,
} from "./glissando-manifest";

const ISO_8601_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

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
  const version = root["formatVersion"];
  if (
    typeof version !== "number" ||
    !Number.isInteger(version) ||
    version < OLDEST_READABLE_FORMAT_VERSION
  ) {
    throw new ManifestFormatError(
      "formatVersion",
      `a whole number from ${OLDEST_READABLE_FORMAT_VERSION} to ${GLISSANDO_FORMAT_VERSION}`,
      version,
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
    formatVersion: version,
    slideshow: {
      title: readText(show["title"], "slideshow.title"),
      createdAt: readDateTime(show["createdAt"], "slideshow.createdAt"),
      secondsPerPicture,
      ...(show["ownOrder"] === true ? { ownOrder: true } : {}),
      pictures: pictures.map((picture: unknown, index) =>
        readPicture(picture, `slideshow.pictures[${index}]`, version),
      ),
      ...(show["music"] === undefined ? {} : { music: readMusic(show["music"]) }),
    },
  };
}

const PICTURE_KEYS = ["file", "thumbnail", "capturedAt", "width", "height", "fileName"];

function readPicture(value: unknown, path: string, version: number): ManifestPicture {
  const picture = readObject(value, path, [
    ...PICTURE_KEYS,
    ...(version >= OWN_KEN_BURNS_FROM_VERSION ? ["kenBurns"] : []),
    ...(version >= CAPTION_FROM_VERSION ? ["caption"] : []),
    ...(version >= OWN_TIMING_FROM_VERSION ? ["durationMs", "transition"] : []),
  ]);
  const kenBurns = picture["kenBurns"];
  const caption = picture["caption"];
  const durationMs = picture["durationMs"];
  const transition = picture["transition"];
  return {
    file: readText(picture["file"], `${path}.file`),
    thumbnail: readText(picture["thumbnail"], `${path}.thumbnail`),
    capturedAt: readDateTime(picture["capturedAt"], `${path}.capturedAt`),
    width: readPositiveInteger(picture["width"], `${path}.width`),
    height: readPositiveInteger(picture["height"], `${path}.height`),
    fileName: readText(picture["fileName"], `${path}.fileName`),
    ...(kenBurns === undefined ? {} : { kenBurns: readOwnKenBurns(kenBurns, path) }),
    ...(caption === undefined ? {} : { caption: readCaption(caption, `${path}.caption`) }),
    ...(durationMs === undefined
      ? {}
      : { durationMs: readOwnTiming(checkOwnDurationMs, durationMs, path) }),
    ...(transition === undefined
      ? {}
      : { transition: readOwnTiming(checkTransitionChoice, transition, path) }),
  };
}

function readOwnTiming<Value>(
  check: (value: unknown, where: string) => Value,
  value: unknown,
  path: string,
): Value {
  try {
    return check(value, `glissando.json ${path}`);
  } catch (error) {
    if (error instanceof InvalidOwnTimingError) {
      throw new ManifestFormatError(`${path}.${error.field}`, error.expected, error.actual);
    }
    throw error;
  }
}

function readCaption(value: unknown, path: string): string {
  if (!isCaption(value)) {
    throw new ManifestFormatError(path, CAPTION_RULE, value);
  }
  return value;
}

function readOwnKenBurns(value: unknown, path: string) {
  try {
    return checkOwnKenBurns(value, `glissando.json ${path}`);
  } catch (error) {
    if (error instanceof InvalidOwnKenBurnsError) {
      throw new ManifestFormatError(
        motionPath(`${path}.kenBurns`, error.path),
        error.expected,
        error.actual,
      );
    }
    throw error;
  }
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
