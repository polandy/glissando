import type { FocusPass, FocusPassState } from "../../library/focus-pass";
import type { PictureFocus } from "../../library/picture-focus";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { bareFocus, NO_FOCUS_KNOWN, outdatedIds, picturesFocus } from "../focus/pictures-focus";
import type { RouteStore } from "./slideshow-home";

/** The slideshow screen's picture focus: as stored when it opened, plus what the pass finds since. */
export class ScreenFocus {
  #stored = $state.raw<ReadonlyMap<string, PictureFocus>>(NO_FOCUS_KNOWN.found);
  #outdated = $state.raw<ReadonlySet<string>>(NO_FOCUS_KNOWN.outdated);
  #passState: FocusPassState;
  readonly #pass: Pick<FocusPass, "state" | "subscribe">;
  readonly #store: Pick<RouteStore, "pictureFocus">;
  readonly #onError: (error: unknown) => void;
  readonly #left: AbortSignal;

  constructor(
    pass: Pick<FocusPass, "state" | "subscribe">,
    store: Pick<RouteStore, "pictureFocus">,
    onError: (error: unknown) => void,
    /** Aborted once the screen is left. */
    left: AbortSignal,
  ) {
    this.#pass = pass;
    this.#passState = $state.raw(pass.state);
    this.#store = store;
    this.#onError = onError;
    this.#left = left;
  }

  /** Read inside a `$derived`, which keeps it until either part changes. */
  get current() {
    return picturesFocus(this.#stored, this.#passState, this.#outdated);
  }

  /** Follows the pass; returns the unsubscribe. */
  follow(): () => void {
    return this.#pass.subscribe((next) => (this.#passState = next));
  }

  /**
   * Edits never add pictures (adding has its own screen, which reopens this one), so the focus of
   * those opened with is all the screen needs.
   */
  load(opened: StoredSlideshow): void {
    this.#store.pictureFocus(opened.pictures.map((picture) => picture.id)).then((read) => {
      if (!this.#left.aborted) {
        this.#stored = bareFocus(read);
        this.#outdated = outdatedIds(read);
      }
    }, this.#onError);
  }
}
