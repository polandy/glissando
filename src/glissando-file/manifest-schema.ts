import { SEQUENCE_BETWEEN_SONGS } from "../library/own-music";
import { SLIDESHOW_TRANSITIONS } from "../library/own-timing";
import { OWN_SECONDS_PICTURE_LENGTH } from "../library/picture-length";
import { PORTRAIT_PICTURES_CHOICES } from "../library/portrait-pictures";
import { MAX_SECONDS_PER_PICTURE, MIN_SECONDS_PER_PICTURE } from "../library/stored-slideshow";
import { GRADED_SLIDESHOW_LOOKS } from "../player/looks/slideshow-look";
import { CARD_SCHEMA } from "./manifest-schema-card";
import { ADDED_CHAPTER_SCHEMA, CHAPTER_EDIT_SCHEMA } from "./manifest-schema-chapters";
import { GLISSANDO_FORMAT_ID, GLISSANDO_FORMAT_VERSION } from "./glissando-manifest";
import { MUSIC_SCHEMA } from "./manifest-schema-music";
import { PICTURE_SCHEMA } from "./manifest-schema-picture";
import {
  DATE_TIME_SCHEMA,
  NON_EMPTY_STRING_SCHEMA,
  type JsonSchema,
} from "./manifest-schema-values";

const SLIDESHOW_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    title: NON_EMPTY_STRING_SCHEMA,
    createdAt: DATE_TIME_SCHEMA,
    secondsPerPicture: {
      type: "number",
      minimum: MIN_SECONDS_PER_PICTURE,
      maximum: MAX_SECONDS_PER_PICTURE,
    },
    ownOrder: { const: true },
    pictures: { type: "array", minItems: 1, items: PICTURE_SCHEMA },
    songs: { type: "array", items: MUSIC_SCHEMA },
    betweenSongs: { const: SEQUENCE_BETWEEN_SONGS },
    transition: { enum: SLIDESHOW_TRANSITIONS },
    pictureLength: { const: OWN_SECONDS_PICTURE_LENGTH },
    portraitPictures: { enum: PORTRAIT_PICTURES_CHOICES },
    look: { enum: GRADED_SLIDESHOW_LOOKS },
    openingCard: CARD_SCHEMA,
    closingCard: CARD_SCHEMA,
    automaticChaptersOff: { const: true },
    chapterEdits: { type: "array", items: CHAPTER_EDIT_SCHEMA },
    addedChapters: { type: "array", items: ADDED_CHAPTER_SCHEMA },
  },
  required: ["title", "createdAt", "secondsPerPicture", "pictures", "songs"],
  additionalProperties: false,
};

/** Rules a JSON Schema cannot express, which only Glissando's reader checks. */
const READER_ONLY_RULES = [
  "no two songs share a file",
  "a card background's pictureIndex is below the number of pictures",
  "slides playing one clip file give it one mimeType",
  "createdAt and capturedAt are real calendar times",
  "a caption or card text is at most 80 user-perceived characters",
  "a song's trim lies within its durationMs",
  "a video excerpt lies within its sourceMs and lasts at least the shortest excerpt",
  "a chapter edit's or added chapter's picture index is below the number of pictures, naming each picture at most once",
  "a chapter's title or subtitle, when given, is non-empty and at most 80 user-perceived characters",
];

/**
 * JSON Schema (draft-07) of `glissando.json` at the current format version (ADR-0038), built
 * from the constants the reader checks against and kept in sync by `manifest-schema.test.ts`;
 * `manifest-schema-reader-only.test.ts` covers `READER_ONLY_RULES`.
 */
export const MANIFEST_SCHEMA: JsonSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Glissando manifest",
  description: `glissando.json inside a .glissando file, at format version ${GLISSANDO_FORMAT_VERSION}. Glissando also checks: ${READER_ONLY_RULES.join("; ")}.`,
  type: "object",
  properties: {
    format: { const: GLISSANDO_FORMAT_ID },
    formatVersion: { const: GLISSANDO_FORMAT_VERSION },
    slideshow: SLIDESHOW_SCHEMA,
  },
  required: ["format", "formatVersion", "slideshow"],
  additionalProperties: false,
};
