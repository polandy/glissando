import type { MusicBeats } from "../beats";
import { parseMusicBeats } from "../beats/music-beats-json";
import type { MusicLoudness } from "../loudness";
import { musicLoudnessToJson, parseMusicLoudness } from "../loudness";
import type { StoredFocus } from "../library/picture-focus";
import { readStoredFocus } from "../library/read-stored-focus";
import type { ServerDocument } from "./server-document";
import {
  ServerLibraryNotFoundError,
  ServerLibraryRefusedError,
  ServerLibraryUnavailableError,
  ServerRevisionChangedError,
  type ServerLibraryClient,
  type ServerSlideshowCreated,
  type ServerSlideshowRecord,
  type ShareLink,
} from "./server-library-client";
import {
  field,
  isJson,
  isRecord,
  JSON_MEDIA_TYPE,
  mismatch,
  readRecord,
  readShareLink,
  refusal,
  revision,
  text,
} from "./server-library-wire-values";

const LIBRARY_PATH = "api/library";
const SLIDESHOWS_PATH = `${LIBRARY_PATH}/slideshows`;
const MUSIC_PATH = `${LIBRARY_PATH}/music`;
/** Under a music's path: the beats a device found in it. */
const BEATS_SUFFIX = "/beats";
/** Under a music's path: the loudness a device measured for it. */
const LOUDNESS_SUFFIX = "/loudness";
/** Under a slideshow's path: the stored focus of its pictures (ADR-0041). */
const FOCUS_SUFFIX = "/focus";
const DISCOVERY_SERVICE = "glissando-library";
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_PRECONDITION_FAILED = 412;
const HTTP_SERVER_ERROR = 500;
/** Under a slideshow's path: its link (share_link/HTTP_API.md, Private). */
const SHARE_SUFFIX = "/share";
/** The 404 code of a link that is already off. */
const NOT_SHARED = "notShared";

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
    const path = musicPath(musicId);
    const response = await this.#send("GET", path);
    await check("GET", path, response);
    return response.blob();
  }

  async musicBeats(musicId: string): Promise<MusicBeats | undefined> {
    const path = `${musicPath(musicId)}${BEATS_SUFFIX}`;
    const answer = field(await this.#json("GET", path), "beats", path);
    if (answer === null) return undefined;
    const beats = parseMusicBeats(answer);
    if (beats === undefined) throw mismatch(path, "beats", "the beats of a piece of music", answer);
    return beats;
  }

  async putMusicBeats(musicId: string, beats: MusicBeats): Promise<void> {
    const path = `${musicPath(musicId)}${BEATS_SUFFIX}`;
    const response = await this.#send("PUT", path, {
      body: JSON.stringify(beats),
      headers: { "content-type": JSON_MEDIA_TYPE },
    });
    await check("PUT", path, response);
  }

  async musicLoudness(musicId: string): Promise<MusicLoudness | undefined> {
    const path = `${musicPath(musicId)}${LOUDNESS_SUFFIX}`;
    const answer = field(await this.#json("GET", path), "loudness", path);
    if (answer === null) return undefined;
    try {
      return parseMusicLoudness(answer);
    } catch (error) {
      throw new Error(
        `${path} answered "loudness" that is not the loudness of a piece of music ` +
          `(${(error as Error).message}); the app and the Glissando server's library service differ in version`,
        { cause: error },
      );
    }
  }

  async putMusicLoudness(musicId: string, loudness: MusicLoudness): Promise<void> {
    const path = `${musicPath(musicId)}${LOUDNESS_SUFFIX}`;
    const response = await this.#send("PUT", path, {
      body: JSON.stringify(musicLoudnessToJson(loudness)),
      headers: { "content-type": JSON_MEDIA_TYPE },
    });
    await check("PUT", path, response);
  }

  async slideshowFocus(slideshowId: string): Promise<ReadonlyMap<string, StoredFocus>> {
    const path = `${slideshowPath(slideshowId)}${FOCUS_SUFFIX}`;
    const answer = field(await this.#json("GET", path), "focus", path);
    if (!isRecord(answer)) throw mismatch(path, "focus", "an object of StoredFocus", answer);
    const result = new Map<string, StoredFocus>();
    for (const [assetId, value] of Object.entries(answer)) {
      result.set(assetId, readStoredFocus(value, `${path}.${assetId}`));
    }
    return result;
  }

  async putPictureFocus(
    slideshowId: string,
    assetId: string,
    stored: StoredFocus,
  ): Promise<"stored" | "newerKept"> {
    const path = `${slideshowPath(slideshowId)}${FOCUS_SUFFIX}/${encodeURIComponent(assetId)}`;
    const response = await this.#send("PUT", path, {
      body: JSON.stringify(stored),
      headers: { "content-type": JSON_MEDIA_TYPE },
    });
    if (response.status === HTTP_CONFLICT) return "newerKept";
    await check("PUT", path, response);
    return "stored";
  }

  /** The slideshow's link; null while it is not shared. */
  async shareOf(id: string): Promise<ShareLink | null> {
    const path = slideshowPath(id);
    const share = field(await this.#json("GET", path), "share", path);
    return share === null ? null : readShareLink(share, path);
  }

  /** Makes the slideshow's link, or answers the one it has. */
  async share(id: string): Promise<ShareLink> {
    const path = `${slideshowPath(id)}${SHARE_SUFFIX}`;
    return readShareLink(await this.#json("POST", path, jsonBody({})), path);
  }

  /** Deletes the slideshow's link; a link already off stays off. */
  async unshare(id: string): Promise<void> {
    const path = `${slideshowPath(id)}${SHARE_SUFFIX}`;
    const response = await this.#send("DELETE", path);
    if (response.status === HTTP_NOT_FOUND && (await refusal(response)).code === NOT_SHARED) return;
    await check("DELETE", path, response);
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

function musicPath(id: string): string {
  return `${MUSIC_PATH}/${encodeURIComponent(id)}`;
}

function slideshowPath(id: string): string {
  return `${SLIDESHOWS_PATH}/${encodeURIComponent(id)}`;
}

function jsonBody(document: ServerDocument | Record<string, never>): RequestInit {
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
  const { code, detail } = await refusal(response);
  const refused = path.startsWith(MUSIC_PATH)
    ? "music"
    : path.includes(FOCUS_SUFFIX)
      ? "focus"
      : "slideshow";
  throw new ServerLibraryRefusedError(request, response.status, code, detail, refused);
}
