import type { FocusPass } from "../../library/focus-pass";
import type { Navigator } from "../navigation/navigator";
import type { PersistencePrompt } from "../storage/persistence-prompt";
import type { Toaster } from "../toast/toaster";

interface DiscardableSession {
  /** Resolves once the store spares the discarded import's media no more. */
  discard(): Promise<void>;
}

export interface ImportFlowPorts<Session extends DiscardableSession> {
  newImportSession(): Session;
  /** Deletes media no slideshow uses and no claim in any tab spares; reports failures. */
  deleteAbandonedMedia(): void;
  readonly navigator: Pick<Navigator, "open" | "back">;
  readonly toaster: Pick<Toaster, "show">;
  readonly persistencePrompt: Pick<PersistencePrompt, "afterCreate">;
  /** Looks for the new slideshow's pictures' focus in the background. */
  readonly focusPass: Pick<FocusPass, "start">;
  reportError(error: unknown): void;
  createdText(): string;
}

export interface ImportFlowState<Session> {
  /** The import the import screen shows; it outlives leaving that screen until it ends. */
  readonly session: Session | null;
  /** The "persistent storage refused" notice is due. */
  readonly persistRefused: boolean;
}

/**
 * An import from start to end: the session it runs in, the clean-up once it is discarded or
 * created, and the persistence prompt after the first slideshow. The methods' promises settle
 * once their follow-up work is done; they never reject, failures go to `reportError`.
 */
export class ImportFlow<Session extends DiscardableSession> {
  readonly #ports: ImportFlowPorts<Session>;
  readonly #listeners = new Set<(state: ImportFlowState<Session>) => void>();
  #state: ImportFlowState<Session> = { session: null, persistRefused: false };

  constructor(ports: ImportFlowPorts<Session>) {
    this.#ports = ports;
  }

  get session(): Session | null {
    return this.#state.session;
  }

  get persistRefused(): boolean {
    return this.#state.persistRefused;
  }

  subscribe(listener: (state: ImportFlowState<Session>) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  /** The import screen is shown, e.g. restored from history: it needs a session. */
  ensureSession(): Session {
    const session = this.#state.session ?? this.#ports.newImportSession();
    this.#publish({ session });
    return session;
  }

  open(): void {
    this.ensureSession();
    this.#ports.navigator.open({ screen: "import", step: "pictures" });
  }

  async discard(leave: boolean): Promise<void> {
    const discarding = this.#state.session?.discard();
    if (leave) {
      this.#publish({ session: null });
      this.#ports.navigator.back();
    }
    if (discarding === undefined) {
      return;
    }
    try {
      await discarding;
    } catch (error) {
      this.#ports.reportError(error);
      return;
    }
    this.#ports.deleteAbandonedMedia();
  }

  async created(slideshowId: string): Promise<void> {
    this.#publish({ session: null });
    this.#ports.deleteAbandonedMedia();
    this.#ports.navigator.open({ screen: "slideshow", slideshowId });
    this.#ports.toaster.show({ text: this.#ports.createdText(), tone: "info" });
    await this.afterCreate();
  }

  /**
   * A slideshow was created, here or from a file: its pictures' focus is looked for, and
   * persistent storage asked for once.
   */
  async afterCreate(): Promise<void> {
    this.#ports.focusPass.start();
    try {
      if (await this.#ports.persistencePrompt.afterCreate()) {
        this.#publish({ persistRefused: true });
      }
    } catch (error) {
      this.#ports.reportError(error);
    }
  }

  dismissPersistNotice(): void {
    this.#publish({ persistRefused: false });
  }

  #publish(change: Partial<ImportFlowState<Session>>): void {
    this.#state = { ...this.#state, ...change };
    for (const listener of this.#listeners) {
      listener(this.#state);
    }
  }
}
