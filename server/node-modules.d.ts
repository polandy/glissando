/**
 * The parts of Node's modules the library service uses. The project's types describe the
 * browser only, so the service declares what it uses rather than pull in all of Node's types.
 */

declare module "node:sqlite" {
  export type SQLInputValue = null | number | bigint | string | Uint8Array;
  export type SQLOutputValue = null | number | bigint | string | Uint8Array;

  export interface StatementSync {
    run(...parameters: SQLInputValue[]): { changes: number | bigint };
    get(...parameters: SQLInputValue[]): Record<string, SQLOutputValue> | undefined;
    all(...parameters: SQLInputValue[]): Record<string, SQLOutputValue>[];
  }

  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}

declare module "node:http" {
  export interface IncomingMessage extends AsyncIterable<Uint8Array> {
    readonly method?: string;
    readonly url?: string;
    readonly headers: Readonly<Record<string, string | string[] | undefined>>;
    destroy(): void;
  }

  export interface ServerResponse {
    writeHead(status: number, headers: Readonly<Record<string, string>>): void;
    end(body?: Uint8Array | string): void;
  }

  export interface Server {
    listen(port: number, host: string, listening: () => void): void;
    close(closed: () => void): void;
  }

  export function createServer(
    listener: (request: IncomingMessage, response: ServerResponse) => void,
  ): Server;
}

declare module "node:crypto" {
  export function randomUUID(): string;
}

declare module "node:path" {
  export function join(...parts: string[]): string;
}

declare module "node:process" {
  const process: {
    readonly env: Readonly<Record<string, string | undefined>>;
    readonly stdout: { write(text: string): void };
    readonly stderr: { write(text: string): void };
    exit(code: number): never;
    on(signal: "SIGTERM" | "SIGINT", handler: () => void): void;
  };
  export default process;
}
