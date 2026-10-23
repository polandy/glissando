import { setSlideshowLook } from "../../library/slideshow-edits";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import type { SlideshowLook } from "../../player/looks/slideshow-look";
import type { ResetUndo } from "./reset-undo";

/** What `LookSettingsEditor` needs from the screen to word its undo toast. */
export interface LookSettingsPorts {
  /** The undo toast's text after the slideshow's look went back to None. */
  readonly lookResetText: () => string;
}

/**
 * The slideshow's colour grade (ADR-0044): applies at once, through the `SlideshowEditor` that
 * owns this instance. A drop asks nothing; the toast's undo brings the look back (`ResetUndo`).
 */
export class LookSettingsEditor {
  readonly #ports: LookSettingsPorts;
  readonly #reset: ResetUndo;
  readonly #current: () => StoredSlideshow;
  readonly #apply: (slideshow: StoredSlideshow) => void;

  constructor(
    ports: LookSettingsPorts,
    reset: ResetUndo,
    current: () => StoredSlideshow,
    apply: (slideshow: StoredSlideshow) => void,
  ) {
    this.#ports = ports;
    this.#reset = reset;
    this.#current = current;
    this.#apply = apply;
  }

  /** The slideshow's colour grade from now on; None stores no field. */
  set(look: SlideshowLook): void {
    this.#reset.supersede(this.#current().id, "slideshowLook");
    this.#apply(setSlideshowLook(this.#current(), look));
  }

  /** Returns the look to None without asking; the toast's undo brings it back. */
  reset(): void {
    const slideshow = this.#current();
    const previous = slideshow.look;
    if (previous === undefined) {
      return;
    }
    this.#apply(setSlideshowLook(slideshow, undefined));
    this.#reset.offer(slideshow.id, "slideshowLook", this.#ports.lookResetText(), () =>
      this.set(previous),
    );
  }
}
