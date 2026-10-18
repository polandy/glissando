import { CARD_FADE_STEP, CARD_TINTS, MAX_CARD_FADE, MIN_CARD_FADE } from "../library/stored-card";
import { CARD_SWATCHES } from "../player/card-palette";
import { CARD_ENTRANCES, CARD_POSITIONS, CARD_STYLES } from "../player/slideshow";
import { CARD_TEXT_SCHEMA, HEX_COLOUR_SCHEMA, type JsonSchema } from "./manifest-schema-values";

const CARD_COLOUR_SCHEMA: JsonSchema = {
  anyOf: [{ type: "string", enum: Object.keys(CARD_SWATCHES) }, HEX_COLOUR_SCHEMA],
};

/**
 * A card's `background` (ADR-0032): either a flat colour, or a picture named by its index among
 * this slideshow's pictures, veiled and tinted. `readCardBackground` reads all five keys
 * regardless of `kind` and only uses the ones `kind` needs, so every key stays allowed here too;
 * `if`/`then` requires the right subset instead of a stricter per-branch `additionalProperties`.
 * `pictureIndex`'s upper bound (under the picture count) is cross-document and stays reader-only.
 */
const CARD_BACKGROUND_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    kind: { enum: ["colour", "picture"] },
    colour: CARD_COLOUR_SCHEMA,
    pictureIndex: { type: "integer", minimum: 0 },
    fade: {
      type: "integer",
      minimum: MIN_CARD_FADE,
      maximum: MAX_CARD_FADE,
      multipleOf: CARD_FADE_STEP,
    },
    tint: { enum: CARD_TINTS },
  },
  required: ["kind"],
  additionalProperties: false,
  allOf: [
    { if: { properties: { kind: { const: "colour" } } }, then: { required: ["colour"] } },
    {
      if: { properties: { kind: { const: "picture" } } },
      then: { required: ["pictureIndex", "fade", "tint"] },
    },
  ],
};

/**
 * A title or closing card (version 12+, ADR-0032). `title`/`subtitle` allow the empty string here
 * — `checkCardText`'s grapheme-counted length and whitespace rule for non-empty text is
 * reader-only; see `manifest-schema-reader-only.test.ts`.
 */
export const CARD_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    title: CARD_TEXT_SCHEMA,
    subtitle: CARD_TEXT_SCHEMA,
    style: { enum: CARD_STYLES },
    position: { enum: CARD_POSITIONS },
    entrance: { enum: CARD_ENTRANCES },
    background: CARD_BACKGROUND_SCHEMA,
    motion: { type: "boolean" },
  },
  required: ["title", "style", "position", "entrance", "background", "motion"],
  additionalProperties: false,
};
