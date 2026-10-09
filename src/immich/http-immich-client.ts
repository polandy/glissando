import {
  ImmichUnavailableError,
  type ImmichAlbum,
  type ImmichClient,
  type ImmichFace,
  type ImmichPhoto,
  type ImmichPhotoPage,
  type ImmichStatus,
  type ImmichThumbnailSize,
  type ImmichUnavailableKind,
} from "./immich-client";
import { ImmichJsonReader } from "./immich-json";

/** Photos per page of a library or album listing. */
export const PAGE_SIZE = 60;

const PATH_SEPARATOR = "/";
const VERSION_PATH = "api/server/version";
const ALBUMS_PATH = "api/albums";
const SEARCH_PATH = "api/search/metadata";
const FACES_PATH = "api/faces";
const IMAGE_ASSET_TYPE = "IMAGE";
const NEWEST_FIRST = "desc";
const LIST_THUMBNAIL_SIZE: ImmichThumbnailSize = "thumbnail";
const JSON_MEDIA_TYPE = "application/json";
/** What `fetch` returns for a redirect under `redirect: "manual"`. */
const OPAQUE_REDIRECT = "opaqueredirect";
const HTTP_NOT_FOUND = 404;

/** Answers of the Glissando server or Immich that the user is told as an `ImmichStatus`. */
const UNAVAILABLE_BY_HTTP_STATUS: ReadonlyMap<number, ImmichUnavailableKind> = new Map([
  [401, "keyRejected"],
  [403, "permissionMissing"],
  [502, "unreachable"],
  [503, "unreachable"],
  [504, "unreachable"],
]);

export interface HttpImmichClientOptions {
  /** The self-hosted Glissando's Immich route, e.g. `new URL("./immich/", appAddress)`. */
  readonly baseUrl: string | URL;
  readonly fetch: typeof fetch;
}

type HttpMethod = "GET" | "POST";

/** `ImmichClient` over the self-hosted Glissando's `/immich/` route (ADR-0013). */
export class HttpImmichClient implements ImmichClient {
  readonly #baseUrl: URL;
  readonly #fetch: typeof fetch;

  constructor(options: HttpImmichClientOptions) {
    this.#baseUrl = new URL(options.baseUrl);
    if (!this.#baseUrl.pathname.endsWith(PATH_SEPARATOR)) {
      throw new Error(
        `the Immich base URL ${this.#baseUrl.href} must end with "/", e.g. ${this.#baseUrl.href}/`,
      );
    }
    this.#fetch = options.fetch;
  }

  async status(): Promise<ImmichStatus> {
    try {
      const version = await this.#serverVersion();
      if (version === null) return { kind: "notSetUp" };
      const albums = await this.albums();
      return { kind: "available", version, albumCount: albums.length };
    } catch (error) {
      if (error instanceof ImmichUnavailableError) return { kind: error.kind };
      throw error;
    }
  }

  async albums(): Promise<readonly ImmichAlbum[]> {
    const reader = new ImmichJsonReader(`GET ${ALBUMS_PATH}`);
    const answer = await this.#json("GET", ALBUMS_PATH);
    return reader.array(answer, "a body").map((value) => {
      const album = reader.record(value, "an album");
      return {
        id: reader.string(album, "id"),
        name: reader.string(album, "albumName"),
        photoCount: reader.number(album, "assetCount"),
        coverId: reader.optionalString(album, "albumThumbnailAssetId"),
        startDate: reader.optionalString(album, "startDate"),
        endDate: reader.optionalString(album, "endDate"),
      };
    });
  }

  async photos(query: {
    readonly page: number;
    readonly albumId?: string;
  }): Promise<ImmichPhotoPage> {
    const reader = new ImmichJsonReader(`POST ${SEARCH_PATH}`);
    const answer = await this.#json("POST", SEARCH_PATH, {
      type: IMAGE_ASSET_TYPE,
      order: NEWEST_FIRST,
      size: PAGE_SIZE,
      page: query.page,
      ...(query.albumId === undefined ? {} : { albumIds: [query.albumId] }),
    });
    const assets = reader.record(reader.record(answer, "a body").assets, '"assets"');
    const photos = reader.array(assets.items, '"assets.items"').map((value): ImmichPhoto => {
      const asset = reader.record(value, "an asset");
      return {
        id: reader.string(asset, "id"),
        fileName: reader.string(asset, "originalFileName"),
        takenAt: reader.string(asset, "localDateTime"),
      };
    });
    return { photos, nextPage: reader.optionalCountingString(assets, "nextPage") };
  }

  thumbnailUrl(photoId: string): string {
    return this.#url(thumbnailPath(photoId, LIST_THUMBNAIL_SIZE)).href;
  }

  async thumbnail(photoId: string, size: ImmichThumbnailSize): Promise<Blob> {
    return (await this.#request("GET", thumbnailPath(photoId, size))).blob();
  }

  async original(photoId: string): Promise<Blob> {
    return (await this.#request("GET", `${assetPath(photoId)}/original`)).blob();
  }

  async faces(photoId: string): Promise<readonly ImmichFace[]> {
    const path = `${FACES_PATH}?id=${encodeURIComponent(photoId)}`;
    const reader = new ImmichJsonReader(`GET ${path}`);
    const answer = await this.#json("GET", path);
    return reader.array(answer, "a body").map((value) => {
      const face = reader.record(value, "a face");
      return {
        imageWidth: reader.number(face, "imageWidth"),
        imageHeight: reader.number(face, "imageHeight"),
        x1: reader.number(face, "boundingBoxX1"),
        y1: reader.number(face, "boundingBoxY1"),
        x2: reader.number(face, "boundingBoxX2"),
        y2: reader.number(face, "boundingBoxY2"),
      };
    });
  }

  /** Immich's version, or null when the route is not Immich (no route, or a static host). */
  async #serverVersion(): Promise<string | null> {
    const response = await this.#send("GET", VERSION_PATH);
    if (response.status === HTTP_NOT_FOUND) return null;
    this.#check("GET", VERSION_PATH, response);
    if (!isJson(response)) return null;
    const reader = new ImmichJsonReader(`GET ${VERSION_PATH}`);
    const version = reader.record(await response.json(), "a body");
    return [
      reader.number(version, "major"),
      reader.number(version, "minor"),
      reader.number(version, "patch"),
    ].join(".");
  }

  async #json(method: HttpMethod, path: string, body?: object): Promise<unknown> {
    const response = await this.#request(method, path, body);
    if (!isJson(response)) {
      throw new Error(
        `${method} ${path} answered ${response.headers.get("content-type") ?? "no content type"}, ` +
          `not ${JSON_MEDIA_TYPE}; is the Glissando server's /immich/ route pointing at Immich?`,
      );
    }
    return response.json();
  }

  async #request(method: HttpMethod, path: string, body?: object): Promise<Response> {
    const response = await this.#send(method, path, body);
    this.#check(method, path, response);
    return response;
  }

  async #send(method: HttpMethod, path: string, body?: object): Promise<Response> {
    try {
      return await this.#fetch(this.#url(path).href, {
        method,
        // A redirect is the owner's forward auth asking for a new sign-in, never an answer.
        redirect: "manual",
        ...(body === undefined
          ? {}
          : { headers: { "content-type": JSON_MEDIA_TYPE }, body: JSON.stringify(body) }),
      });
    } catch (error) {
      // fetch rejects with a TypeError exactly when the network request itself fails.
      if (error instanceof TypeError) throw new ImmichUnavailableError("offline", { cause: error });
      throw error;
    }
  }

  #check(method: HttpMethod, path: string, response: Response): void {
    if (response.type === OPAQUE_REDIRECT) throw new ImmichUnavailableError("signInExpired");
    if (response.ok) return;
    const kind = UNAVAILABLE_BY_HTTP_STATUS.get(response.status);
    if (kind !== undefined) throw new ImmichUnavailableError(kind);
    throw new Error(`${method} ${path} answered ${String(response.status)}`);
  }

  #url(path: string): URL {
    return new URL(path, this.#baseUrl);
  }
}

function assetPath(photoId: string): string {
  return `api/assets/${encodeURIComponent(photoId)}`;
}

function thumbnailPath(photoId: string, size: ImmichThumbnailSize): string {
  return `${assetPath(photoId)}/thumbnail?size=${size}`;
}

function isJson(response: Response): boolean {
  return response.headers.get("content-type")?.startsWith(JSON_MEDIA_TYPE) ?? false;
}
