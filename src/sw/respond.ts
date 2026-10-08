type RequestLike = Pick<Request, "url" | "mode">;

export interface CachePort {
  match(url: string): Promise<Response | undefined>;
}

export interface RespondPorts<R extends RequestLike> {
  /** The cached `index.html` every navigation is answered with. */
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

/**
 * Only the app's own reads are answered; any other request goes to the network untouched.
 * A navigation to a path outside the app but inside the scope gets the app too: the scope is
 * the app's directory, so nothing else lives there.
 */
export function answersRequest(request: Pick<Request, "method" | "url">, origin: string): boolean {
  return request.method === GET && new URL(request.url).origin === origin;
}

/** Cache first: the network only for what no cache holds (ADR-0005). */
export async function respond<R extends RequestLike>(
  request: R,
  ports: RespondPorts<R>,
): Promise<Response> {
  const url = request.mode === NAVIGATION ? ports.indexUrl : request.url;
  for (const cache of await ports.caches()) {
    const cached = await cache.match(url);
    if (cached !== undefined) {
      return cached;
    }
  }
  return ports.fetch(request);
}
