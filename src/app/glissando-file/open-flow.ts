import { checkGlissandoFile } from "../../glissando-file/check-glissando-file";
import { writeGlissandoFile, type WritePorts } from "../../glissando-file/write-glissando-file";
import type { LibraryStore } from "../../library/stored-slideshow";
import type { Navigator } from "../navigation/navigator";
import type { Toaster } from "../toast/toaster";
import { isQuotaExceeded } from "./storage-shortage";

/** The screen an open started from; its notice shows there (dev-docs/APP.md). */
export type OpenOrigin = "library" | "pictures";

export type OpenProblem =
  | { readonly kind: "foreign" }
  | { readonly kind: "damaged" }
  | { readonly kind: "newer" }
  /** `freeBytes` is null where the browser cannot tell. */
  | { readonly kind: "tooLarge"; readonly neededBytes: number; readonly freeBytes: number | null };

export interface OpenNotice {
  readonly origin: OpenOrigin;
  readonly fileName: string;
  readonly problem: OpenProblem;
}

export type OpeningLine =
  | { readonly kind: "checking" }
  | { readonly kind: "picture"; readonly number: number; readonly count: number }
  | { readonly kind: "music" };

/** What the blocking overlay shows while a file opens. */
export interface Opening {
  readonly fileName: string;
  readonly line: OpeningLine;
  /** From 0 to 1. */
  readonly fraction: number;
}

export interface OpenFlowState {
  readonly opening: Opening | null;
  readonly notice: OpenNotice | null;
}

export interface OpenFlowPorts {
  readonly store: WritePorts["store"] & Pick<LibraryStore, "listSlideshows">;
  newId(): string;
  now(): Date;
  /** Free storage on the device in bytes; null where the browser cannot tell. */
  freeBytes(): Promise<number | null>;
  readonly navigator: Pick<Navigator, "open">;
  readonly toaster: Pick<Toaster, "show">;
  reportError(error: unknown): void;
  log(error: unknown): void;
  /** A slideshow was created: the persistence prompt may be due. */
  afterCreate(): void;
  openedText(title: string): string;
  openedAsText(title: string, original: string): string;
  cancelledText(): string;
}

/** Checking reads every media file once, writing once more and stores it: the larger share. */
const CHECKING_SHARE = 0.3;

/**
 * Opening a .glissando file: checked whole first, then written as a new slideshow under a
 * blocking overlay with Cancel. A refused file is a notice on the screen it was opened from;
 * a cancel or a failure leaves nothing behind. `open` never rejects.
 */
export class OpenFlow {
  readonly #ports: OpenFlowPorts;
  readonly #listeners = new Set<(state: OpenFlowState) => void>();
  #state: OpenFlowState = { opening: null, notice: null };
  #cancel: AbortController | null = null;

  constructor(ports: OpenFlowPorts) {
    this.#ports = ports;
  }

  get state(): OpenFlowState {
    return this.#state;
  }

  subscribe(listener: (state: OpenFlowState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  dismissNotice(): void {
    if (this.#state.notice !== null) {
      this.#publish({ notice: null });
    }
  }

  cancel(): void {
    this.#cancel?.abort();
  }

  /** Ignored while another file opens. */
  async open(file: File, origin: OpenOrigin): Promise<void> {
    if (this.#cancel !== null) {
      return;
    }
    const cancel = new AbortController();
    this.#cancel = cancel;
    const fileName = file.name;
    const show = (line: OpeningLine, fraction: number): void =>
      this.#publish({ opening: { fileName, line, fraction } });
    this.#publish({ notice: null, opening: { fileName, line: { kind: "checking" }, fraction: 0 } });
    let neededBytes = 0;
    try {
      const check = await checkGlissandoFile(file, {
        freeBytes: () => this.#ports.freeBytes(),
        signal: cancel.signal,
        onProgress: (fraction) => show({ kind: "checking" }, fraction * CHECKING_SHARE),
      });
      if (check.kind !== "ok") {
        if (check.kind === "damaged") {
          this.#ports.log(new Error(`"${fileName}" is damaged: ${check.reason}`));
        }
        const problem: OpenProblem = check.kind === "damaged" ? { kind: "damaged" } : check;
        this.#end({ notice: { origin, fileName, problem } });
        return;
      }
      neededBytes = check.contents.mediaBytes;
      const existingTitles = (await this.#ports.store.listSlideshows()).map((show) => show.title);
      const created = await writeGlissandoFile(check.contents, this.#ports, {
        existingTitles,
        signal: cancel.signal,
        onStep: ({ fraction, ...line }) =>
          show(line, CHECKING_SHARE + fraction * (1 - CHECKING_SHARE)),
      });
      this.#end({});
      const original = check.contents.manifest.slideshow.title;
      this.#ports.navigator.open({ screen: "slideshow", slideshowId: created.id });
      this.#ports.toaster.show({
        text:
          created.title === original
            ? this.#ports.openedText(created.title)
            : this.#ports.openedAsText(created.title, original),
        tone: "info",
      });
      this.#ports.afterCreate();
    } catch (error) {
      await this.#failed(error, {
        cancelled: cancel.signal.aborted,
        origin,
        fileName,
        neededBytes,
      });
    }
  }

  async #failed(
    error: unknown,
    context: { cancelled: boolean; origin: OpenOrigin; fileName: string; neededBytes: number },
  ): Promise<void> {
    if (context.cancelled) {
      this.#end({});
      this.#ports.toaster.show({ text: this.#ports.cancelledText(), tone: "info" });
      return;
    }
    if (!isQuotaExceeded(error)) {
      this.#end({});
      this.#ports.reportError(error);
      return;
    }
    this.#ports.log(error);
    let freeBytes: number | null = null;
    try {
      freeBytes = await this.#ports.freeBytes();
    } catch (estimateError) {
      this.#ports.log(estimateError);
    }
    const { origin, fileName, neededBytes } = context;
    this.#end({
      notice: { origin, fileName, problem: { kind: "tooLarge", neededBytes, freeBytes } },
    });
  }

  #end(change: Partial<OpenFlowState>): void {
    this.#cancel = null;
    this.#publish({ opening: null, ...change });
  }

  #publish(change: Partial<OpenFlowState>): void {
    this.#state = { ...this.#state, ...change };
    for (const listener of this.#listeners) {
      listener(this.#state);
    }
  }
}
