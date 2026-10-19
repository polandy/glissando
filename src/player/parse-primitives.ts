import { CAPTION_RULE, isCaption } from "./caption";

/**
 * The small, reusable readers `parse-slideshow.ts` and `parse-card.ts` both need: JSON shape
 * checks and `SlideshowFormatError`, the format's one failure type.
 */

/** The slideshow JSON broke the format at `path`; the message says what to set instead. */
export class SlideshowFormatError extends Error {
  constructor(
    readonly path: string,
    expected: string,
    actual: unknown,
  ) {
    super(`${path || "slideshow"}: expected ${expected}, got ${JSON.stringify(actual)}`);
    this.name = "SlideshowFormatError";
  }
}

const ISO_8601_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;
const HEX_COLOR = /^#[0-9A-F]{6}$/i;

export type JsonObject = Readonly<Record<string, unknown>>;

export function readObject(value: unknown, path: string, knownKeys: readonly string[]): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new SlideshowFormatError(path, "an object", value);
  }
  const unknownKey = Object.keys(value).find((key) => !knownKeys.includes(key));
  if (unknownKey !== undefined) {
    const keyPath = path ? `${path}.${unknownKey}` : unknownKey;
    throw new SlideshowFormatError(
      keyPath,
      `no unknown key (allowed: ${knownKeys.join(", ")})`,
      unknownKey,
    );
  }
  return value as JsonObject;
}

export function readString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new SlideshowFormatError(path, "a string", value);
  }
  return value;
}

export function readNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value === "") {
    throw new SlideshowFormatError(path, "a non-empty string", value);
  }
  return value;
}

export function readIsoDate(value: unknown, path: string): string {
  if (typeof value !== "string" || !ISO_8601_DATE.test(value) || Number.isNaN(Date.parse(value))) {
    throw new SlideshowFormatError(path, "an ISO 8601 date such as 2025-07-01T10:00:00Z", value);
  }
  return value;
}

export function readPositiveInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new SlideshowFormatError(path, "a positive integer", value);
  }
  return value;
}

export function readNonNegativeInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new SlideshowFormatError(path, "a whole number ≥ 0", value);
  }
  return value;
}

export function readPositiveFiniteNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new SlideshowFormatError(path, "a positive finite number", value);
  }
  return value;
}

export function readUnitInterval(value: unknown, path: string): number {
  if (typeof value !== "number" || !(value >= 0 && value <= 1)) {
    throw new SlideshowFormatError(path, "a number from 0 to 1", value);
  }
  return value;
}

export function readOneOf<T extends string>(
  value: unknown,
  path: string,
  allowed: readonly T[],
): T {
  if (typeof value !== "string" || !allowed.some((option) => option === value)) {
    throw new SlideshowFormatError(path, `one of ${allowed.join(", ")}`, value);
  }
  return value as T;
}

export function readHexColor(value: unknown, path: string): string {
  if (typeof value !== "string" || !HEX_COLOR.test(value)) {
    throw new SlideshowFormatError(path, "a #RRGGBB colour", value);
  }
  return value;
}

/** The caption rule (1 to 80 graphemes, one line, no outer/repeated whitespace); also a card's title/subtitle. */
export function readCaptionLike(value: unknown, path: string): string {
  if (!isCaption(value)) {
    throw new SlideshowFormatError(path, CAPTION_RULE, value);
  }
  return value;
}
