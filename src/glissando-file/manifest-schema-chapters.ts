import { CAPTION_SCHEMA, type JsonSchema } from "./manifest-schema-values";

/**
 * A chapter edit or an added chapter (`dev-docs/player/TRIP_CHAPTERS.md`): the picture it anchors
 * to named by its index among this slideshow's pictures; `pictureIndex`'s upper bound and each
 * picture being named at most once are cross-document and stay reader-only. Unlike a card's text,
 * `title`/`subtitle` have no "empty means automatic" exception here, so they take `CAPTION_SCHEMA`
 * (non-empty), not `CARD_TEXT_SCHEMA`; its 80-grapheme limit stays reader-only, as for a caption.
 */
export const CHAPTER_EDIT_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    pictureIndex: { type: "integer", minimum: 0 },
    title: CAPTION_SCHEMA,
    subtitle: CAPTION_SCHEMA,
    hidden: { const: true },
  },
  required: ["pictureIndex"],
  additionalProperties: false,
};

export const ADDED_CHAPTER_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    beforePictureIndex: { type: "integer", minimum: 0 },
    title: CAPTION_SCHEMA,
    subtitle: CAPTION_SCHEMA,
  },
  required: ["beforePictureIndex"],
  additionalProperties: false,
};
