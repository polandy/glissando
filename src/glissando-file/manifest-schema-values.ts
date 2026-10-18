import { ISO_8601_DATE_TIME } from "./document-values";

/**
 * A small, typed subset of JSON Schema draft-07: just the keywords the manifest schema
 * (`manifest-schema.ts` and its siblings) needs. Building blocks shared by more than one of those
 * modules live here, so a bound or pattern is never written out twice.
 */
export interface JsonSchema {
  readonly $schema?: string;
  readonly title?: string;
  readonly description?: string;
  readonly type?: JsonSchemaType | readonly JsonSchemaType[];
  readonly const?: unknown;
  readonly enum?: readonly unknown[];
  readonly pattern?: string;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly multipleOf?: number;
  readonly items?: JsonSchema;
  readonly minItems?: number;
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean;
  readonly not?: JsonSchema;
  readonly if?: JsonSchema;
  readonly then?: JsonSchema;
  readonly allOf?: readonly JsonSchema[];
  readonly anyOf?: readonly JsonSchema[];
}

export type JsonSchemaType =
  "object" | "array" | "string" | "number" | "integer" | "boolean" | "null";

/** `readText`: a string that is not empty once trimmed. */
export const NON_EMPTY_STRING_SCHEMA: JsonSchema = { type: "string", pattern: "\\S" };

/**
 * `readDateTime`'s shape; it also calls `Date.parse` on the value, which a pattern cannot (stays
 * reader-only).
 */
export const DATE_TIME_SCHEMA: JsonSchema = { type: "string", pattern: ISO_8601_DATE_TIME.source };

/** `isHexColour`'s shape: `#RRGGBB`, case-insensitive. */
export const HEX_COLOUR_SCHEMA: JsonSchema = { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" };

/** `readPositiveInteger`: a whole, positive, safe-integer number. */
export const POSITIVE_SAFE_INTEGER_SCHEMA: JsonSchema = {
  type: "integer",
  minimum: 1,
  maximum: Number.MAX_SAFE_INTEGER,
};

/**
 * A plain string with no length or whitespace rule: a caption's or a card text's grapheme-counted
 * normalisation (`isCaption`) counts user-perceived characters, which a pattern cannot, and stays
 * reader-only.
 */
export const FREE_TEXT_SCHEMA: JsonSchema = { type: "string" };
