import { libraryHarness, sampleDocument } from "../../testing/library-harness";
import type { LibraryResponse } from "../../library-http";
import type { StreamEvent } from "../event-stream";
import { createTvHandler, isStreamAnswer } from "../tv-routes";
import { hubHarness, recordingSink } from "./tv-hub-harness";

export interface TestResponse extends LibraryResponse {
  readonly json: Record<string, unknown>;
}

/**
 * The TV layer on the library's in-memory repository and a hub on a clock the test moves. Every
 * request carries a JSON body of `{}` unless it names another.
 */
export function tvHarness() {
  const library = libraryHarness();
  const { hub, advanceClock } = hubHarness();
  const logged: string[] = [];
  const handle = createTvHandler({
    repository: library.repository,
    hub,
    log: (line) => logged.push(line),
  });
  const answer = (
    method: string,
    path: string,
    options: { body?: unknown; headers?: Record<string, string> } = {},
  ) =>
    handle({
      method,
      path,
      headers: { "content-type": "application/json", ...options.headers },
      body: {
        kind: "received",
        bytes: new TextEncoder().encode(JSON.stringify(options.body ?? {})),
      },
    });

  const send = (...request: Parameters<typeof answer>): TestResponse => {
    const response = answer(...request);
    if (isStreamAnswer(response)) throw new Error(`${request[1]} answered a stream`);
    const text =
      typeof response.body === "string" ? response.body : new TextDecoder().decode(response.body);
    const isJson = response.headers["content-type"] === "application/json";
    return { ...response, json: isJson ? (JSON.parse(text) as Record<string, unknown>) : {} };
  };

  /** Opens the stream `path` answers and records its events. */
  const openStream = (path: string) => {
    const response = answer("GET", path);
    if (!isStreamAnswer(response)) throw new Error(`${path} answered ${response.status}`);
    const recording = recordingSink<StreamEvent>();
    const close = response.open(recording.sink);
    return { ...recording, response, close };
  };

  /** A slideshow in the library, with one song, and answers its id. */
  const createSlideshow = () => library.create(sampleDocument("Generated", library.uploadMusic()));

  /** A slideshow shared by link, and answers its token. */
  const shareSlideshow = () => {
    const id = createSlideshow();
    const shared = library.send("POST", `/api/library/slideshows/${id}/share`, { body: {} });
    return String(shared.json["token"]);
  };

  /** A way A session, claimed, so it has both a key and a secret. */
  const claimedSession = () => {
    const made = send("POST", "/api/tv/sessions");
    const tvKey = String(made.json["tvKey"]);
    const code = String(made.json["code"]);
    const claimed = send("POST", "/api/library/tv/claim", { body: { code } });
    return { tvKey, code, remoteSecret: String(claimed.json["remoteSecret"]) };
  };

  return {
    library,
    advanceClock,
    logged,
    answer,
    send,
    openStream,
    createSlideshow,
    shareSlideshow,
    claimedSession,
  };
}
