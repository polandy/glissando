import {
  claimsAt,
  mediaOnlyIn,
  newestFirst,
  referencedMediaIds,
  withClaimedMedia,
} from "../slideshow-queries";
import {
  MediaNotFoundError,
  SlideshowNotFoundError,
  type MediaClaim,
  type LibraryStore,
  type PictureBlobs,
  type StoredSlideshow,
} from "../stored-slideshow";
import type { PictureFocus } from "../picture-focus";

/** An in-memory `LibraryStore` for tests; holds copies, like a real store, so callers share nothing. */
export class MemoryLibraryStore implements LibraryStore {
  readonly #slideshows = new Map<string, StoredSlideshow>();
  readonly #pictures = new Map<string, PictureBlobs>();
  readonly #music = new Map<string, Blob>();
  readonly #imports = new Map<string, MediaClaim>();
  readonly #focus = new Map<string, PictureFocus>();

  putPicture(id: string, blobs: PictureBlobs): Promise<void> {
    this.#pictures.set(id, { display: blobs.display, thumbnail: blobs.thumbnail });
    return Promise.resolve();
  }

  putMusic(id: string, blob: Blob): Promise<void> {
    this.#music.set(id, blob);
    return Promise.resolve();
  }

  saveSlideshow(slideshow: StoredSlideshow): Promise<void> {
    this.#slideshows.set(slideshow.id, structuredClone(slideshow));
    return Promise.resolve();
  }

  updateSlideshow(slideshow: StoredSlideshow): Promise<void> {
    if (!this.#slideshows.has(slideshow.id)) {
      return Promise.reject(new SlideshowNotFoundError(slideshow.id));
    }
    return this.saveSlideshow(slideshow);
  }

  updateSlideshowWith(
    id: string,
    edit: (current: StoredSlideshow) => StoredSlideshow,
  ): Promise<StoredSlideshow> {
    const current = this.#slideshows.get(id);
    if (current === undefined) {
      return Promise.reject(new SlideshowNotFoundError(id));
    }
    try {
      const edited = edit(structuredClone(current));
      this.#slideshows.set(id, structuredClone(edited));
      return Promise.resolve(structuredClone(edited));
    } catch (error) {
      return Promise.reject(error as Error);
    }
  }

  listSlideshows(): Promise<readonly StoredSlideshow[]> {
    return Promise.resolve(
      newestFirst([...this.#slideshows.values()].map((s) => structuredClone(s))),
    );
  }

  getSlideshow(id: string): Promise<StoredSlideshow> {
    const slideshow = this.#slideshows.get(id);
    return slideshow === undefined
      ? Promise.reject(new SlideshowNotFoundError(id))
      : Promise.resolve(structuredClone(slideshow));
  }

  deleteSlideshow(id: string): Promise<void> {
    const deleted = this.#slideshows.get(id);
    if (deleted === undefined) {
      return Promise.reject(new SlideshowNotFoundError(id));
    }
    this.#slideshows.delete(id);
    for (const mediaId of mediaOnlyIn(deleted, [...this.#slideshows.values()])) {
      this.#deleteMedia(mediaId);
    }
    return Promise.resolve();
  }

  pictureBlob(id: string): Promise<Blob> {
    return found(id, this.#pictures.get(id)?.display);
  }

  thumbnailBlob(id: string): Promise<Blob> {
    return found(id, this.#pictures.get(id)?.thumbnail);
  }

  musicBlob(id: string): Promise<Blob> {
    return found(id, this.#music.get(id));
  }

  putPictureFocus(pictureId: string, focus: PictureFocus): Promise<void> {
    if (this.#pictures.has(pictureId)) {
      this.#focus.set(pictureId, structuredClone(focus));
    }
    return Promise.resolve();
  }

  pictureFocus(pictureIds: readonly string[]): Promise<ReadonlyMap<string, PictureFocus>> {
    const found = new Map<string, PictureFocus>();
    for (const id of pictureIds) {
      const focus = this.#focus.get(id);
      if (focus !== undefined) {
        found.set(id, structuredClone(focus));
      }
    }
    return Promise.resolve(found);
  }

  mediaBytes(slideshow: StoredSlideshow): Promise<number> {
    let bytes = 0;
    for (const picture of slideshow.pictures) {
      const blobs = this.#pictures.get(picture.id);
      bytes += (blobs?.display.size ?? 0) + (blobs?.thumbnail.size ?? 0);
    }
    if (slideshow.music !== undefined) {
      bytes += this.#music.get(slideshow.music.id)?.size ?? 0;
    }
    return Promise.resolve(bytes);
  }

  claimMedia(claimId: string, startedAt: Date, mediaId: string): Promise<void> {
    const existing = this.#imports.get(claimId);
    this.#imports.set(claimId, withClaimedMedia(existing, claimId, startedAt, mediaId));
    return Promise.resolve();
  }

  releaseClaim(claimId: string): Promise<void> {
    this.#imports.delete(claimId);
    return Promise.resolve();
  }

  deleteUnreferencedMedia(now: Date): Promise<void> {
    const referenced = referencedMediaIds([...this.#slideshows.values()]);
    const { sparedMediaIds, staleClaimIds } = claimsAt([...this.#imports.values()], now);
    staleClaimIds.forEach((id) => this.#imports.delete(id));
    // A focus is media too: one kept for a picture whose media went goes with it.
    for (const id of [...this.#pictures.keys(), ...this.#music.keys(), ...this.#focus.keys()]) {
      if (!referenced.has(id) && !sparedMediaIds.has(id)) {
        this.#deleteMedia(id);
      }
    }
    return Promise.resolve();
  }

  #deleteMedia(id: string): void {
    this.#pictures.delete(id);
    this.#focus.delete(id);
    this.#music.delete(id);
  }
}

function found(id: string, blob: Blob | undefined): Promise<Blob> {
  return blob === undefined ? Promise.reject(new MediaNotFoundError(id)) : Promise.resolve(blob);
}
