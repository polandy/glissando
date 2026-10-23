import { setSlideshowMood } from "../../library/slideshow-edits-mood";
import type { SlideshowMood } from "../../library/slideshow-mood";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import type { ResetUndo } from "./reset-undo";

/** What `MoodSettingsEditor` needs from the screen to word its undo toast. */
export interface MoodSettingsPorts {
  /** The undo toast's text after the slideshow's mood went back to Custom. */
  readonly moodResetText: () => string;
}

/**
 * The slideshow's mood (ADR-0045): applies at once, through the `SlideshowEditor` that owns this
 * instance. A tile tap stores at once with no undo; "Back to Custom" asks nothing and the toast's
 * undo brings the mood back (`ResetUndo`).
 */
export class MoodSettingsEditor {
  readonly #ports: MoodSettingsPorts;
  readonly #reset: ResetUndo;
  readonly #current: () => StoredSlideshow;
  readonly #apply: (slideshow: StoredSlideshow) => void;

  constructor(
    ports: MoodSettingsPorts,
    reset: ResetUndo,
    current: () => StoredSlideshow,
    apply: (slideshow: StoredSlideshow) => void,
  ) {
    this.#ports = ports;
    this.#reset = reset;
    this.#current = current;
    this.#apply = apply;
  }

  /** The slideshow's mood from now on; `undefined` is Custom. */
  set(mood: SlideshowMood | undefined): void {
    this.#reset.supersede(this.#current().id, "slideshowMood");
    this.#apply(setSlideshowMood(this.#current(), mood));
  }

  /** Returns the mood to Custom without asking; the toast's undo brings it back. */
  reset(): void {
    const slideshow = this.#current();
    const previous = slideshow.mood;
    if (previous === undefined) {
      return;
    }
    this.#apply(setSlideshowMood(slideshow, undefined));
    this.#reset.offer(slideshow.id, "slideshowMood", this.#ports.moodResetText(), () =>
      this.set(previous),
    );
  }
}
