type RequestLike = Pick<Request, "url" | "mode">;

export interface CachePort {
  match(url: string): Promise<Response | undefined>;
}

export interface RespondPorts<R extends RequestLike> {
  /** The cached `index.html` a navigation is answered with unless it names a cached file. */
  readonly indexUrl: string;
  /**
   * The app caches in search order: the current version's first, then the previous one's, so a
   * tab still running that version finds its files.
   */
  caches(): Promise<readonly CachePort[]>;
  fetch(request: R): Promise<Response>;
}

const NAVIGATION: RequestMode = "navigate";
const GET = "GET";
/** The self-hosted install's route to Immich, relative to the app (ADR-0013). */
const IMMICH_ROUTE = "immich/";
/**
 * The self-hosted install's server routes, relative to the app: the library service (ADR-0018)
 * and the public share API under `api/`, the shared slideshows' page under `s/` (ADR-0025), and
 * the TV's page `tv` and its phone remote's page under `r/` (dev-docs/tv_remote/).
 */
const SERVER_ROUTES = ["api", "s", "r", "tv"] as const;

/**
 * Only the app's own reads are answered; any other request goes to the network untouched.
 * A navigation to a path outside the app but inside the scope gets the app too: the scope is
 * the app's directory, so nothing else lives there — except the Immich and server routes, which
 * are live data and never come from or go into a cache (ADR-0013, ADR-0018, ADR-0025).
 */
export function answersRequest(request: Pick<Request, "method" | "url">, scope: string): boolean {
  const url = new URL(request.url);
  const immichRoute = new URL(IMMICH_ROUTE, scope);
  const isServerRoute = SERVER_ROUTES.some((route) => {
    const { pathname } = new URL(route, scope);
    return url.pathname === pathname || url.pathname.startsWith(`${pathname}/`);
  });
  return (
    request.method === GET &&
    url.origin === immichRoute.origin &&
    !url.pathname.startsWith(immichRoute.pathname) &&
    !isServerRoute
  );
}

/**
 * Cache first: the network only for what no cache holds (ADR-0005). A navigation gets the cached
 * file it names, such as the licences, and otherwise the app.
 */
export async function respond<R extends RequestLike>(
  request: R,
  ports: RespondPorts<R>,
): Promise<Response> {
  const caches = await ports.caches();
  const urls = request.mode === NAVIGATION ? [request.url, ports.indexUrl] : [request.url];
  for (const url of urls) {
    for (const cache of caches) {
      const cached = await cache.match(url);
      if (cached !== undefined) {
        return cached;
      }
    }
  }
  return ports.fetch(request);
}
