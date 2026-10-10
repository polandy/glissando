import type { ImmichPhoto } from "../../immich/immich-client";
import { DEFAULT_ADDED_PLACEMENT, type AddedPlacement } from "../../library/added-placement";
import { addPictures } from "../../library/slideshow-edits";
import type { LibraryStore, SlideshowStore, StoredSlideshow } from "../../library/stored-slideshow";
import { PictureIntake, type PictureIntakePorts } from "../import/picture-intake";
import type { SlideshowHome } from "../routes/slideshow-storage";

export interface AddPicturesSessionPorts extends PictureIntakePorts {
  readonly store: PictureIntakePorts["store"] & Pick<LibraryStore, "updateSlideshowWith">;
}

/**
 * The store adding to a server slideshow: edits go to the server; its photos are linked, so no
 * media is written or claimed.
 */
export function serverAddingStore(
  server: Pick<SlideshowStore, "updateSlideshowWith">,
): AddPicturesSessionPorts["store"] {
  const refused = (): Promise<void> =>
    Promise.reject(new Error("a server slideshow links its photos from Immich: store none"));
  return {
    updateSlideshowWith: (id, edit) => server.updateSlideshowWith(id, edit),
    putPicture: refused,
    putPictureFocus: refused,
    claimMedia: () => Promise.resolve(),
    releaseClaim: () => Promise.resolve(),
  };
}

/**
 * Pictures being added to one slideshow: its pictures are the known ones, so they are skipped as
 * duplicates. A server slideshow only links Immich photos (ADR-0018). Nothing changes in the
 * slideshow before `commit()`.
 */
export class AddPicturesSession {
  readonly intake: PictureIntake;
  readonly home: SlideshowHome;
  /** Where the new pictures go if the slideshow is in its own order; kept for the selection. */
  placement: AddedPlacement = DEFAULT_ADDED_PLACEMENT;
  readonly #ports: AddPicturesSessionPorts;
  #slideshow: StoredSlideshow;

  constructor(slideshow: StoredSlideshow, home: SlideshowHome, ports: AddPicturesSessionPorts) {
    this.#slideshow = slideshow;
    this.home = home;
    this.#ports = ports;
    this.intake = new PictureIntake(ports, slideshow.pictures);
  }

  /** The slideshow as last opened: its title, order and timing for the screen. */
  get slideshow(): StoredSlideshow {
    return this.#slideshow;
  }

  /** Takes the slideshow as stored now; its pictures become the known ones. */
  refresh(slideshow: StoredSlideshow): void {
    if (slideshow.id !== this.#slideshow.id) {
      throw new Error(
        `cannot refresh the adding to slideshow ${this.#slideshow.id} with slideshow ${slideshow.id}`,
      );
    }
    this.#slideshow = slideshow;
    this.intake.replaceKnown(slideshow.pictures);
  }

  addPictures(files: readonly File[]): void {
    if (this.home === "server") {
      throw new Error("a server slideshow only links photos from Immich: add none from the device");
    }
    this.intake.addPictures(files);
  }

  /** Downloaded for a device slideshow, linked for a server slideshow. */
  addImmichPhotos(photos: readonly ImmichPhoto[]): void {
    if (this.home === "server") this.intake.linkImmichPhotos(photos);
    else this.intake.addImmichPhotos(photos);
  }

  get slideshowId(): string {
    return this.slideshow.id;
  }

  /**
   * Stores the new pictures into the slideshow as stored now, read and written in one edit, then
   * ends the claim on their media; resolves with their ids. Rejects with `SlideshowNotFoundError`
   * when the slideshow was deleted meanwhile. Once the pictures are stored, a claim that fails to
   * end is reported, not thrown: it only spares their media, which the slideshow now keeps.
   */
  async commit(): Promise<readonly string[]> {
    const state = this.intake.pictures.state;
    if (state.busy) {
      throw new Error("cannot add the pictures: they are still being imported");
    }
    if (state.pictures.length === 0) {
      throw new Error("cannot add no pictures: import at least one first");
    }
    await this.#ports.store.updateSlideshowWith(this.slideshowId, (current) =>
      addPictures(current, state.pictures, this.placement),
    );
    try {
      await this.intake.endClaim();
    } catch (error) {
      this.#ports.onError(error);
    }
    return state.pictures.map(({ id }) => id);
  }

  /** See `PictureIntake.discard`. */
  discard(): Promise<void> {
    return this.intake.discard();
  }
}
