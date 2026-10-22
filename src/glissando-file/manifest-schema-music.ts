import {
  EVEN_PICTURE_CHANGES,
  MAX_MUSIC_FADE_MS,
  MAX_SAMPLE_TRACK_ID_LENGTH,
  MUSIC_FADE_OFF_MS,
  MUSIC_FADE_STEP_MS,
  MUSIC_VOLUME_MAX_DB,
  MUSIC_VOLUME_MIN_DB,
} from "../library/own-music";
import { NON_EMPTY_STRING_SCHEMA, type JsonSchema } from "./manifest-schema-values";

const MUSIC_FADE_SCHEMA: JsonSchema = {
  type: "integer",
  minimum: MUSIC_FADE_OFF_MS,
  maximum: MAX_MUSIC_FADE_MS,
  multipleOf: MUSIC_FADE_STEP_MS,
};

/**
 * `trim`'s `endMs <= durationMs` and `endMs - startMs >= 5000` depend on a sibling field and stay
 * reader-only; see `manifest-schema-reader-only.test.ts`.
 */
const MUSIC_TRIM_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    startMs: { type: "integer", minimum: 0 },
    endMs: { type: "integer" },
  },
  required: ["startMs", "endMs"],
  additionalProperties: false,
};

const MUSIC_VOLUME_SCHEMA: JsonSchema = {
  type: "integer",
  minimum: MUSIC_VOLUME_MIN_DB,
  maximum: MUSIC_VOLUME_MAX_DB,
};

const SAMPLE_TRACK_SCHEMA: JsonSchema = {
  type: "string",
  pattern: `^[a-z0-9-]{1,${MAX_SAMPLE_TRACK_ID_LENGTH}}$`,
};

/**
 * A song in `songs`: its path, type, whole length and optional trim, fades, volume and
 * sample-track id.
 */
export const MUSIC_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    file: NON_EMPTY_STRING_SCHEMA,
    fileName: NON_EMPTY_STRING_SCHEMA,
    mimeType: NON_EMPTY_STRING_SCHEMA,
    durationMs: { type: "integer", minimum: 1 },
    trim: MUSIC_TRIM_SCHEMA,
    fadeInMs: MUSIC_FADE_SCHEMA,
    fadeOutMs: MUSIC_FADE_SCHEMA,
    pictureChanges: { const: EVEN_PICTURE_CHANGES },
    volumeDb: MUSIC_VOLUME_SCHEMA,
    sampleTrack: SAMPLE_TRACK_SCHEMA,
  },
  required: ["file", "fileName", "durationMs", "mimeType"],
  additionalProperties: false,
};
