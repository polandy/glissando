import type { IncomingMessage, ServerResponse } from "node:http";
import { collectBody } from "./collect-body";
import type { LibraryHandler } from "./library-handler";
import { errorResponse, HTTP_STATUS, maxBodyBytes, type RequestBody } from "./library-http";
import { redactShareTokens } from "./share-token";
import { pipeEventStream, type Repeat } from "./tv/event-stream";
import { redactTvSecrets } from "./tv/tv-redaction";
import { isStreamAnswer, isTvPath, type TvAnswer, type TvHandler } from "./tv/tv-routes";

export interface Handlers {
  readonly library: LibraryHandler;
  readonly tv: TvHandler;
  /** How to end each open event stream, which would otherwise hold the shutdown open. */
  readonly openStreams: Set<() => void>;
}

export interface ServeDependencies {
  readonly repeatEvery: Repeat;
  /** Where a failed request is reported, one line per call. */
  readonly logError: (line: string) => void;
}

/**
 * Answers one request. Every failure, in the handler or in writing the answer, is logged and
 * ends the connection; nothing escapes as a rejection, which would stop the process.
 */
export async function serve(
  handlers: Handlers,
  { repeatEvery, logError }: ServeDependencies,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const method = request.method ?? "";
  const path = (request.url ?? "").split("?")[0] ?? "";
  const fail = (error: unknown) =>
    logError(`${method} ${redactTvSecrets(redactShareTokens(path))} failed: ${describe(error)}`);
  const headers = singleValued(request.headers);
  let answer: TvAnswer;
  let closeAfter = false;
  let destroyAfter = false;
  try {
    const collected = await collectBody(request, maxBodyBytes(path));
    destroyAfter = collected.kind === "tooLargeUnread";
    const body: RequestBody =
      collected.kind === "tooLargeUnread" ? { kind: "tooLarge" } : collected;
    closeAfter = body.kind === "tooLarge";
    const handle = isTvPath(path) ? handlers.tv : handlers.library;
    answer = handle({ method, path, headers, body });
  } catch (error) {
    fail(error);
    answer = errorResponse(
      HTTP_STATUS.internalError,
      "internalError",
      "the library service failed; its log says why",
    );
  }
  try {
    if (isStreamAnswer(answer)) {
      const end = pipeEventStream(answer, response, repeatEvery);
      if (end === null) return;
      handlers.openStreams.add(end);
      response.once("close", () => handlers.openStreams.delete(end));
      return;
    }
    response.writeHead(
      answer.status,
      closeAfter ? { ...answer.headers, connection: "close" } : answer.headers,
    );
    // A body left unread past the drain budget would otherwise keep the socket open for the rest.
    response.end(answer.body, () => {
      if (destroyAfter) request.destroy();
    });
  } catch (error) {
    fail(error);
    response.destroy();
  }
}

function singleValued(
  headers: Readonly<Record<string, string | string[] | undefined>>,
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name,
      Array.isArray(value) ? value.join(", ") : value,
    ]),
  );
}

function describe(error: unknown): string {
  return error instanceof Error ? (error.stack ?? error.message) : String(error);
}
