import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";
import process from "node:process";
import { DatabaseSync } from "node:sqlite";
import { collectBody } from "./collect-body";
import { InvalidLibraryConfigError, parseLibraryConfig } from "./config";
import { createLibraryHandler, type LibraryHandler } from "./library-handler";
import { errorResponse, HTTP_STATUS, maxBodyBytes, type LibraryResponse } from "./library-http";
import { openSqliteRepository } from "./sqlite-repository";

/**
 * The library service's composition root: the handler on SQLite in the data volume, served on
 * loopback, where Caddy forwards `/api/library` to it (`dev-docs/SERVER_LIBRARY.md`).
 */

const LOOPBACK = "127.0.0.1";
const DATABASE_FILE = "library.sqlite";
const LOG_PREFIX = "glissando-library:";
const SHUTDOWN_SIGNALS = ["SIGTERM", "SIGINT"] as const;
const FAILED_START = 1;

const log = (line: string) => process.stdout.write(`${LOG_PREFIX} ${line}\n`);

function start(): void {
  const config = parseLibraryConfig(process.env);
  const database = new DatabaseSync(join(config.dataDir, DATABASE_FILE));
  const handle = createLibraryHandler({
    repository: openSqliteRepository(database),
    now: () => Date.now(),
    newId: randomUUID,
    log,
  });
  const server = createServer((request, response) => void serve(handle, request, response));
  server.listen(config.port, LOOPBACK, () => log(`listening on ${LOOPBACK}:${config.port}`));
  for (const signal of SHUTDOWN_SIGNALS) {
    process.on(signal, () =>
      server.close(() => {
        database.close();
        process.exit(0);
      }),
    );
  }
}

async function serve(
  handle: LibraryHandler,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const method = request.method ?? "";
  const path = (request.url ?? "").split("?")[0] ?? "";
  const headers = singleValued(request.headers);
  let answer: LibraryResponse;
  let closeAfter = false;
  try {
    const body = await collectBody(request, maxBodyBytes(path));
    closeAfter = body.kind === "tooLarge";
    answer = handle({ method, path, headers, body });
  } catch (error) {
    process.stderr.write(`${LOG_PREFIX} ${method} ${path} failed: ${describe(error)}\n`);
    answer = errorResponse(
      HTTP_STATUS.internalError,
      "internalError",
      "the library service failed; its log says why",
    );
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
