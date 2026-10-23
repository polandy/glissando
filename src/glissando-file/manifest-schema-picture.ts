import { MAX_OWN_KEN_BURNS_ZOOM } from "../library/own-ken-burns";
import {
  MAX_OWN_DURATION_MS,
  MIN_OWN_DURATION_MS,
  OWN_DURATION_STEP_MS,
} from "../library/own-timing";
import { TRANSITION_CHOICES } from "../library/own-timing";
import { MIN_KEN_BURNS_ZOOM } from "../player/slideshow";
import {
  CAPTION_SCHEMA,
  DATE_TIME_SCHEMA,
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

/** The resolved place's own name and coordinates, from the bundled GeoNames list (ADR-0043). */
const PLACE_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    name: NON_EMPTY_STRING_SCHEMA,
    latitude: { type: "number", minimum: -90, maximum: 90 },
    longitude: { type: "number", minimum: -180, maximum: 180 },
  },
  required: ["name", "latitude", "longitude"],
  additionalProperties: false,
};

/** A manifest picture; `immichAssetId` and `fileBytes` may each appear, never both. */
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
    caption: CAPTION_SCHEMA,
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
    place: PLACE_SCHEMA,
  },
  required: ["file", "capturedAt", "width", "height", "fileName", "colours"],
  additionalProperties: false,
  not: { required: ["immichAssetId", "fileBytes"] },
};
