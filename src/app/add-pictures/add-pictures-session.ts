import { addPictures } from "../../library/slideshow-edits";
import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
import { PictureIntake, type PictureIntakePorts } from "../import/picture-intake";

export interface AddPicturesSessionPorts extends PictureIntakePorts {
  readonly store: PictureIntakePorts["store"] &
    Pick<LibraryStore, "getSlideshow" | "updateSlideshow">;
}

/**
 * Pictures being added to one slideshow: its pictures are the known ones, so they are skipped as
 * duplicates. Nothing changes in the slideshow before `commit()`.
 */
export class AddPicturesSession {
  /** The slideshow as it was when adding began: its title, order and timing for the screen. */
  readonly slideshow: StoredSlideshow;
  readonly intake: PictureIntake;
  readonly #ports: AddPicturesSessionPorts;

  constructor(slideshow: StoredSlideshow, ports: AddPicturesSessionPorts) {
    this.slideshow = slideshow;
    this.#ports = ports;
    this.intake = new PictureIntake(ports, slideshow.pictures);
  }

  get slideshowId(): string {
    return this.slideshow.id;
  }

  /**
   * Stores the new pictures into the slideshow as stored now, in one update, then ends the claim
   * on their media; resolves with their ids. Rejects with `SlideshowNotFoundError` when the
   * slideshow was deleted meanwhile.
   */
  async commit(): Promise<readonly string[]> {
    const state = this.intake.pictures.state;
    if (state.busy) {
      throw new Error("cannot add the pictures: they are still being imported");
    }
    if (state.pictures.length === 0) {
      throw new Error("cannot add no pictures: import at least one first");
    }
    const current = await this.#ports.store.getSlideshow(this.slideshowId);
    await this.#ports.store.updateSlideshow(addPictures(current, state.pictures));
    await this.intake.endClaim();
    return state.pictures.map(({ id }) => id);
  }

  /** See `PictureIntake.discard`. */
  discard(): Promise<void> {
    return this.intake.discard();
  }
}
