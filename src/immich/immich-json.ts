/**
 * Narrowing of Immich's JSON at the boundary. Every failure names the request, the field and
 * what it got, because a mismatch means an Immich whose API differs from the measured v3.3.1.
 */

/** The Immich version whose answers are recorded in `fixtures/`. */
const MEASURED_IMMICH_VERSION = "3.3.1";

export type JsonRecord = Readonly<Record<string, unknown>>;

export class ImmichJsonReader {
  readonly #request: string;

  /** `request` names the answer being read, e.g. "GET api/albums". */
  constructor(request: string) {
    this.#request = request;
  }

  record(value: unknown, what: string): JsonRecord {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw this.#mismatch(what, "an object", value);
    }
    return value as JsonRecord;
  }

  array(value: unknown, what: string): readonly unknown[] {
    if (!Array.isArray(value)) throw this.#mismatch(what, "an array", value);
    return value;
  }

  string(record: JsonRecord, field: string): string {
    const value = record[field];
    if (typeof value !== "string") throw this.#mismatch(`"${field}"`, "a string", value);
    return value;
  }

  /** A string, or null where Immich leaves the field out or sets it null. */
  optionalString(record: JsonRecord, field: string): string | null {
    const value = record[field];
    if (value === undefined || value === null) return null;
    if (typeof value !== "string") throw this.#mismatch(`"${field}"`, "a string or null", value);
    return value;
  }

  /** A positive whole number Immich sends as a string (a page number), or null. */
  optionalCountingString(record: JsonRecord, field: string): number | null {
    const text = this.optionalString(record, field);
    if (text === null) return null;
    const value = Number(text);
    if (!Number.isInteger(value) || value < 1) {
      throw this.#mismatch(`"${field}"`, "a positive whole number", text);
    }
    return value;
  }

  number(record: JsonRecord, field: string): number {
    const value = record[field];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw this.#mismatch(`"${field}"`, "a number", value);
    }
    return value;
  }

  /** A number, or null where Immich leaves the field out or sets it null. */
  optionalNumber(record: JsonRecord, field: string): number | null {
    const value = record[field];
    if (value === undefined || value === null) return null;
    return this.number(record, field);
  }

  #mismatch(what: string, expected: string, got: unknown): Error {
    return new Error(
      `${this.#request} answered with ${what} that is not ${expected} (got ${JSON.stringify(got)}); ` +
        `Glissando reads the API of Immich v${MEASURED_IMMICH_VERSION}; update Immich or Glissando so they match`,
    );
  }
}
