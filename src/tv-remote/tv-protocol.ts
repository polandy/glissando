import {
  DocumentFormatError,
  readObject,
  readText,
  type JsonObject,
} from "../glissando-file/document-values";

/**
 * What the TV page, the remote page, the app and the service agree on
 * (dev-docs/tv_remote/HTTP_API.md); its readers throw `DocumentFormatError`.
 */

/** The TV's playback as it last reported it (dev-docs/tv_remote/SESSIONS.md). */
export interface PlaybackState {
  readonly playing: boolean;
  readonly ended: boolean;
  /** The browser refused sound: the TV waits for one press on its own remote. */
  readonly needsTvOk: boolean;
  readonly positionSeconds: number;
  readonly durationSeconds: number;
  readonly pictureIndex: number;
  readonly pictureCount: number;
  /** 0 (silent) to 1. */
  readonly volume: number;
  readonly title: string;
}

export type Command =
  | {
      readonly type: "play" | "pause" | "next" | "previous" | "restart" | "disconnect";
    }
  | { readonly type: "seek" | "volume"; readonly value: number };

const PLAYBACK_STATE_KEYS = [
  "playing",
  "ended",
  "needsTvOk",
  "positionSeconds",
  "durationSeconds",
  "pictureIndex",
  "pictureCount",
  "volume",
  "title",
] as const;

const VALUELESS_COMMANDS = ["play", "pause", "next", "previous", "restart", "disconnect"] as const;
const VALUED_COMMANDS = ["seek", "volume"] as const;
const COMMAND_KEYS = ["type", "value"] as const;
const MAX_VOLUME = 1;

export function readPlaybackState(json: unknown): PlaybackState {
  const root = readObject(json, "", PLAYBACK_STATE_KEYS);
  return {
    playing: readBoolean(root, "playing"),
    ended: readBoolean(root, "ended"),
    needsTvOk: readBoolean(root, "needsTvOk"),
    positionSeconds: readNumber(root, "positionSeconds", Number.POSITIVE_INFINITY),
    durationSeconds: readNumber(root, "durationSeconds", Number.POSITIVE_INFINITY),
    pictureIndex: readWhole(root, "pictureIndex"),
    pictureCount: readWhole(root, "pictureCount"),
    volume: readNumber(root, "volume", MAX_VOLUME),
    title: readText(root["title"], "title"),
  };
}

export function readCommand(json: unknown): Command {
  const root = readObject(json, "", COMMAND_KEYS);
  const type = root["type"];
  if (isOneOf(VALUELESS_COMMANDS, type)) {
    if ("value" in root) {
      throw new DocumentFormatError("value", `no value on ${type}`, root["value"]);
    }
    return { type };
  }
  if (isOneOf(VALUED_COMMANDS, type)) {
    const max = type === "volume" ? MAX_VOLUME : Number.POSITIVE_INFINITY;
    return { type, value: readNumber(root, "value", max) };
  }
  throw new DocumentFormatError(
    "type",
    `one of ${[...VALUELESS_COMMANDS, ...VALUED_COMMANDS].join(", ")}`,
    type,
  );
}

function isOneOf<Option extends string>(
  options: readonly Option[],
  value: unknown,
): value is Option {
  return options.some((option) => option === value);
}

function readBoolean(object: JsonObject, key: string): boolean {
  const value = object[key];
  if (typeof value !== "boolean") throw new DocumentFormatError(key, "true or false", value);
  return value;
}

function readNumber(object: JsonObject, key: string, max: number): number {
  const value = object[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max) {
    throw new DocumentFormatError(key, `a number from 0 to ${max}`, value);
  }
  return value;
}

function readWhole(object: JsonObject, key: string): number {
  const value = readNumber(object, key, Number.MAX_SAFE_INTEGER);
  if (!Number.isInteger(value)) throw new DocumentFormatError(key, "a whole number", value);
  return value;
}
