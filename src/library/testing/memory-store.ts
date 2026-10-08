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

/** An in-memory `LibraryStore` for tests; holds copies, like a real store, so callers share nothing. */
export class MemoryLibraryStore implements LibraryStore {
  readonly #slideshows = new Map<string, StoredSlideshow>();
  readonly #pictures = new Map<string, PictureBlobs>();
  readonly #music = new Map<string, Blob>();
  readonly #imports = new Map<string, MediaClaim>();

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
      this.#pictures.delete(mediaId);
      this.#music.delete(mediaId);
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
    for (const media of [this.#pictures, this.#music]) {
      for (const id of media.keys()) {
        if (!referenced.has(id) && !sparedMediaIds.has(id)) {
          media.delete(id);
        }
      }
    }
    return Promise.resolve();
  }
}

function found(id: string, blob: Blob | undefined): Promise<Blob> {
  return blob === undefined ? Promise.reject(new MediaNotFoundError(id)) : Promise.resolve(blob);
}
