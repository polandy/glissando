import { addPictures } from "../../library/slideshow-edits";
import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
import { PictureIntake, type PictureIntakePorts } from "../import/picture-intake";

export interface AddPicturesSessionPorts extends PictureIntakePorts {
  readonly store: PictureIntakePorts["store"] & Pick<LibraryStore, "updateSlideshowWith">;
}

/**
 * Pictures being added to one slideshow: its pictures are the known ones, so they are skipped as
 * duplicates. Nothing changes in the slideshow before `commit()`.
 */
export class AddPicturesSession {
  readonly intake: PictureIntake;
  readonly #ports: AddPicturesSessionPorts;
  #slideshow: StoredSlideshow;

  constructor(slideshow: StoredSlideshow, ports: AddPicturesSessionPorts) {
    this.#slideshow = slideshow;
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
      addPictures(current, state.pictures),
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
