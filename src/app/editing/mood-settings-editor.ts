import { leaveMood, setSlideshowMood } from "../../library/slideshow-edits-mood";
import type { SlideshowMood } from "../../library/slideshow-mood";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { offerMoodLeftUndo } from "./mood-left-undo";
import type { ResetUndo } from "./reset-undo";

/** What `MoodSettingsEditor` needs from the screen to word its undo toasts. */
export interface MoodSettingsPorts {
  /** The undo toast's text after the slideshow's mood went back to Custom ("Back to Custom"). */
  readonly moodResetText: () => string;
  /** The undo toast's text after `leave` left the mood ("Set them yourself", ADR-0045). */
  readonly moodNowCustomText: () => string;
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

  /**
   * Leaves the mood via `leaveMood`, writing its transition, picture length and target seconds
   * into the single settings before dropping the mood (ADR-0045, "Set them yourself"); the
   * toast's undo brings the slideshow back as it was before.
   */
  leave(): void {
    const before = this.#current();
    if (before.mood === undefined) {
      return;
    }
    const after = leaveMood(before);
    this.#apply(after);
    offerMoodLeftUndo(this.#reset, before, after, this.#ports.moodNowCustomText, this.#apply);
  }
}
