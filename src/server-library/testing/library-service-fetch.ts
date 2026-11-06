import { libraryHarness } from "../../../server/testing/library-harness";
import { HttpServerLibraryClient } from "../http-server-library-client";

/** Where the app is served in these tests; the library service answers under `api/library`. */
const APP_URL = "https://glissando.example/";

const NO_BODY_STATUSES: ReadonlySet<number> = new Set([204, 304]);

/**
 * The real library service in-process: `fetch` hands each request to its handler (on an
 * in-memory repository). `down` makes every request fail as a network failure does, and
 * `answerWith` replaces the service's answers, e.g. with a proxy's 502. `holdNextAnswer` lets the
 * service answer the next request at once but delivers that answer only on `release`.
 */
export function libraryServiceFetch() {
  const service = libraryHarness();
  const control = {
    down: false,
    answerWith: null as (() => Response) | null,
  };
  let held: { answered(): void; delivered: Promise<void> } | null = null;
  function holdNextAnswer(): { answered: Promise<void>; release(): void } {
    const answered = Promise.withResolvers<undefined>();
    const delivered = Promise.withResolvers<undefined>();
    held = { answered: () => answered.resolve(undefined), delivered: delivered.promise };
    return { answered: answered.promise, release: () => delivered.resolve(undefined) };
  }
  const fetch: typeof globalThis.fetch = async (input, init) => {
    if (control.down) throw new TypeError("Failed to fetch");
    if (control.answerWith !== null) return control.answerWith();
    const request = new Request(input, init);
    const headers: Record<string, string> = {};
    request.headers.forEach((value, name) => (headers[name] = value));
    const response = service.handle({
      method: request.method,
      path: new URL(request.url).pathname,
      headers,
      body: { kind: "received", bytes: new Uint8Array(await request.arrayBuffer()) },
    });
    const hold = held;
    held = null;
    if (hold !== null) {
      hold.answered();
      await hold.delivered;
    }
    const body = NO_BODY_STATUSES.has(response.status)
      ? null
      : typeof response.body === "string"
        ? response.body
        : new Uint8Array(response.body);
    return new Response(body, { status: response.status, headers: response.headers });
  };
  const client = new HttpServerLibraryClient({ appUrl: APP_URL, fetch });
  return { service, control, fetch, client, holdNextAnswer };
}
