import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";

/**
 * Serves a second, newer build at the same origin as the preview's own, for e2e's `vite preview`
 * only (E2E-139): a request carrying `NEXT_BUILD_COOKIE` gets its file from the directory
 * `E2E_NEXT_BUILD_ENV` names, every other request the preview's build. A cookie, not a switch on
 * the server, so cases in parallel browsers never see each other's version.
 */

/** Set by the Playwright web server command to the newer build's directory. */
export const E2E_NEXT_BUILD_ENV = "GLISSANDO_E2E_NEXT_BUILD";
/** The newer build's commit, distinct from any real one so the two builds always differ. */
export const NEXT_BUILD_COMMIT = "e2e0e2e";
export const NEXT_BUILD_COMMIT_DATE = "2026-01-01T00:00:00Z";
export const NEXT_BUILD_COOKIE = { name: "glissando-e2e-build", value: "next" } as const;

const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const INDEX_FILE = "index.html";
const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".txt": "text/plain",
};
const OTHER_CONTENT = "application/octet-stream";
const EXTENSION = /\.[a-z0-9]+$/;

/** Typed by narrowing: the project leaves out Node's types, so vite's request has no `headers`. */
function cookieHeaderOf(request: object): string {
  if (!("headers" in request) || typeof request.headers !== "object" || request.headers === null) {
    return "";
  }
  const { headers } = request;
  return "cookie" in headers && typeof headers.cookie === "string" ? headers.cookie : "";
}

function asksForNextBuild(request: object): boolean {
  const wanted = `${NEXT_BUILD_COOKIE.name}=${NEXT_BUILD_COOKIE.value}`;
  return cookieHeaderOf(request)
    .split(";")
    .some((cookie) => cookie.trim() === wanted);
}

function contentTypeOf(file: string): string {
  const extension = EXTENSION.exec(file)?.[0];
  return (extension === undefined ? undefined : CONTENT_TYPES[extension]) ?? OTHER_CONTENT;
}

export function nextBuildPlugin(directory: string): Plugin {
  return {
    name: "glissando:e2e-next-build",
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!asksForNextBuild(request)) {
          next();
          return;
        }
        const { pathname } = new URL(request.originalUrl ?? "/", "http://preview.invalid");
        const relative = decodeURIComponent(pathname).replace(/^\/+/, "");
        const file = join(directory, relative === "" ? INDEX_FILE : relative);
        let body: Uint8Array;
        try {
          body = readFileSync(file);
        } catch {
          response.writeHead(HTTP_NOT_FOUND, {});
          response.end();
          return;
        }
        response.writeHead(HTTP_OK, {
          "content-type": contentTypeOf(file),
          "cache-control": "no-cache",
        });
        response.end(body);
      });
    },
  };
}

export function nextBuildPluginsFor(env: Readonly<Record<string, string | undefined>>): Plugin[] {
  const directory = env[E2E_NEXT_BUILD_ENV];
  return directory === undefined ? [] : [nextBuildPlugin(directory)];
}
