const ISO_8601_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * A value in a JSON document (a .glissando manifest, a server slideshow) unlike what its path
 * expects; every reader below throws it. The message names the path and the value.
 */
export class DocumentFormatError extends Error {
  constructor(path: string, expected: string, actual: unknown) {
    super(`${path}: expected ${expected}, got ${JSON.stringify(actual)}`);
    this.name = "DocumentFormatError";
  }
}

export type JsonObject = Readonly<Record<string, unknown>>;

export function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Unknown keys are rejected, never ignored. */
export function readObject(value: unknown, path: string, keys: readonly string[]): JsonObject {
  if (!isObject(value)) {
    throw new DocumentFormatError(path || "root", "an object", value);
  }
  const unknown = Object.keys(value).find((key) => !keys.includes(key));
  if (unknown !== undefined) {
    throw new DocumentFormatError(
      `${path}.${unknown}`.replace(/^\./, ""),
      `one of ${keys.join(", ")}`,
      unknown,
    );
  }
  return value;
}

export function readText(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new DocumentFormatError(path, "a non-empty string", value);
  }
  return value;
}

export function readDateTime(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    !ISO_8601_DATE_TIME.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new DocumentFormatError(path, "an ISO 8601 date-time", value);
  }
  return value;
}

export function readPositiveInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new DocumentFormatError(path, "a positive whole number", value);
  }
  return value;
}
