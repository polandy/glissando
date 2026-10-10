import {
  ImmichRequestFailedError,
  ImmichUnavailableError,
  type ImmichClient,
  type ImmichUnavailableKind,
} from "../immich/immich-client";
import { focusFromFaces } from "../immich/immich-focus";
import type { DecodedPicture } from "../import/downscale";
import { decodeImmichPhoto } from "../import/immich-picture-source";
import type { PictureFocus } from "../library/picture-focus";
import {
  MediaNotFoundError,
  SlideshowNotFoundError,
  type SlideshowStore,
  type StoredSlideshow,
} from "../library/stored-slideshow";
import { serverDocumentFor, storedSlideshowFrom } from "./server-document";
import {
  ServerLibraryNotFoundError,
  ServerRevisionChangedError,
  type ServerLibraryClient,
  type ServerSlideshowRecord,
} from "./server-library-client";

const HTTP_NOT_FOUND = 404;
const THUMBNAIL_SIZE = "thumbnail";

export interface ServerSlideshowStoreOptions {
  readonly client: ServerLibraryClient;
  readonly immich: Pick<ImmichClient, "original" | "thumbnail" | "faces">;
  /** Rejects with `UnreadablePictureError` for a file it cannot decode (`decodePicture`). */
  decode(file: File): Promise<DecodedPicture>;
  /** Tells the app why Immich cannot be used (`ImmichAvailability.report`). */
  reportUnavailable(kind: ImmichUnavailableKind): void;
  /** Logs a failure the store handles itself, e.g. faces Immich could not give. */
  log(error: unknown): void;
}

/** A slideshow as last read from or saved on the server, with the revision that names it. */
interface SeenSlideshow {
  readonly revision: number;
  readonly slideshow: StoredSlideshow;
}

/**
 * Server slideshows behind the store slices the app shows and plays them with
 * (`dev-docs/SERVER_LIBRARY.md`, Playing and exporting). Every edit names the revision last seen
 * and edits are applied one at a time, so a conflict loses at most that edit (ADR-0018).
 * Pictures are Immich assets: the display rendition is made on the device, nothing is kept.
 */
export class ServerSlideshowStore implements SlideshowStore {
  readonly #options: ServerSlideshowStoreOptions;
  readonly #seen = new Map<string, SeenSlideshow>();
  /** By picture: Immich's focus asked for, or one put, for this session; null: none found. */
  readonly #focus = new Map<string, Promise<PictureFocus | null>>();
  /** The edit under way; the next one starts once it has settled. */
  #edits: Promise<unknown> = Promise.resolve();

  constructor(options: ServerSlideshowStoreOptions) {
    this.#options = options;
  }

  async listSlideshows(): Promise<readonly StoredSlideshow[]> {
    const records = await this.#options.client.listSlideshows();
    return records.map((record) => this.#remember(record));
  }

  async getSlideshow(id: string): Promise<StoredSlideshow> {
    return (await this.#read(id)).slideshow;
  }

  updateSlideshow(slideshow: StoredSlideshow): Promise<void> {
    return this.#serialized(async () => {
      const { revision } = await this.#lastSeen(slideshow.id);
      await this.#replace(slideshow, revision);
    });
  }

  updateSlideshowWith(
    id: string,
    edit: (current: StoredSlideshow) => StoredSlideshow,
  ): Promise<StoredSlideshow> {
    return this.#serialized(async () => {
      const seen = await this.#lastSeen(id);
      const edited = edit(seen.slideshow);
      await this.#replace(edited, seen.revision);
      return edited;
    });
  }

  async deleteSlideshow(id: string): Promise<void> {
    await this.#notFoundAs(id, () => this.#options.client.deleteSlideshow(id));
    this.#seen.delete(id);
  }

  async pictureBlob(id: string): Promise<Blob> {
    const { immich, decode } = this.#options;
    // The asset id names the file: the store knows no file name by picture id.
    const decoded = await this.#fromImmich(id, () =>
      decodeImmichPhoto({ id, fileName: id }, { client: immich, decode }),
    );
    return decoded.display;
  }

  thumbnailBlob(id: string): Promise<Blob> {
    return this.#fromImmich(id, () => this.#options.immich.thumbnail(id, THUMBNAIL_SIZE));
  }

  async musicBlob(id: string): Promise<Blob> {
    try {
      return await this.#options.client.music(id);
    } catch (error) {
      if (error instanceof ServerLibraryNotFoundError) throw new MediaNotFoundError(id);
      throw error;
    }
  }

  async pictureFocus(pictureIds: readonly string[]): Promise<ReadonlyMap<string, PictureFocus>> {
    const found = await Promise.all(
      pictureIds.map(async (id) => [id, await this.#focusOf(id)] as const),
    );
    return new Map(
      found.filter((entry): entry is readonly [string, PictureFocus] => entry[1] !== null),
    );
  }

  putPictureFocus(pictureId: string, focus: PictureFocus): Promise<void> {
    this.#focus.set(pictureId, Promise.resolve(focus));
    return Promise.resolve();
  }

  #serialized<T>(edit: () => Promise<T>): Promise<T> {
    const result = this.#edits.then(edit, edit);
    this.#edits = result.catch(() => undefined);
    return result;
  }

  async #lastSeen(id: string): Promise<SeenSlideshow> {
    return this.#seen.get(id) ?? this.#read(id);
  }

  async #read(id: string): Promise<SeenSlideshow> {
    const record = await this.#notFoundAs(id, () => this.#options.client.getSlideshow(id));
    this.#remember(record);
    return this.#seenOf(record);
  }

  async #replace(slideshow: StoredSlideshow, revision: number): Promise<void> {
    const { id } = slideshow;
    try {
      const next = await this.#notFoundAs(id, () =>
        this.#options.client.replaceSlideshow(id, revision, serverDocumentFor(slideshow)),
      );
      this.#seen.set(id, { revision: next, slideshow });
    } catch (error) {
      if (error instanceof ServerRevisionChangedError) {
        throw new SlideshowChangedError(this.#remember(error.current));
      }
      throw error;
    }
  }

  /** Runs `request`, throwing `SlideshowNotFoundError` for a slideshow the server does not have. */
  async #notFoundAs<T>(id: string, request: () => Promise<T>): Promise<T> {
    try {
      return await request();
    } catch (error) {
      if (error instanceof ServerLibraryNotFoundError) {
        this.#seen.delete(id);
        throw new SlideshowNotFoundError(id);
      }
      throw error;
    }
  }

  #remember(record: ServerSlideshowRecord): StoredSlideshow {
    const seen = this.#seenOf(record);
    this.#seen.set(record.id, seen);
    return seen.slideshow;
  }

  #seenOf(record: ServerSlideshowRecord): SeenSlideshow {
    return {
      revision: record.revision,
      slideshow: storedSlideshowFrom(record.id, record.document),
    };
  }

  /** Runs an Immich request for picture `id`, with Immich's errors as the app tells them. */
  async #fromImmich<T>(id: string, request: () => Promise<T>): Promise<T> {
    try {
      return await request();
    } catch (error) {
      if (error instanceof ImmichRequestFailedError && error.status === HTTP_NOT_FOUND) {
        throw new PictureMissingFromImmichError(id, { cause: error });
      }
      if (error instanceof ImmichUnavailableError) this.#options.reportUnavailable(error.kind);
      throw error;
    }
  }

  #focusOf(id: string): Promise<PictureFocus | null> {
    const known = this.#focus.get(id);
    if (known !== undefined) return known;
    const asking = this.#askFocus(id);
    this.#focus.set(id, asking);
    return asking;
  }

  async #askFocus(id: string): Promise<PictureFocus | null> {
    try {
      return focusFromFaces(await this.#options.immich.faces(id));
    } catch (error) {
      if (error instanceof ImmichUnavailableError) this.#options.reportUnavailable(error.kind);
      this.#options.log(error);
      this.#focus.delete(id);
      return null;
    }
  }
}

/** An edit named a revision the slideshow no longer has: it changed on another device. */
export class SlideshowChangedError extends Error {
  constructor(readonly current: StoredSlideshow) {
    super(`slideshow "${current.id}" changed on another device; the edit was not applied`);
    this.name = "SlideshowChangedError";
  }
}

/** A picture whose Immich asset is gone (404): shown as missing, skipped when playing. */
export class PictureMissingFromImmichError extends Error {
  constructor(
    readonly pictureId: string,
    options?: ErrorOptions,
  ) {
    super(`the picture "${pictureId}" is no longer in Immich`, options);
    this.name = "PictureMissingFromImmichError";
  }
}
