import { readServerDocument } from "./server-document";
import type { ServerSlideshowRecord, ShareLink } from "./server-library-client";

/**
 * Reading a JSON answer from the library service's wire shape, shared by every
 * `HttpServerLibraryClient` method: a damaged or foreign answer throws, naming what differed.
 */

export const JSON_MEDIA_TYPE = "application/json";
const UNKNOWN_CODE = "unknown";
/** 16 random bytes as base64url without padding. */
const SHARE_TOKEN = /^[A-Za-z0-9_-]{22}$/;

export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isJson(response: Response): boolean {
  return response.headers.get("content-type")?.startsWith(JSON_MEDIA_TYPE) ?? false;
}

export function mismatch(path: string, name: string, expected: string, got: unknown): Error {
  return new Error(
    `${path} answered "${name}" that is not ${expected} (got ${JSON.stringify(got)}); the app and the Glissando server's library service differ in version`,
  );
}

export function field(value: unknown, name: string, path: string): unknown {
  if (!isRecord(value)) throw mismatch(path, name, "inside an object", value);
  return value[name];
}

export function text(value: unknown, name: string, path: string): string {
  const answer = field(value, name, path);
  if (typeof answer !== "string") throw mismatch(path, name, "a string", answer);
  return answer;
}

export function revision(value: unknown, path: string): number {
  const answer = field(value, "revision", path);
  if (typeof answer !== "number" || !Number.isInteger(answer) || answer < 1) {
    throw mismatch(path, "revision", "a positive whole number", answer);
  }
  return answer;
}

export function readRecord(value: unknown, path: string): ServerSlideshowRecord {
  return {
    id: text(value, "id", path),
    revision: revision(value, path),
    document: readServerDocument(field(value, "document", path)),
  };
}

export function readShareLink(value: unknown, path: string): ShareLink {
  const token = text(value, "token", path);
  if (!SHARE_TOKEN.test(token)) throw mismatch(path, "token", "22 characters of base64url", token);
  const createdAt = text(value, "createdAt", path);
  if (Number.isNaN(Date.parse(createdAt))) {
    throw mismatch(path, "createdAt", "an ISO 8601 date-time", createdAt);
  }
  return { token, createdAt };
}

/** The `error` code and `detail` a refusal names; reads the body. */
export async function refusal(response: Response): Promise<{ code: string; detail: string }> {
  const answer: unknown = isJson(response) ? await response.json() : {};
  if (!isRecord(answer)) return { code: UNKNOWN_CODE, detail: "" };
  return { code: String(answer["error"]), detail: String(answer["detail"]) };
}
