import { readShareAnswer, type ShareAnswer } from "./share-answer";

/** `fetch` as the page uses it: a GET of a URL on the page's own origin. */
export type FetchPort = (url: string) => Promise<Response>;

/** The public share API (dev-docs/SHARE_LINK.md, Public), its failures as the page tells them. */
export interface ShareApi {
  answer(): Promise<ShareAnswer>;
  /** Picture `index` of the slideshow; `revision` only keeps a reorder out of the cache. */
  picture(revision: number, index: number): Promise<Blob>;
  song(index: number): Promise<Blob>;
}

/** The link is unknown or turned off (404 `notShared`). */
export class ShareGoneError extends Error {
  override readonly name = "ShareGoneError";
}

/** The server isn't answering: no network, or a 5xx from the service or a proxy. */
export class ShareUnreachableError extends Error {
  override readonly name = "ShareUnreachableError";
}

/** The slideshow no longer has this picture or song (404 `noSuchPicture` / `noSuchSong`). */
export class ShareMediumMissingError extends Error {
  override readonly name = "ShareMediumMissingError";
}

/** The service's answer to anything else. */
export class ShareAnswerError extends Error {
  override readonly name = "ShareAnswerError";
}

const SHARE_API_PATH = "/api/share/";
const NOT_FOUND = 404;
const FIRST_SERVER_ERROR = 500;
const MISSING_MEDIUM_CODES: readonly string[] = ["noSuchPicture", "noSuchSong"];

export function createShareApi(fetch: FetchPort, token: string): ShareApi {
  const base = `${SHARE_API_PATH}${encodeURIComponent(token)}`;
  return {
    async answer() {
      const body = await bodyOf(base, await get(fetch, base), (response) => response.text());
      return readShareAnswer(JSON.parse(body));
    },
    async picture(revision, index) {
      const url = `${base}/${revision}/pictures/${index}`;
      return bodyOf(url, await get(fetch, url), (response) => response.blob());
    },
    async song(index) {
      const url = `${base}/songs/${index}`;
      return bodyOf(url, await get(fetch, url), (response) => response.blob());
    },
  };
}

async function get(fetch: FetchPort, url: string): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause: unknown) {
    throw new ShareUnreachableError(`${url} could not be fetched`, { cause });
  }
  if (response.ok) return response;
  if (response.status >= FIRST_SERVER_ERROR) {
    throw new ShareUnreachableError(`${url} answered ${response.status}`);
  }
  if (response.status !== NOT_FOUND) {
    throw new ShareAnswerError(`${url} answered ${response.status}, expected 200 or 404`);
  }
  const code = errorCode(await bodyOf(url, response, (notFound) => notFound.text()));
  if (code !== null && MISSING_MEDIUM_CODES.includes(code)) {
    throw new ShareMediumMissingError(`${url} answered 404 ${code}`);
  }
  // `notShared`, and a 404 from anything in front of the service: the link doesn't work.
  throw new ShareGoneError(`${url} answered 404 ${code ?? "without an error code"}`);
}

/** Reads `response`'s body; a connection dropped meanwhile is the server not answering. */
async function bodyOf<T>(
  url: string,
  response: Response,
  read: (response: Response) => Promise<T>,
): Promise<T> {
  try {
    return await read(response);
  } catch (cause: unknown) {
    throw new ShareUnreachableError(`${url} broke off while its answer was read`, { cause });
  }
}

function errorCode(body: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch (error: unknown) {
    // A 404 page that is no JSON names no code.
    if (error instanceof SyntaxError) return null;
    throw error;
  }
  const code: unknown =
    typeof parsed === "object" && parsed !== null ? Reflect.get(parsed, "error") : undefined;
  return typeof code === "string" ? code : null;
}
