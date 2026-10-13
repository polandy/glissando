import { ServerLibraryUnavailableError } from "../../server-library/server-library-client";
import { TvRefusedError, type TvClient } from "../../server-library/tv-client";
import { isCompleteTvCode, normaliseTvCode } from "./tv-code";

/** Where the remote page opens (tv_remote/REMOTE_PAGE.md). */
const REMOTE_PATH = "/r/";
/** What the TV opens to pair (tv_remote/TV_PAGE.md). */
const TV_PATH = "/tv";

/** A server slideshow as a card in the sheet's pick step. */
export interface TvSlideshowCard {
  readonly id: string;
  readonly title: string;
  readonly pictureCount: number;
  readonly durationSeconds: number;
}

/** The calls the sheet makes; each rejects with `ServerLibraryUnavailableError` as `TvClient`. */
export interface TvApi extends TvClient {
  /** The server's slideshows in the start screen's order. */
  listSlideshows(): Promise<readonly TvSlideshowCard[]>;
}

export interface TvSessionPorts {
  readonly api: TvApi;
  /** The origin the app is open at, e.g. `https://photos.example.org`. */
  readonly origin: string;
  /** Leaves the app for the remote page at `path`. */
  openRemote(path: string): void;
  onError(error: unknown): void;
  /** A failure nobody waits on: a disconnect the server did not answer. */
  log(error: unknown): void;
}

/** "noMatch": the code matches no TV; "pick": connected, choosing the slideshow. */
export type TvSheetStep = "closed" | "code" | "noMatch" | "pick";

export type TvRequest = "claim" | "list" | "show";

export interface TvSessionState {
  readonly step: TvSheetStep;
  /** The letters typed so far, normalised. */
  readonly code: string;
  /** The code of the TV the sheet is connected to. */
  readonly connectedCode: string | null;
  /** Undefined until the server answered. */
  readonly slideshows: readonly TvSlideshowCard[] | undefined;
  readonly selected: string | null;
  /** The request on its way to the server. */
  readonly pending: TvRequest | null;
  /** The request the server did not answer; "Try again" repeats it. */
  readonly unanswered: TvRequest | null;
  /** The TV was closed before it showed anything: the code step says so. */
  readonly tvClosed: boolean;
}

const CLOSED: TvSessionState = {
  step: "closed",
  code: "",
  connectedCode: null,
  slideshows: undefined,
  selected: null,
  pending: null,
  unanswered: null,
  tvClosed: false,
};

/**
 * "Show on TV" (tv_remote/IN_THE_APP.md): the sheet's steps from the TV's code through choosing
 * a slideshow to the remote page, with the calls to the server behind them.
 */
export class TvSession {
  readonly #openedFrom: string | null;
  readonly #ports: TvSessionPorts;
  readonly #listeners = new Set<(state: TvSessionState) => void>();
  #state: TvSessionState = CLOSED;
  /** The claimed session's secret until it is shown, disconnected or forgotten. */
  #remoteSecret: string | null = null;
  /** Counts the sheet's closings, so a claim that lands after one is disconnected. */
  #closings = 0;

  /** `openedFrom`: the slideshow whose screen opened the sheet; null from the start screen. */
  constructor(openedFrom: string | null, ports: TvSessionPorts) {
    this.#openedFrom = openedFrom;
    this.#ports = ports;
  }

  get state(): TvSessionState {
    return this.#state;
  }

  /** What to open in the TV's browser, e.g. `photos.example.org/tv`. */
  get tvAddress(): string {
    return `${new URL(this.#ports.origin).host}${TV_PATH}`;
  }

  get canConnect(): boolean {
    return isCompleteTvCode(this.#state.code) && this.#state.pending === null;
  }

  /** Called with every change; returns the unsubscribe function. */
  subscribe(listener: (state: TvSessionState) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** Opens the sheet; a complete `code` (the TV's QR code) connects at once. */
  open(code = ""): void {
    this.#set({ ...CLOSED, step: "code", code: normaliseTvCode(code) });
    if (this.canConnect) void this.connect();
  }

  type(typed: string): void {
    this.#set({ code: normaliseTvCode(typed), tvClosed: false, unanswered: null });
  }

  connect(): Promise<void> {
    const code = this.#state.code;
    if (!isCompleteTvCode(code)) {
      return Promise.reject(new Error(`a TV's code has 4 letters, not "${code}"`));
    }
    const closings = this.#closings;
    return this.#request("claim", async () => {
      let secret: string;
      try {
        secret = await this.#ports.api.claim(code);
      } catch (error) {
        if (error instanceof TvRefusedError && error.refusal === "noSuchCode") {
          this.#set({ step: "noMatch" });
          return;
        }
        throw error;
      }
      if (closings !== this.#closings) {
        this.#disconnect(secret);
        return;
      }
      this.#remoteSecret = secret;
      this.#set({ step: "pick", connectedCode: code, pending: null });
      void this.#list();
    });
  }

  /** "Type it again". */
  retypeCode(): void {
    this.#set({ step: "code", code: "" });
  }

  select(slideshowId: string): void {
    this.#set({ selected: slideshowId });
  }

  show(): Promise<void> {
    const secret = this.#remoteSecret;
    const slideshowId = this.#state.selected;
    if (secret === null || slideshowId === null) {
      return Promise.reject(new Error("nothing to show: no TV connected or no slideshow chosen"));
    }
    return this.#request("show", async () => {
      try {
        await this.#ports.api.show(secret, slideshowId);
      } catch (error) {
        if (!(error instanceof TvRefusedError)) throw error;
        if (error.refusal === "noSuchTv") {
          this.#remoteSecret = null;
          this.#set({ step: "code", code: "", connectedCode: null, tvClosed: true });
          return;
        }
        if (error.refusal !== "notFound") throw error;
        this.#set({ pending: null });
        void this.#list();
        return;
      }
      this.#remoteSecret = null;
      this.#ports.openRemote(`${REMOTE_PATH}${secret}`);
    });
  }

  /**
   * ✕ and "Disconnect": closing before a slideshow was shown disconnects the TV, since nothing
   * could control it after; the TV goes back to its code.
   */
  close(): void {
    this.#closings += 1;
    const secret = this.#remoteSecret;
    this.#remoteSecret = null;
    if (secret !== null) this.#disconnect(secret);
    this.#set(CLOSED);
  }

  /** "Try again": repeats the request the server did not answer. */
  retry(): Promise<void> {
    switch (this.#state.unanswered) {
      case "claim":
        return this.connect();
      case "list":
        return this.#list();
      case "show":
        return this.show();
      case null:
        throw new Error("no request to try again: the server answered the last one");
    }
  }

  /** The screen closed: nobody listens any more, and a TV left unshown is let go as on ✕. */
  dispose(): void {
    this.#listeners.clear();
    this.close();
  }

  #list(): Promise<void> {
    return this.#request("list", async () => {
      const slideshows = await this.#ports.api.listSlideshows();
      const kept = slideshows.some(({ id }) => id === this.#state.selected);
      const wanted = slideshows.find(({ id }) => id === this.#openedFrom) ?? slideshows[0];
      this.#set({
        slideshows,
        selected: kept ? this.#state.selected : (wanted?.id ?? null),
      });
    });
  }

  #disconnect(secret: string): void {
    this.#ports.api.disconnect(secret).catch((error: unknown) => this.#ports.log(error));
  }

  async #request(request: TvRequest, call: () => Promise<void>): Promise<void> {
    if (this.#state.pending !== null) return;
    this.#set({ pending: request, unanswered: null });
    try {
      await call();
      if (this.#state.pending === request) this.#set({ pending: null });
    } catch (error) {
      if (this.#state.pending === request) this.#set({ pending: null });
      if (error instanceof ServerLibraryUnavailableError) {
        if (this.#state.step !== "closed") this.#set({ unanswered: request });
        return;
      }
      this.#ports.onError(error);
    }
  }

  #set(change: Partial<TvSessionState>): void {
    this.#state = { ...this.#state, ...change };
    for (const listener of this.#listeners) listener(this.#state);
  }
}
