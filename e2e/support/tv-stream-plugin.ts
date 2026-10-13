import type { ServerResponse } from "node:http";
import type { Plugin } from "vite";

/**
 * Serves the TV API's `EventSource` streams as a held-open connection, for e2e's `vite preview`
 * only (`dev-docs/tv_remote/END_TO_END.md`): `route.fulfill()` always delivers a complete,
 * already-closed response, and the remote page treats a closed stream as a lost connection.
 * `fake-tv-api.ts` runs the real hub and routes in the test's process, continues the browser's
 * stream request here (`TV_STREAM_QUERY` added to the same path) and pushes each event line to
 * `TV_STREAM_PUSH_PATH`, from the test's process, never through the browser.
 */

/** Marks a request as the held-open half of a stream `fake-tv-api.ts` continues here. */
export const TV_STREAM_QUERY = "e2eStream";
/** Where `fake-tv-api.ts` pushes an event line (`?path=&line=`); a browser never requests it. */
export const TV_STREAM_PUSH_PATH = "/__e2e-tv-stream-push__";

const HTTP_OK = 200;
const HTTP_NO_CONTENT = 204;
const HTTP_BAD_REQUEST = 400;

interface StreamState {
  /** Every line pushed for this path so far, replayed to a connection that opens later. */
  readonly lines: string[];
  readonly open: Set<ServerResponse>;
}

function stateOf(streams: Map<string, StreamState>, path: string): StreamState {
  let state = streams.get(path);
  if (state === undefined) {
    state = { lines: [], open: new Set() };
    streams.set(path, state);
  }
  return state;
}

export function tvStreamPlugin(): Plugin {
  const streams = new Map<string, StreamState>();

  return {
    name: "glissando:e2e-tv-stream",
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.originalUrl ?? "/", "http://preview.invalid");
        if (url.pathname === TV_STREAM_PUSH_PATH) {
          const path = url.searchParams.get("path");
          const line = url.searchParams.get("line");
          if (path === null || line === null) {
            response.writeHead(HTTP_BAD_REQUEST, {});
            response.end();
            return;
          }
          const state = stateOf(streams, path);
          state.lines.push(line);
          for (const open of state.open) open.write(line);
          response.writeHead(HTTP_NO_CONTENT, {});
          response.end();
          return;
        }
        if (url.searchParams.has(TV_STREAM_QUERY)) {
          const state = stateOf(streams, url.pathname);
          response.writeHead(HTTP_OK, {
            "content-type": "text/event-stream",
            "cache-control": "no-store",
          });
          for (const line of state.lines) response.write(line);
          state.open.add(response);
          response.once("close", () => state.open.delete(response));
          return;
        }
        next();
      });
    },
  };
}
