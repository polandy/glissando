import {
  DocumentFormatError,
  readObject,
  readText,
} from "../../src/glissando-file/document-values";
import { readCommand, readPlaybackState } from "../../src/tv-remote/tv-protocol";
import type { LibraryRepository, SlideshowRecord } from "../library-repository";
import {
  errorResponse,
  HTTP_STATUS,
  jsonResponse,
  LIBRARY_PATH,
  MAX_DOCUMENT_BYTES,
  notFound,
  readJsonBody,
  segmentsUnder,
  SHARE_PATH,
  type ErrorCode,
  type LibraryRequest,
  type LibraryResponse,
} from "../library-http";
import {
  notShared,
  sharePictureCheckAnswer,
  shareDocumentAnswer,
  shareSongAnswer,
} from "../share-routes";
import { redactShareTokens } from "../share-token";
import { streamAnswer, type StreamAnswer, type StreamEvent } from "./event-stream";
import type { CloseStream, EventSink, TvHub } from "./tv-hub";
import { redactTvSecrets } from "./tv-redaction";

/**
 * The TV remote's HTTP layer (dev-docs/tv_remote/HTTP_API.md): a request in, a plain response or
 * a stream out, so it is tested without sockets.
 */

export const TV_PATH = "/api/tv";
export const LIBRARY_TV_PATH = `${LIBRARY_PATH}/tv`;
/** Asked by Caddy's forward_auth on loopback only, as the share picture check is. */
export const TV_PICTURE_CHECK_PATH = "/internal/tv-picture";

const CLAIM_PART = "claim";
const SHOW_PART = "show";
const SESSIONS_PART = "sessions";
const REMOTE_PART = "remote";
const EVENTS_PART = "events";
const STATE_PART = "state";
const COMMAND_PART = "command";
const SONGS_PART = "songs";
const TV_PART = "tv";
/** Four letters in either case; the hub's codes are upper case. */
const CODE_PATTERN = /^[A-Za-z]{4}$/;
/** An answer carrying a key or secret is never kept by a cache. */
const SECRET_HEADERS = { "cache-control": "no-store" } as const;

export type TvAnswer = LibraryResponse | StreamAnswer;
export type TvHandler = (request: LibraryRequest) => TvAnswer;

export interface TvHandlerDependencies {
  readonly repository: LibraryRepository;
  readonly hub: TvHub;
  /** One line per request, never with a key, secret, code or share token. */
  readonly log: (line: string) => void;
}

type MethodRoutes = Readonly<Partial<Record<string, TvHandler>>>;

export function isStreamAnswer(answer: TvAnswer): answer is StreamAnswer {
  return "kind" in answer && answer.kind === "stream";
}

/** Whether `path` is the TV layer's, rather than the library's. */
export function isTvPath(path: string): boolean {
  if (
    [TV_PATH, LIBRARY_TV_PATH, TV_PICTURE_CHECK_PATH].some((base) => path.startsWith(`${base}/`))
  ) {
    return true;
  }
  const [token, part, ...beyond] = segmentsUnder(SHARE_PATH, path);
  return token !== undefined && part === TV_PART && beyond.length === 0;
}

const noContent = (): LibraryResponse => ({ status: HTTP_STATUS.noContent, headers: {}, body: "" });
const noSuchTv = () =>
  errorResponse(HTTP_STATUS.notFound, "noSuchTv", "no TV session has this key or secret");
const notShown = () =>
  errorResponse(HTTP_STATUS.notFound, "notShown", "the TV is showing no slideshow yet");
const tooLargeDetail = `a TV request is at most ${MAX_DOCUMENT_BYTES} bytes`;

/** `request`'s JSON body read by `reader`, or the response refusing it with `badCode`. */
function readBody<Value>(
  request: LibraryRequest,
  reader: (json: unknown) => Value,
  badCode: ErrorCode,
): { kind: "read"; value: Value } | { kind: "refused"; response: LibraryResponse } {
  const reading = readJsonBody(request, tooLargeDetail, badCode);
  if (reading.kind === "refused") return reading;
  try {
    return { kind: "read", value: reader(reading.value) };
  } catch (error) {
    if (error instanceof DocumentFormatError) {
      return {
        kind: "refused",
        response: errorResponse(HTTP_STATUS.badRequest, badCode, error.message),
      };
    }
    throw error;
  }
}

const anyJson = (json: unknown) => json;

function readCode(json: unknown): string {
  const code = readText(readObject(json, "", ["code"])["code"], "code");
  if (!CODE_PATTERN.test(code)) throw new DocumentFormatError("code", "four letters", code);
  return code.toUpperCase();
}

const readSlideshowId = (json: unknown) =>
  readText(readObject(json, "", ["slideshowId"])["slideshowId"], "slideshowId");

/** A stream whose session ended between the answer and its opening: it ends at once. */
function endedStream(sink: EventSink<StreamEvent>): CloseStream {
  sink.send({ name: "end", data: {} });
  sink.close();
  return () => undefined;
}

export function createTvHandler({ repository, hub, log }: TvHandlerDependencies): TvHandler {
  /** The slideshow a way A TV shows, or the 404 it answers before one is chosen. */
  const shownTo = (tvKey: string, answer: (record: SlideshowRecord) => LibraryResponse) => {
    const source = hub.sourceOf(tvKey);
    if (source === undefined) return noSuchTv();
    const record =
      source.kind === "chosen" && source.slideshowId !== undefined
        ? repository.findSlideshow(source.slideshowId)
        : undefined;
    return record === undefined ? notShown() : answer(record);
  };

  const claim: TvHandler = (request) => {
    const body = readBody(request, readCode, "invalidCode");
    if (body.kind === "refused") return body.response;
    const remoteSecret = hub.claim(body.value);
    return remoteSecret === undefined
      ? errorResponse(HTTP_STATUS.notFound, "noSuchCode", "no TV shows this code")
      : jsonResponse(HTTP_STATUS.ok, { remoteSecret }, SECRET_HEADERS);
  };

  const show =
    (remoteSecret: string): TvHandler =>
    (request) => {
      const body = readBody(request, readSlideshowId, "invalidDocument");
      if (body.kind === "refused") return body.response;
      if (repository.findSlideshow(body.value) === undefined) return notFound();
      const outcome = hub.show(remoteSecret, body.value);
      if (outcome === "noSuchTv") return noSuchTv();
      if (outcome === "boundToLink") {
        return errorResponse(
          HTTP_STATUS.conflict,
          "boundToLink",
          "this TV plays a share link; its slideshow cannot change",
        );
      }
      return noContent();
    };

  const createSession: TvHandler = (request) => {
    const body = readBody(request, anyJson, "invalidDocument");
    if (body.kind === "refused") return body.response;
    return jsonResponse(HTTP_STATUS.created, hub.create(), SECRET_HEADERS);
  };

  const createBoundSession =
    (token: string): TvHandler =>
    (request) => {
      const body = readBody(request, anyJson, "invalidDocument");
      if (body.kind === "refused") return body.response;
      return repository.slideshowByShareToken(token) === undefined
        ? notShared()
        : jsonResponse(HTTP_STATUS.created, hub.createBound(token), SECRET_HEADERS);
    };

  const tvEvents = (tvKey: string): TvAnswer =>
    hub.sourceOf(tvKey) === undefined
      ? noSuchTv()
      : streamAnswer((sink) => hub.connectTv(tvKey, sink) ?? endedStream(sink));

  const remoteEvents = (remoteSecret: string): TvAnswer =>
    hub.hasRemoteSecret(remoteSecret)
      ? streamAnswer((sink) => hub.connectRemote(remoteSecret, sink) ?? endedStream(sink))
      : noSuchTv();

  const report =
    (tvKey: string): TvHandler =>
    (request) => {
      const body = readBody(request, readPlaybackState, "invalidState");
      if (body.kind === "refused") return body.response;
      return hub.report(tvKey, body.value) === "noSuchTv" ? noSuchTv() : noContent();
    };

  const command =
    (remoteSecret: string): TvHandler =>
    (request) => {
      const body = readBody(request, readCommand, "invalidCommand");
      if (body.kind === "refused") return body.response;
      const outcome = hub.command(remoteSecret, body.value);
      if (outcome === "noSuchTv") return noSuchTv();
      if (outcome === "tvAway") {
        return errorResponse(HTTP_STATUS.conflict, "tvAway", "the TV has no stream open");
      }
      return noContent();
    };

  const routesFor = (path: string): MethodRoutes => {
    const [privateFirst, privateSecond, ...privateBeyond] = segmentsUnder(LIBRARY_TV_PATH, path);
    if (privateFirst === CLAIM_PART && privateSecond === undefined) return { POST: claim };
    if (privateFirst !== undefined && privateSecond === SHOW_PART && privateBeyond.length === 0) {
      return { POST: show(privateFirst) };
    }
    const [first, second, third, fourth, ...beyond] = segmentsUnder(TV_PATH, path);
    if (first === SESSIONS_PART && second === undefined) return { POST: createSession };
    if (first === REMOTE_PART && second !== undefined && fourth === undefined) {
      if (third === EVENTS_PART) return { GET: () => remoteEvents(second) };
      if (third === COMMAND_PART) return { POST: command(second) };
      return {};
    }
    if (first !== undefined && first !== REMOTE_PART && beyond.length === 0) {
      if (second === EVENTS_PART && third === undefined) return { GET: () => tvEvents(first) };
      if (second === STATE_PART && third === undefined) return { PUT: report(first) };
      if (second === SHOW_PART && third === undefined) {
        return { GET: () => shownTo(first, (record) => shareDocumentAnswer(repository, record)) };
      }
      if (second === SHOW_PART && third === SONGS_PART && fourth !== undefined) {
        return {
          GET: () => shownTo(first, (record) => shareSongAnswer(repository, record, fourth)),
        };
      }
    }
    const [token, sharePart, ...shareBeyond] = segmentsUnder(SHARE_PATH, path);
    if (token !== undefined && sharePart === TV_PART && shareBeyond.length === 0) {
      return { POST: createBoundSession(token) };
    }
    const [checkedKey, position, ...checkBeyond] = segmentsUnder(TV_PICTURE_CHECK_PATH, path);
    if (checkedKey !== undefined && position !== undefined && checkBeyond.length === 0) {
      return {
        GET: () => shownTo(checkedKey, (record) => sharePictureCheckAnswer(record, position)),
      };
    }
    return {};
  };

  return (request) => {
    const routes = routesFor(request.path);
    // Own keys only: a method named like an Object.prototype member is no route.
    const chosen = Object.hasOwn(routes, request.method) ? routes[request.method] : undefined;
    const answer = chosen ? chosen(request) : notFound();
    const path = redactTvSecrets(redactShareTokens(request.path));
    log(`${request.method} ${path} ${answer.status}`);
    return answer;
  };
}
