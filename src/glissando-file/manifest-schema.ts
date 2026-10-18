import { SEQUENCE_BETWEEN_SONGS } from "../library/own-music";
import { SLIDESHOW_TRANSITIONS } from "../library/own-timing";
import { OWN_SECONDS_PICTURE_LENGTH } from "../library/picture-length";
import { PORTRAIT_PICTURES_CHOICES } from "../library/portrait-pictures";
import { MAX_SECONDS_PER_PICTURE, MIN_SECONDS_PER_PICTURE } from "../library/stored-slideshow";
import { CARD_SCHEMA } from "./manifest-schema-card";
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
    openingCard: CARD_SCHEMA,
    closingCard: CARD_SCHEMA,
  },
  required: ["title", "createdAt", "secondsPerPicture", "pictures", "songs"],
  additionalProperties: false,
};

/**
 * JSON Schema (draft-07) of `glissando.json` at the current format version (ADR-0038), built
 * from the same constants `read-manifest.ts` and its siblings check against and kept in sync by
 * `manifest-schema.test.ts`. A manifest at an older readable version (`readManifest` accepts
 * `formatVersion` down to `OLDEST_READABLE_FORMAT_VERSION`) does not necessarily match this
 * schema. A handful of rules JSON Schema cannot express stay reader-only: unique `songs[].file`
 * paths, a card background's `pictureIndex` under the picture count, two slides' clips sharing a
 * `file` but not a `mimeType`, `capturedAt`/`createdAt` also passing `Date.parse`, a caption's or
 * a card text's grapheme-counted length and whitespace rule, a music `trim`'s bounds against its
 * sibling `durationMs`, and a video excerpt's bounds against its siblings `startMs`/`sourceMs` —
 * see that test's reader-only table.
 */
export const MANIFEST_SCHEMA: JsonSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Glissando manifest",
  description: `glissando.json inside a .glissando file, at format version ${GLISSANDO_FORMAT_VERSION} (ADR-0038).`,
  type: "object",
  properties: {
    format: { const: GLISSANDO_FORMAT_ID },
    formatVersion: { const: GLISSANDO_FORMAT_VERSION },
    slideshow: SLIDESHOW_SCHEMA,
  },
  required: ["format", "formatVersion", "slideshow"],
  additionalProperties: false,
};
