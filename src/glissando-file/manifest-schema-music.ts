import {
  EVEN_PICTURE_CHANGES,
  MAX_MUSIC_FADE_MS,
  MUSIC_FADE_OFF_MS,
  MUSIC_FADE_STEP_MS,
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
 * reader-only; see `manifest-schema.test.ts`'s reader-only table.
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

/** A song in `songs` (version 14): its path, type, whole length and optional trim and fades. */
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
  },
  required: ["file", "fileName", "durationMs", "mimeType"],
  additionalProperties: false,
};
