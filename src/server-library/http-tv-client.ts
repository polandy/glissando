import { ServerLibraryUnavailableError } from "./server-library-client";
import { TvRefusedError, type TvClient, type TvRefusal } from "./tv-client";

const CLAIM_PATH = "api/library/tv/claim";
const JSON_MEDIA_TYPE = "application/json";
const HTTP_SERVER_ERROR = 500;
/** 16 random bytes as base64url without padding. */
const REMOTE_SECRET = /^[A-Za-z0-9_-]{22}$/;
const REFUSALS: readonly TvRefusal[] = ["noSuchCode", "noSuchTv", "notFound", "boundToLink"];
/** A disconnect answered with these finds the session already over, or its TV gone. */
const DISCONNECT_DONE = new Set(["noSuchTv", "tvAway"]);
const DISCONNECT = { type: "disconnect" } as const;

export interface HttpTvClientOptions {
  /** Where the app is served, e.g. `new URL("./", location.href)`; the API is under it. */
  readonly appUrl: string | URL;
  readonly fetch: typeof fetch;
}

/** `TvClient` over the self-hosted Glissando's `./api/library/tv` and `./api/tv` routes. */
export class HttpTvClient implements TvClient {
  readonly #appUrl: URL;
  readonly #fetch: typeof fetch;

  constructor(options: HttpTvClientOptions) {
    this.#appUrl = new URL(options.appUrl);
    this.#fetch = options.fetch;
  }

  async claim(code: string): Promise<string> {
    const response = await this.#post(CLAIM_PATH, { code });
    await check(CLAIM_PATH, response);
    const answer: unknown = await response.json();
    const secret = isRecord(answer) ? answer["remoteSecret"] : undefined;
    if (typeof secret !== "string" || !REMOTE_SECRET.test(secret)) {
      throw new Error(
        `${CLAIM_PATH} answered "remoteSecret" that is not 22 characters of base64url (got ${JSON.stringify(secret)}); the app and the Glissando server differ in version`,
      );
    }
    return secret;
  }

  async show(remoteSecret: string, slideshowId: string): Promise<void> {
    const path = `api/library/tv/${encodeURIComponent(remoteSecret)}/show`;
    await check(path, await this.#post(path, { slideshowId }));
  }

  async disconnect(remoteSecret: string): Promise<void> {
    const path = `api/tv/remote/${encodeURIComponent(remoteSecret)}/command`;
    const response = await this.#post(path, DISCONNECT);
    if (!response.ok && DISCONNECT_DONE.has((await refusal(response)).code)) return;
    await check(path, response);
  }

  async #post(path: string, body: object): Promise<Response> {
    try {
      return await this.#fetch(new URL(path, this.#appUrl).href, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": JSON_MEDIA_TYPE },
        // A redirect is the owner's forward auth asking for a new sign-in, never an answer.
        redirect: "manual",
      });
    } catch (error) {
      // fetch rejects with a TypeError exactly when the network request itself fails.
      if (error instanceof TypeError) {
        throw new ServerLibraryUnavailableError(`POST ${path}`, { cause: error });
      }
      throw error;
    }
  }
}

/** Throws the typed error a failed answer stands for. */
async function check(path: string, response: Response): Promise<void> {
  if (response.ok) return;
  const request = `POST ${path}`;
  if (response.status === 0 || response.status >= HTTP_SERVER_ERROR) {
    throw new ServerLibraryUnavailableError(`${request} (${String(response.status)})`);
  }
  const { code, detail } = await refusal(response);
  const known = REFUSALS.find((candidate) => candidate === code);
  if (known !== undefined) throw new TvRefusedError(request, known);
  throw new Error(
    `the Glissando server refused ${request} (${String(response.status)} ${code}): ${detail}`,
  );
}

/** The `error` code and `detail` a refusal names; reads the body. */
async function refusal(response: Response): Promise<{ code: string; detail: string }> {
  const isJson = response.headers.get("content-type")?.startsWith(JSON_MEDIA_TYPE) ?? false;
  const answer: unknown = isJson ? await response.json() : {};
  if (!isRecord(answer)) return { code: "", detail: "" };
  return { code: String(answer["error"]), detail: String(answer["detail"]) };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
