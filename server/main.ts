import { randomBytes, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";
import process from "node:process";
import { DatabaseSync } from "node:sqlite";
import { collectBody } from "./collect-body";
import { InvalidLibraryConfigError, parseLibraryConfig } from "./config";
import { createLibraryHandler, type LibraryHandler } from "./library-handler";
import { errorResponse, HTTP_STATUS, maxBodyBytes } from "./library-http";
import { redactShareTokens } from "./share-token";
import { openSqliteRepository } from "./sqlite-repository";
import { pipeEventStream, type Repeat } from "./tv/event-stream";
import { createTvHub } from "./tv/tv-hub";
import { redactTvSecrets } from "./tv/tv-redaction";
import {
  createTvHandler,
  isStreamAnswer,
  isTvPath,
  type TvAnswer,
  type TvHandler,
} from "./tv/tv-routes";

/**
 * The library service's composition root: the handler on SQLite in the data volume, served on
 * loopback, where Caddy forwards `/api/library` to it (`dev-docs/SERVER_LIBRARY.md`), and the
 * TV remote's sessions in memory beside it (`dev-docs/TV_REMOTE.md`).
 */

const LOOPBACK = "127.0.0.1";
const DATABASE_FILE = "library.sqlite";
const LOG_PREFIX = "glissando-library:";
const SHUTDOWN_SIGNALS = ["SIGTERM", "SIGINT"] as const;
const FAILED_START = 1;

const log = (line: string) => process.stdout.write(`${LOG_PREFIX} ${line}\n`);

const repeatEvery: Repeat = (everyMs, action) => {
  const timer = setInterval(action, everyMs);
  return () => clearInterval(timer);
};

interface Handlers {
  readonly library: LibraryHandler;
  readonly tv: TvHandler;
  /** How to end each open event stream, which would otherwise hold the shutdown open. */
  readonly openStreams: Set<() => void>;
}

function start(): void {
  const config = parseLibraryConfig(process.env);
  const database = new DatabaseSync(join(config.dataDir, DATABASE_FILE));
  const repository = openSqliteRepository(database, log);
  const now = () => Date.now();
  const handlers: Handlers = {
    library: createLibraryHandler({ repository, now, newId: randomUUID, randomBytes, log }),
    tv: createTvHandler({ repository, hub: createTvHub({ now, randomBytes }), log }),
    openStreams: new Set(),
  };
  const server = createServer((request, response) => void serve(handlers, request, response));
  server.listen(config.port, LOOPBACK, () => log(`listening on ${LOOPBACK}:${config.port}`));
  for (const signal of SHUTDOWN_SIGNALS) {
    process.on(signal, () => {
      server.close(() => {
        database.close();
        process.exit(0);
      });
      for (const end of handlers.openStreams) end();
    });
  }
}

async function serve(
  handlers: Handlers,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const method = request.method ?? "";
  const path = (request.url ?? "").split("?")[0] ?? "";
  const headers = singleValued(request.headers);
  let answer: TvAnswer;
  let closeAfter = false;
  try {
    const body = await collectBody(request, maxBodyBytes(path));
    closeAfter = body.kind === "tooLarge";
    const handle = isTvPath(path) ? handlers.tv : handlers.library;
    answer = handle({ method, path, headers, body });
  } catch (error) {
    const redacted = redactTvSecrets(redactShareTokens(path));
    process.stderr.write(`${LOG_PREFIX} ${method} ${redacted} failed: ${describe(error)}\n`);
    answer = errorResponse(
      HTTP_STATUS.internalError,
      "internalError",
      "the library service failed; its log says why",
    );
  }
  if (isStreamAnswer(answer)) {
    const end = pipeEventStream(answer, response, repeatEvery);
    handlers.openStreams.add(end);
    response.once("close", () => handlers.openStreams.delete(end));
    return;
  }
  response.writeHead(
    answer.status,
    closeAfter ? { ...answer.headers, connection: "close" } : answer.headers,
  );
  response.end(answer.body);
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

try {
  start();
} catch (error) {
  if (error instanceof InvalidLibraryConfigError) {
    process.stderr.write(`${LOG_PREFIX} ${error.message}\n`);
    process.exit(FAILED_START);
  }
  throw error;
}
