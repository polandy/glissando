import { randomBytes, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { join } from "node:path";
import process from "node:process";
import { DatabaseSync } from "node:sqlite";
import { InvalidLibraryConfigError, parseLibraryConfig } from "./config";
import { createLibraryHandler } from "./library-handler";
import { openSqliteRepository } from "./sqlite-repository";
import { serve, type Handlers } from "./serve";
import type { Repeat } from "./tv/event-stream";
import { createTvHub } from "./tv/tv-hub";
import { createTvHandler } from "./tv/tv-routes";

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

const logError = (line: string) => process.stderr.write(`${LOG_PREFIX} ${line}\n`);

const repeatEvery: Repeat = (everyMs, action) => {
  const timer = setInterval(action, everyMs);
  return () => clearInterval(timer);
};

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
  const dependencies = { repeatEvery, logError };
  const server = createServer(
    (request, response) => void serve(handlers, dependencies, request, response),
  );
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

try {
  start();
} catch (error) {
  if (error instanceof InvalidLibraryConfigError) {
    process.stderr.write(`${LOG_PREFIX} ${error.message}\n`);
    process.exit(FAILED_START);
  }
  throw error;
}
