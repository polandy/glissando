import type { LibraryRepository } from "./library-repository";
import {
  HTTP_STATUS,
  jsonResponse,
  LIBRARY_PATH,
  MUSIC_PATH,
  notFound,
  segmentsUnder,
  SHARE_PATH,
  SHARE_PICTURE_CHECK_PATH,
  SLIDESHOWS_PATH,
  type LibraryRequest,
  type LibraryResponse,
} from "./library-http";
import { musicRoutes } from "./music-routes";
import { shareRoutes } from "./share-routes";
import { redactShareTokens, type RandomBytes } from "./share-token";
import { slideshowRoutes } from "./slideshow-routes";

export interface LibraryHandlerDependencies {
  readonly repository: LibraryRepository;
  /** Milliseconds since the epoch. */
  readonly now: () => number;
  /** A new, unique id for a slideshow or music. */
  readonly newId: () => string;
  /** The source of share tokens (`server/share-token.ts`). */
  readonly randomBytes: RandomBytes;
  /** One line per request, never with a share token. */
  readonly log: (line: string) => void;
}

export type LibraryHandler = (request: LibraryRequest) => LibraryResponse;

/** The handler of each method a path answers. */
type MethodRoutes = Readonly<Partial<Record<string, LibraryHandler>>>;

const DISCOVERY = { service: "glissando-library", version: 1 } as const;

/** The library service: a request in, its response out (`dev-docs/SERVER_LIBRARY.md`). */
export function createLibraryHandler(dependencies: LibraryHandlerDependencies): LibraryHandler {
  const slideshows = slideshowRoutes(dependencies);
  const music = musicRoutes(dependencies);
  const share = shareRoutes(dependencies);

  const discovery = () => jsonResponse(HTTP_STATUS.ok, DISCOVERY);
  const routesFor = (path: string): MethodRoutes => {
    if (path === LIBRARY_PATH) {
      return { GET: discovery };
    }
    if (path === SLIDESHOWS_PATH) {
      return { GET: slideshows.list, POST: slideshows.create };
    }
    if (path === MUSIC_PATH) {
      return { POST: music.upload };
    }
    const [slideshowId, slideshowPart, ...beyondSlideshow] = segmentsUnder(SLIDESHOWS_PATH, path);
    if (slideshowId !== undefined && slideshowPart === undefined) {
      return {
        GET: () => slideshows.read(slideshowId),
        PUT: (request) => slideshows.replace(slideshowId, request),
        DELETE: () => slideshows.remove(slideshowId),
      };
    }
    if (slideshowId !== undefined && slideshowPart === SHARE_PART && beyondSlideshow.length === 0) {
      return {
        POST: (request) => share.share(slideshowId, request),
        DELETE: () => share.unshare(slideshowId),
      };
    }
    const [musicId, musicPart, ...beyondMusic] = segmentsUnder(MUSIC_PATH, path);
    if (musicId !== undefined && musicPart === undefined) {
      return { GET: () => music.read(musicId) };
    }
    if (musicId !== undefined && musicPart === BEATS_PART && beyondMusic.length === 0) {
      return {
        GET: () => music.readBeats(musicId),
        PUT: (request) => music.replaceBeats(musicId, request),
      };
    }
    if (musicId !== undefined && musicPart === LOUDNESS_PART && beyondMusic.length === 0) {
      return {
        GET: () => music.readLoudness(musicId),
        PUT: (request) => music.replaceLoudness(musicId, request),
      };
    }
    const [token, sharePart, songPosition, ...beyondShare] = segmentsUnder(SHARE_PATH, path);
    if (token !== undefined && sharePart === undefined) {
      return { GET: () => share.document(token) };
    }
    if (token !== undefined && sharePart === SONGS_PART && songPosition !== undefined) {
      return beyondShare.length === 0 ? { GET: () => share.song(token, songPosition) } : {};
    }
    const [checkedToken, picturePosition, ...beyondCheck] = segmentsUnder(
      SHARE_PICTURE_CHECK_PATH,
      path,
    );
    if (checkedToken !== undefined && picturePosition !== undefined && beyondCheck.length === 0) {
      return { GET: () => share.pictureCheck(checkedToken, picturePosition) };
    }
    return {};
  };

  return (request) => {
    const routes = routesFor(request.path);
    // Own keys only: a method named like an Object.prototype member is no route.
    const chosen = Object.hasOwn(routes, request.method) ? routes[request.method] : undefined;
    const response = chosen ? chosen(request) : notFound();
    dependencies.log(`${request.method} ${redactShareTokens(request.path)} ${response.status}`);
    return response;
  };
}

const SHARE_PART = "share";
const BEATS_PART = "beats";
const LOUDNESS_PART = "loudness";
const SONGS_PART = "songs";
