import {
  ImmichRequestFailedError,
  ImmichUnavailableError,
  type ImmichClient,
  type ImmichUnavailableKind,
} from "../immich/immich-client";
import type { MusicBeats } from "../beats";
import type { MusicLoudness } from "../loudness";
import type { DecodedPicture } from "../import/downscale";
import { decodeImmichPhoto } from "../import/immich-picture-source";
import type { StoredFocus } from "../library/picture-focus";
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
import { ServerPictureFocus } from "./server-picture-focus";

const HTTP_NOT_FOUND = 404;
const THUMBNAIL_SIZE = "thumbnail";
/** Immich's display-size JPEG, upright; playing it spares downloading and decoding the original. */
const PLAYBACK_SIZE = "preview";

export interface ServerSlideshowStoreOptions {
  readonly client: ServerLibraryClient;
  readonly immich: Pick<ImmichClient, "original" | "thumbnail">;
  /** Rejects with `UnreadablePictureError` for a file it cannot decode (`decodePicture`). */
  decode(file: File): Promise<DecodedPicture>;
  /** Tells the app why Immich cannot be used (`ImmichAvailability.report`). */
  reportUnavailable(kind: ImmichUnavailableKind): void;
  /** Logs a failure the store handles itself, e.g. a focus PUT the server could not be reached for. */
  log(error: unknown): void;
}

/** A slideshow as last read from or saved on the server, with the revision that names it. */
interface SeenSlideshow {
  readonly revision: number;
  readonly slideshow: StoredSlideshow;
}

/**
 * Server slideshows behind the store slices the app shows and plays them with
 * (`dev-docs/server_library/IN_THE_APP.md`). Every edit names the revision last seen
 * and edits are applied one at a time, so a conflict loses at most that edit (ADR-0018).
 * Pictures are Immich assets, nothing is kept: playing shows Immich's preview, everything else
 * makes the display rendition on the device from the original.
 */
export class ServerSlideshowStore implements SlideshowStore {
  readonly #options: ServerSlideshowStoreOptions;
  readonly #seen = new Map<string, SeenSlideshow>();
  readonly #pictureFocus: ServerPictureFocus;
  /** The edit under way; the next one starts once it has settled. */
  #edits: Promise<unknown> = Promise.resolve();

  constructor(options: ServerSlideshowStoreOptions) {
    this.#options = options;
    this.#pictureFocus = new ServerPictureFocus({ client: options.client, log: options.log });
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

  async pictureBlob(id: string, signal?: AbortSignal): Promise<Blob> {
    const { immich, decode } = this.#options;
    // The asset id names the file: the store knows no file name by picture id.
    const decoded = await this.#fromImmich(id, () =>
      decodeImmichPhoto({ id, fileName: id }, { client: immich, decode }, signal),
    );
    return decoded.display;
  }

  /** Immich's preview: an original is too large to fetch and decode within a slide (ADR-0018). */
  playbackPictureBlob(id: string, signal?: AbortSignal): Promise<Blob> {
    return this.#fromImmich(id, () => this.#options.immich.thumbnail(id, PLAYBACK_SIZE, signal));
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

  /** The beats a device found in the server's music; none for music the server does not have. */
  async musicBeats(musicId: string): Promise<MusicBeats | undefined> {
    try {
      return await this.#options.client.musicBeats(musicId);
    } catch (error) {
      if (error instanceof ServerLibraryNotFoundError) return undefined;
      throw error;
    }
  }

  /** Keeps the beats beside the server's music for every device; nothing for music deleted meanwhile. */
  async putMusicBeats(musicId: string, beats: MusicBeats): Promise<void> {
    try {
      await this.#options.client.putMusicBeats(musicId, beats);
    } catch (error) {
      if (!(error instanceof ServerLibraryNotFoundError)) throw error;
    }
  }

  /** The loudness a device measured for the server's music; none for music the server does not have. */
  async musicLoudness(musicId: string): Promise<MusicLoudness | undefined> {
    try {
      return await this.#options.client.musicLoudness(musicId);
    } catch (error) {
      if (error instanceof ServerLibraryNotFoundError) return undefined;
      throw error;
    }
  }

  /** Keeps the loudness beside the server's music for every device; nothing for music deleted meanwhile. */
  async putMusicLoudness(musicId: string, loudness: MusicLoudness): Promise<void> {
    try {
      await this.#options.client.putMusicLoudness(musicId, loudness);
    } catch (error) {
      if (!(error instanceof ServerLibraryNotFoundError)) throw error;
    }
  }

  /** The server's stored focus, plus this session's own results, for the UI (ADR-0041). */
  pictureFocus(pictureIds: readonly string[]): Promise<ReadonlyMap<string, StoredFocus>> {
    return this.#pictureFocus.pictureFocus(pictureIds);
  }

  /**
   * The same focus `pictureFocus` answers, but a picture whose session result is not yet
   * confirmed on the server counts as unstored: the server pass's own seam, so it PUTs a result
   * again next run instead of believing it is already stored (ADR-0041).
   */
  pictureFocusForPass(pictureIds: readonly string[]): Promise<ReadonlyMap<string, StoredFocus>> {
    return this.#pictureFocus.pictureFocusForPass(pictureIds);
  }

  putPictureFocus(pictureId: string, focus: StoredFocus): Promise<void> {
    return this.#pictureFocus.putPictureFocus(pictureId, focus);
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
      this.#pictureFocus.noteSlideshow(
        id,
        slideshow.pictures.map((picture) => picture.id),
      );
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
    this.#pictureFocus.noteSlideshow(
      record.id,
      seen.slideshow.pictures.map((picture) => picture.id),
    );
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
