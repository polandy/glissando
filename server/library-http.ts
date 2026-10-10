/**
 * The library service's requests and responses as plain values, so the handler is a function
 * tested without sockets; `main.ts` maps them to and from `node:http`.
 */

const MIB = 1024 * 1024;
export const MAX_MUSIC_BYTES = 200 * MIB;
export const MAX_DOCUMENT_BYTES = 2 * MIB;

export const LIBRARY_PATH = "/api/library";
export const SLIDESHOWS_PATH = `${LIBRARY_PATH}/slideshows`;
export const MUSIC_PATH = `${LIBRARY_PATH}/music`;

export const HTTP_STATUS = {
  ok: 200,
  created: 201,
  noContent: 204,
  badRequest: 400,
  notFound: 404,
  conflict: 409,
  preconditionFailed: 412,
  tooLarge: 413,
  unsupportedMediaType: 415,
  preconditionRequired: 428,
  internalError: 500,
} as const;

/** The body as received, or the note that it passed the path's `maxBodyBytes`. */
export type RequestBody =
  { readonly kind: "received"; readonly bytes: Uint8Array } | { readonly kind: "tooLarge" };

export interface LibraryRequest {
  readonly method: string;
  /** The URL's path, without the query. */
  readonly path: string;
  /** By lower-case name. */
  readonly headers: Readonly<Record<string, string | undefined>>;
  readonly body: RequestBody;
}

export interface LibraryResponse {
  readonly status: number;
  /** By lower-case name. */
  readonly headers: Readonly<Record<string, string>>;
  readonly body: Uint8Array | string;
}

/** The most bytes a request to `path` may carry. */
export function maxBodyBytes(path: string): number {
  return path === MUSIC_PATH ? MAX_MUSIC_BYTES : MAX_DOCUMENT_BYTES;
}

const JSON_CONTENT_TYPE = "application/json";

/**
 * Whether `contentType` is JSON, parameters such as a charset allowed. A write demands it so a
 * cross-site form or `text/plain` request, which a browser sends without asking, cannot write.
 */
export function isJsonContentType(contentType: string | undefined): boolean {
  const mediaType = contentType?.split(";", 1)[0]?.trim().toLowerCase();
  return mediaType === JSON_CONTENT_TYPE;
}

export function jsonResponse(
  status: number,
  value: unknown,
  headers: Readonly<Record<string, string>> = {},
): LibraryResponse {
  return {
    status,
    headers: { ...headers, "content-type": JSON_CONTENT_TYPE },
    body: JSON.stringify(value),
  };
}

/** The error codes the API answers (`dev-docs/SERVER_LIBRARY.md`, The HTTP API). */
export type ErrorCode =
  | "notFound"
  | "invalidDocument"
  | "musicMissing"
  | "revisionChanged"
  | "revisionRequired"
  | "tooLarge"
  | "notAudio"
  | "notJson"
  | "internalError";

export function errorResponse(
  status: number,
  error: ErrorCode,
  detail: string,
  more: Readonly<Record<string, unknown>> = {},
): LibraryResponse {
  return jsonResponse(status, { error, detail, ...more });
}

export function notFound(): LibraryResponse {
  return errorResponse(HTTP_STATUS.notFound, "notFound", "no such slideshow, music or route");
}
