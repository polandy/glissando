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
 * Only the app's own reads are answered; any other request goes to the network untouched.
 * A navigation to a path outside the app but inside the scope gets the app too: the scope is
 * the app's directory, so nothing else lives there — except the Immich route, which is live
 * data and never comes from or goes into a cache (ADR-0013).
 */
export function answersRequest(request: Pick<Request, "method" | "url">, scope: string): boolean {
  const url = new URL(request.url);
  const immichRoute = new URL(IMMICH_ROUTE, scope);
  return (
    request.method === GET &&
    url.origin === immichRoute.origin &&
    !url.pathname.startsWith(immichRoute.pathname)
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
