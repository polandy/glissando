/** The library service's settings, read once at start from its environment. */
export interface LibraryConfig {
  /** A writable directory; the database lives in it. */
  readonly dataDir: string;
  /** The loopback port Caddy forwards `/api/library` to. */
  readonly port: number;
}

export type Environment = Readonly<Record<string, string | undefined>>;

const DATA_DIR = "GLISSANDO_DATA_DIR";
const PORT = "GLISSANDO_LIBRARY_PORT";
const KNOWN_SETTINGS = [DATA_DIR, PORT];
/** The names the image owns; any of them the service does not know is a mistake. */
const OWNED_SETTING = /^(GLISSANDO|IMMICH)_/;
const PORT_DIGITS = /^[0-9]+$/;
const HIGHEST_PORT = 65535;

export class InvalidLibraryConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidLibraryConfigError";
  }
}

export function parseLibraryConfig(env: Environment): LibraryConfig {
  const unknown = Object.keys(env).find(
    (name) => OWNED_SETTING.test(name) && !KNOWN_SETTINGS.includes(name),
  );
  if (unknown !== undefined) {
    throw new InvalidLibraryConfigError(
      `unknown setting ${unknown}; the service reads ${KNOWN_SETTINGS.join(" and ")}`,
    );
  }
  return { dataDir: readDataDir(required(env, DATA_DIR)), port: readPort(required(env, PORT)) };
}

function required(env: Environment, name: string): string {
  const value = env[name];
  if (value === undefined) {
    throw new InvalidLibraryConfigError(`${name} is not set; the entrypoint sets it`);
  }
  return value;
}

function readDataDir(value: string): string {
  if (!value.startsWith("/")) {
    throw new InvalidLibraryConfigError(
      `${DATA_DIR}=${JSON.stringify(value)} is not an absolute path; mount a volume and name its path, e.g. /data`,
    );
  }
  return value;
}

function readPort(value: string): number {
  const port = Number(value);
  if (!PORT_DIGITS.test(value) || port < 1 || port > HIGHEST_PORT) {
    throw new InvalidLibraryConfigError(
      `${PORT}=${JSON.stringify(value)} is not a port from 1 to ${HIGHEST_PORT}`,
    );
  }
  return port;
}
