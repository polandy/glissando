import type { ServerDocument } from "../../src/server-library/server-document";
import { createLibraryHandler } from "../library-handler";
import type { LibraryRequest, LibraryResponse } from "../library-http";
import { createMemoryRepository } from "../memory-repository";

/** The handler on an in-memory repository, a clock the test moves and ids made in sequence. */
export function libraryHarness() {
  const repository = createMemoryRepository();
  const logged: string[] = [];
  let now = START_TIME;
  let ids = 0;
  const handle = createLibraryHandler({
    repository,
    now: () => now,
    newId: () => `00000000-0000-4000-8000-${String(++ids).padStart(12, "0")}`,
    log: (line) => logged.push(line),
  });
  const send = (
    method: string,
    path: string,
    options: { body?: unknown; headers?: Record<string, string> } = {},
  ): TestResponse => {
    const bytes =
      options.body instanceof Uint8Array
        ? options.body
        : new TextEncoder().encode(options.body === undefined ? "" : JSON.stringify(options.body));
    return asTestResponse(
      handle({
        method,
        path,
        headers: { "content-type": "application/json", ...options.headers },
        body: { kind: "received", bytes },
      }),
    );
  };
  return {
    repository,
    logged,
    send,
    handle: (request: LibraryRequest) => asTestResponse(handle(request)),
    advanceClock(milliseconds: number) {
      now += milliseconds;
    },
    /** Creates `document` and answers its id. */
    create(document: ServerDocument = sampleDocument()): string {
      const response = send("POST", "/api/library/slideshows", { body: document });
      if (response.status !== CREATED) {
        throw new Error(`creating failed: ${response.status} ${response.text}`);
      }
      return String(response.json["id"]);
    },
    /** Uploads music and answers its id. */
    uploadMusic(contentType = "audio/mp4"): string {
      const response = send("POST", "/api/library/music", {
        body: new Uint8Array([1, 2, 3]),
        headers: { "content-type": contentType },
      });
      return String(response.json["musicId"]);
    },
  };
}

const START_TIME = Date.UTC(2026, 9, 1);
const CREATED = 201;

export interface TestResponse extends LibraryResponse {
  readonly text: string;
  readonly json: Record<string, unknown>;
}

function asTestResponse(response: LibraryResponse): TestResponse {
  const text =
    typeof response.body === "string" ? response.body : new TextDecoder().decode(response.body);
  const isJson = response.headers["content-type"] === "application/json";
  return { ...response, text, json: isJson ? (JSON.parse(text) as Record<string, unknown>) : {} };
}

export function sampleDocument(title = "Herbst in Wien", musicId?: string): ServerDocument {
  return {
    format: "glissando-server",
    formatVersion: 1,
    slideshow: {
      title,
      createdAt: "2025-10-01T08:00:00.000Z",
      secondsPerPicture: 5,
      pictures: [
        {
          capturedAt: "2025-09-30T10:00:00Z",
          width: 1920,
          height: 1080,
          fileName: "a.jpg",
          immichAssetId: "0b5a7c3e-1f2d-4e6a-9b8c-7d6e5f4a3b2c",
        },
      ],
      ...(musicId === undefined
        ? {}
        : { music: { musicId, fileName: "track.m4a", durationMs: 60000, mimeType: "audio/mp4" } }),
    },
  };
}
