import { MAX_OWN_KEN_BURNS_ZOOM } from "../library/own-ken-burns";
import {
  MAX_OWN_DURATION_MS,
  MIN_OWN_DURATION_MS,
  OWN_DURATION_STEP_MS,
} from "../library/own-timing";
import { TRANSITION_CHOICES } from "../library/own-timing";
import { MIN_KEN_BURNS_ZOOM } from "../player/slideshow";
import {
  DATE_TIME_SCHEMA,
  FREE_TEXT_SCHEMA,
  HEX_COLOUR_SCHEMA,
  NON_EMPTY_STRING_SCHEMA,
  POSITIVE_SAFE_INTEGER_SCHEMA,
  type JsonSchema,
} from "./manifest-schema-values";
import { VIDEO_SCHEMA } from "./manifest-schema-video";

const FRAMING_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    zoom: { type: "number", minimum: MIN_KEN_BURNS_ZOOM, maximum: MAX_OWN_KEN_BURNS_ZOOM },
    centerX: { type: "number", minimum: 0, maximum: 1 },
    centerY: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["zoom", "centerX", "centerY"],
  additionalProperties: false,
};

const KEN_BURNS_SCHEMA: JsonSchema = {
  type: "object",
  properties: { from: FRAMING_SCHEMA, to: FRAMING_SCHEMA },
  required: ["from", "to"],
  additionalProperties: false,
};

const COLOURS_SCHEMA: JsonSchema = {
  type: "object",
  properties: { veil: HEX_COLOUR_SCHEMA, accent: HEX_COLOUR_SCHEMA },
  required: ["veil", "accent"],
  additionalProperties: false,
};

/**
 * A manifest picture (version 14). `caption`'s grapheme-counted normalisation and the
 * `immichAssetId`/`fileBytes` exclusivity (`not`, below) being the ONLY way either may appear —
 * both halves missing is also refused by the reader — are documented in full, with the rest of
 * the reader-only rules, in `manifest-schema.test.ts`'s reader-only table.
 */
export const PICTURE_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    file: NON_EMPTY_STRING_SCHEMA,
    thumbnail: NON_EMPTY_STRING_SCHEMA,
    capturedAt: DATE_TIME_SCHEMA,
    width: POSITIVE_SAFE_INTEGER_SCHEMA,
    height: POSITIVE_SAFE_INTEGER_SCHEMA,
    fileName: NON_EMPTY_STRING_SCHEMA,
    colours: COLOURS_SCHEMA,
    kenBurns: KEN_BURNS_SCHEMA,
    caption: FREE_TEXT_SCHEMA,
    durationMs: {
      type: "integer",
      minimum: MIN_OWN_DURATION_MS,
      maximum: MAX_OWN_DURATION_MS,
      multipleOf: OWN_DURATION_STEP_MS,
    },
    transition: { enum: TRANSITION_CHOICES },
    immichAssetId: NON_EMPTY_STRING_SCHEMA,
    fileBytes: POSITIVE_SAFE_INTEGER_SCHEMA,
    alone: { const: true },
    video: VIDEO_SCHEMA,
  },
  required: ["file", "capturedAt", "width", "height", "fileName", "colours"],
  additionalProperties: false,
  not: { required: ["immichAssetId", "fileBytes"] },
};
