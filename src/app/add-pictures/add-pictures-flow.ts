import type { FocusPass } from "../../library/focus-pass";
import { SlideshowNotFoundError, type StoredSlideshow } from "../../library/stored-slideshow";
import { refusedEditOf, type EditRefusal } from "../editing/edit-refusal";
import type { Navigator } from "../navigation/navigator";
import type { Route } from "../navigation/route";
import type { SlideshowHome } from "../routes/slideshow-storage";
import { leaveWithToast } from "../routes/slideshow-exits";
import type { ToastMessage, Toaster } from "../toast/toaster";

/** The slideshow screen and the layers and editors over it, where added pictures stay new. */
const SLIDESHOW_SCREENS: ReadonlySet<Route["screen"]> = new Set([
  "slideshow",
  "player",
  "picture",
  "music",
]);

interface AddingSession {
  readonly slideshowId: string;
  /** Takes the slideshow as stored now, such as after an edit since the session began. */
  refresh(slideshow: StoredSlideshow): void;
  /** Resolves once the store spares the discarded pictures' media no more. */
  discard(): Promise<void>;
  /** Resolves with the added pictures' ids. */
  commit(): Promise<readonly string[]>;
}

export interface AddPicturesFlowPorts<Session extends AddingSession> {
  newSession(slideshow: StoredSlideshow, home: SlideshowHome): Session;
  /** Deletes media no slideshow uses and no claim in any tab spares; reports failures. */
  deleteAbandonedMedia(): void;
  readonly navigator: Pick<Navigator, "open" | "back">;
  readonly toaster: Pick<Toaster, "show">;
  /** Looks for the new pictures' focus in the background. */
  readonly focusPass: Pick<FocusPass, "start">;
  reportError(error: unknown): void;
  /** The toast's text when the slideshow was deleted meanwhile. */
  goneText(): string;
  /** The toast when a server slideshow refused the adding, as it refuses an edit. */
  refusalToast(reason: EditRefusal): ToastMessage;
}

/** The pictures just added, which the slideshow screen marks as new while it is shown. */
export interface AddedPictures {
  readonly slideshowId: string;
  readonly pictureIds: readonly string[];
}

export interface AddPicturesFlowState<Session> {
  /** The adding the add screen shows; it outlives leaving that screen until it ends. */
  readonly session: Session | null;
  readonly added: AddedPictures | null;
  /** The pictures are being stored into the slideshow; nothing can be discarded meanwhile. */
  readonly committing: boolean;
}

/**
 * Adding pictures to a slideshow from start to end: one session per tab, for one slideshow at a
 * time, the clean-up once it is discarded, and the way back to the slideshow once added. The
 * methods' promises never reject; failures go to `reportError`.
 */
export class AddPicturesFlow<Session extends AddingSession> {
  readonly #ports: AddPicturesFlowPorts<Session>;
  readonly #listeners = new Set<(state: AddPicturesFlowState<Session>) => void>();
  #state: AddPicturesFlowState<Session> = { session: null, added: null, committing: false };
  /** The discard of a session replaced by one for another slideshow, with its clean-up. */
  #replaced: Promise<void> = Promise.resolve();

  constructor(ports: AddPicturesFlowPorts<Session>) {
    this.#ports = ports;
  }

  get session(): Session | null {
    return this.#state.session;
  }

  get added(): AddedPictures | null {
    return this.#state.added;
  }

  get committing(): boolean {
    return this.#state.committing;
  }

  subscribe(listener: (state: AddPicturesFlowState<Session>) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  /**
   * Opens the add screen for `slideshow`, which lives at `home`; its session is kept and takes the record as stored now,
   * a selection for another slideshow is discarded.
   */
  open(slideshow: StoredSlideshow, home: SlideshowHome): void {
    const previous = this.#state.session;
    if (previous?.slideshowId === slideshow.id) {
      previous.refresh(slideshow);
    } else {
      if (previous !== null) {
        this.#replaced = this.#discardAndCleanUp(previous);
      }
      this.#publish({ session: this.#ports.newSession(slideshow, home) });
    }
    this.#ports.navigator.open({ screen: "add", slideshowId: slideshow.id });
  }

  /** Resolves once a selection replaced by `open` is discarded and cleaned up. */
  settled(): Promise<void> {
    return this.#replaced;
  }

  /**
   * Follows the app to `route`. The add screen or its Immich browser shown without that
   * slideshow's selection (e.g. from history) has nothing to show, so it goes back; leaving the
   * slideshow the pictures were added to, they are new no more.
   */
  follow(route: Route): void {
    const adding =
      route.screen === "add" || (route.screen === "immich" && route.slideshowId !== null);
    if (adding && this.#state.session?.slideshowId !== route.slideshowId) {
      this.#ports.navigator.back();
    }
    const added = this.#state.added;
    if (
      added !== null &&
      !(
        SLIDESHOW_SCREENS.has(route.screen) &&
        "slideshowId" in route &&
        route.slideshowId === added.slideshowId
      )
    ) {
      this.#publish({ added: null });
    }
  }

  /** Throws the selection away, unless it is being added; `leave` also goes back. */
  async discard(leave: boolean): Promise<void> {
    const session = this.#state.session;
    if (this.#state.committing) {
      return;
    }
    if (leave) {
      this.#publish({ session: null });
      this.#ports.navigator.back();
    }
    if (session !== null) {
      await this.#discardAndCleanUp(session);
    }
  }

  async commit(): Promise<void> {
    const session = this.#state.session;
    if (session === null) {
      throw new Error("cannot add pictures: no adding is in progress");
    }
    let pictureIds: readonly string[];
    this.#publish({ committing: true });
    try {
      pictureIds = await session.commit();
    } catch (error) {
      this.#publish({ committing: false });
      const refused = refusedEditOf(error);
      if (refused !== null) {
        // The selection stays, so "Add" stores it at the version now shown.
        if (refused.reason === "changed") session.refresh(refused.current);
        this.#ports.toaster.show(this.#ports.refusalToast(refused.reason));
        return;
      }
      if (!(error instanceof SlideshowNotFoundError)) {
        this.#ports.reportError(error);
        return;
      }
      this.#publish({ session: null });
      leaveWithToast(this.#ports, this.#ports.goneText());
      await this.#discardAndCleanUp(session);
      return;
    }
    const { slideshowId } = session;
    this.#publish({ session: null, added: { slideshowId, pictureIds }, committing: false });
    this.#ports.deleteAbandonedMedia();
    this.#ports.navigator.open({ screen: "slideshow", slideshowId });
    this.#ports.focusPass.start();
  }

  async #discardAndCleanUp(session: Session): Promise<void> {
    try {
      await session.discard();
    } catch (error) {
      this.#ports.reportError(error);
      return;
    }
    this.#ports.deleteAbandonedMedia();
  }

  #publish(change: Partial<AddPicturesFlowState<Session>>): void {
    this.#state = { ...this.#state, ...change };
    for (const listener of this.#listeners) {
      listener(this.#state);
    }
  }
}
