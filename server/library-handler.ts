import type { LibraryRepository } from "./library-repository";
import {
  HTTP_STATUS,
  jsonResponse,
  LIBRARY_PATH,
  MUSIC_PATH,
  notFound,
  SLIDESHOWS_PATH,
  type LibraryRequest,
  type LibraryResponse,
} from "./library-http";
import { musicRoutes } from "./music-routes";
import { slideshowRoutes } from "./slideshow-routes";

export interface LibraryHandlerDependencies {
  readonly repository: LibraryRepository;
  /** Milliseconds since the epoch. */
  readonly now: () => number;
  /** A new, unique id for a slideshow or music. */
  readonly newId: () => string;
  /** One line per request. */
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
    const slideshowId = idUnder(SLIDESHOWS_PATH, path);
    if (slideshowId !== undefined) {
      return {
        GET: () => slideshows.read(slideshowId),
        PUT: (request) => slideshows.replace(slideshowId, request),
        DELETE: () => slideshows.remove(slideshowId),
      };
    }
    const musicId = idUnder(MUSIC_PATH, path);
    return musicId === undefined ? {} : { GET: () => music.read(musicId) };
  };

  return (request) => {
    const routes = routesFor(request.path);
    // Own keys only: a method named like an Object.prototype member is no route.
    const chosen = Object.hasOwn(routes, request.method) ? routes[request.method] : undefined;
    const response = chosen ? chosen(request) : notFound();
    dependencies.log(`${request.method} ${request.path} ${response.status}`);
    return response;
  };
}

/** The single path segment after `base`, if `path` is one. */
function idUnder(base: string, path: string): string | undefined {
  const prefix = `${base}/`;
  if (!path.startsWith(prefix)) {
    return undefined;
  }
  const id = path.slice(prefix.length);
  return id === "" || id.includes("/") ? undefined : id;
}
