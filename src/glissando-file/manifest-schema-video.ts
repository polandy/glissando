import { MAX_VIDEO_VOLUME, VIDEO_VOLUME_STEP } from "../library/own-video";
import {
  NON_EMPTY_STRING_SCHEMA,
  POSITIVE_SAFE_INTEGER_SCHEMA,
  type JsonSchema,
} from "./manifest-schema-values";

/**
 * A picture's `video` (ADR-0034): the clip's path and type, its whole length (`sourceMs`) and the
 * excerpt played (`startMs`..`endMs`). The excerpt's bounds depend on both siblings
 * (`checkVideoExcerpt`) and stay reader-only; see `manifest-schema-reader-only.test.ts`.
 */
export const VIDEO_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    file: NON_EMPTY_STRING_SCHEMA,
    mimeType: NON_EMPTY_STRING_SCHEMA,
    sourceMs: POSITIVE_SAFE_INTEGER_SCHEMA,
    startMs: { type: "integer", minimum: 0 },
    endMs: { type: "integer" },
    volume: {
      type: "integer",
      minimum: 0,
      maximum: MAX_VIDEO_VOLUME,
      multipleOf: VIDEO_VOLUME_STEP,
    },
    duckMusic: { const: false },
  },
  required: ["file", "mimeType", "sourceMs", "startMs", "endMs"],
  additionalProperties: false,
};
