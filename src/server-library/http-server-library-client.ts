import { readServerDocument, type ServerDocument } from "./server-document";
import {
  ServerLibraryNotFoundError,
  ServerLibraryRefusedError,
  ServerLibraryUnavailableError,
  ServerRevisionChangedError,
  type ServerLibraryClient,
  type ServerSlideshowCreated,
  type ServerSlideshowRecord,
} from "./server-library-client";

const LIBRARY_PATH = "api/library";
const SLIDESHOWS_PATH = `${LIBRARY_PATH}/slideshows`;
const MUSIC_PATH = `${LIBRARY_PATH}/music`;
const DISCOVERY_SERVICE = "glissando-library";
const JSON_MEDIA_TYPE = "application/json";
const HTTP_NOT_FOUND = 404;
const HTTP_PRECONDITION_FAILED = 412;
const HTTP_SERVER_ERROR = 500;

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface HttpServerLibraryClientOptions {
  /** Where the app is served, e.g. `new URL("./", location.href)`; the API is under it. */
  readonly appUrl: string | URL;
  readonly fetch: typeof fetch;
}

/** `ServerLibraryClient` over the self-hosted Glissando's `./api/library` route. */
export class HttpServerLibraryClient implements ServerLibraryClient {
  readonly #appUrl: URL;
  readonly #fetch: typeof fetch;

  constructor(options: HttpServerLibraryClientOptions) {
    this.#appUrl = new URL(options.appUrl);
    this.#fetch = options.fetch;
  }

  async discover(): Promise<boolean> {
    const response = await this.#send("GET", LIBRARY_PATH);
    if (!response.ok || !isJson(response)) return false;
    const answer: unknown = await response.json();
    return isRecord(answer) && answer["service"] === DISCOVERY_SERVICE;
  }

  async listSlideshows(): Promise<readonly ServerSlideshowRecord[]> {
    const answer = await this.#json("GET", SLIDESHOWS_PATH);
    const list = field(answer, "slideshows", SLIDESHOWS_PATH);
    if (!Array.isArray(list)) throw mismatch(SLIDESHOWS_PATH, "slideshows", "an array", list);
    return list.map((record: unknown) => readRecord(record, SLIDESHOWS_PATH));
  }

  async getSlideshow(id: string): Promise<ServerSlideshowRecord> {
    const path = slideshowPath(id);
    return readRecord(await this.#json("GET", path), path);
  }

  async createSlideshow(document: ServerDocument): Promise<ServerSlideshowCreated> {
    const answer = await this.#json("POST", SLIDESHOWS_PATH, jsonBody(document));
    return {
      id: text(answer, "id", SLIDESHOWS_PATH),
      revision: revision(answer, SLIDESHOWS_PATH),
    };
  }

  async replaceSlideshow(id: string, current: number, document: ServerDocument): Promise<number> {
    const path = slideshowPath(id);
    const response = await this.#send("PUT", path, {
      ...jsonBody(document),
      headers: { "content-type": JSON_MEDIA_TYPE, "if-match": `"${String(current)}"` },
    });
    if (response.status === HTTP_PRECONDITION_FAILED) {
      const answer: unknown = await response.json();
      throw new ServerRevisionChangedError(readRecord(field(answer, "current", path), path));
    }
    await check("PUT", path, response);
    return revision(await response.json(), path);
  }

  async deleteSlideshow(id: string): Promise<void> {
    const path = slideshowPath(id);
    await check("DELETE", path, await this.#send("DELETE", path));
  }

  async uploadMusic(audio: Blob, mimeType: string): Promise<string> {
    const answer = await this.#json("POST", MUSIC_PATH, {
      body: audio,
      headers: { "content-type": mimeType },
    });
    return text(answer, "musicId", MUSIC_PATH);
  }

  async music(musicId: string): Promise<Blob> {
    const path = `${MUSIC_PATH}/${encodeURIComponent(musicId)}`;
    const response = await this.#send("GET", path);
    await check("GET", path, response);
    return response.blob();
  }

  async #json(method: HttpMethod, path: string, init: RequestInit = {}): Promise<unknown> {
    const response = await this.#send(method, path, init);
    await check(method, path, response);
    if (!isJson(response)) {
      throw new Error(
        `${method} ${path} answered ${response.headers.get("content-type") ?? "no content type"}, ` +
          `not ${JSON_MEDIA_TYPE}; is the Glissando server's /api/library route pointing at its library service?`,
      );
    }
    return response.json();
  }

  async #send(method: HttpMethod, path: string, init: RequestInit = {}): Promise<Response> {
    try {
      return await this.#fetch(new URL(path, this.#appUrl).href, {
        ...init,
        method,
        // A redirect is the owner's forward auth asking for a new sign-in, never an answer.
        redirect: "manual",
      });
    } catch (error) {
      // fetch rejects with a TypeError exactly when the network request itself fails.
      if (error instanceof TypeError) {
        throw new ServerLibraryUnavailableError(`${method} ${path}`, { cause: error });
      }
      throw error;
    }
  }
}

function slideshowPath(id: string): string {
  return `${SLIDESHOWS_PATH}/${encodeURIComponent(id)}`;
}

function jsonBody(document: ServerDocument): RequestInit {
  return { body: JSON.stringify(document), headers: { "content-type": JSON_MEDIA_TYPE } };
}

/** Throws the typed error a failed answer stands for. */
async function check(method: HttpMethod, path: string, response: Response): Promise<void> {
  if (response.ok) return;
  const request = `${method} ${path}`;
  if (response.status === 0 || response.status >= HTTP_SERVER_ERROR) {
    throw new ServerLibraryUnavailableError(`${request} (${String(response.status)})`);
  }
  if (response.status === HTTP_NOT_FOUND) throw new ServerLibraryNotFoundError(request);
  const answer: unknown = isJson(response) ? await response.json() : {};
  const code = isRecord(answer) ? String(answer["error"]) : "unknown";
  const detail = isRecord(answer) ? String(answer["detail"]) : "";
  const refused = path.startsWith(MUSIC_PATH) ? "music" : "slideshow";
  throw new ServerLibraryRefusedError(request, response.status, code, detail, refused);
}

function readRecord(value: unknown, path: string): ServerSlideshowRecord {
  return {
    id: text(value, "id", path),
    revision: revision(value, path),
    document: readServerDocument(field(value, "document", path)),
  };
}

function revision(value: unknown, path: string): number {
  const answer = field(value, "revision", path);
  if (typeof answer !== "number" || !Number.isInteger(answer) || answer < 1) {
    throw mismatch(path, "revision", "a positive whole number", answer);
  }
  return answer;
}

function text(value: unknown, name: string, path: string): string {
  const answer = field(value, name, path);
  if (typeof answer !== "string") throw mismatch(path, name, "a string", answer);
  return answer;
}

function field(value: unknown, name: string, path: string): unknown {
  if (!isRecord(value)) throw mismatch(path, name, "inside an object", value);
  return value[name];
}

function mismatch(path: string, name: string, expected: string, got: unknown): Error {
  return new Error(
    `${path} answered "${name}" that is not ${expected} (got ${JSON.stringify(got)}); the app and the Glissando server's library service differ in version`,
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJson(response: Response): boolean {
  return response.headers.get("content-type")?.startsWith(JSON_MEDIA_TYPE) ?? false;
}
