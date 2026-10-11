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
      const response = await get(fetch, base);
      return readShareAnswer(await response.json());
    },
    async picture(revision, index) {
      return (await get(fetch, `${base}/${revision}/pictures/${index}`)).blob();
    },
    async song(index) {
      return (await get(fetch, `${base}/songs/${index}`)).blob();
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
  const code = await errorCode(response);
  if (code !== null && MISSING_MEDIUM_CODES.includes(code)) {
    throw new ShareMediumMissingError(`${url} answered 404 ${code}`);
  }
  // `notShared`, and a 404 from anything in front of the service: the link doesn't work.
  throw new ShareGoneError(`${url} answered 404 ${code ?? "without an error code"}`);
}

async function errorCode(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    const code: unknown =
      typeof body === "object" && body !== null ? Reflect.get(body, "error") : undefined;
    return typeof code === "string" ? code : null;
  } catch {
    // A 404 page that is no JSON names no code.
    return null;
  }
}
