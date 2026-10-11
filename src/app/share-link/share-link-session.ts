import type { Scheduler } from "../../ui-kit/scheduler";
import {
  ServerLibraryUnavailableError,
  type ShareLink,
} from "../../server-library/server-library-client";
import { isHomeNetworkOrigin } from "./home-network-origin";

/** How long "Copy" reads "Copied" after copying the link. */
export const COPIED_FEEDBACK_MS = 2000;

/** Where a link opens: the recipient's page, under the origin the app is open at. */
const SHARE_PATH = "/s/";
/** The browser's share sheet rejects with this when the user dismisses it. */
const SHARE_DISMISSED = "AbortError";

/**
 * The private API's calls about one slideshow's link. Each rejects with
 * `ServerLibraryUnavailableError` when the server does not answer.
 */
export interface ShareLinkApi {
  /** The slideshow's link; null while it is not shared. */
  shareOf(slideshowId: string): Promise<ShareLink | null>;
  /** Makes the link, or answers the one there is. */
  share(slideshowId: string): Promise<ShareLink>;
  /** Deletes the link; a link already off stays off. */
  unshare(slideshowId: string): Promise<void>;
}

/** What sharing by link needs of the browser and the server. */
export interface ShareLinkDevice {
  readonly api: ShareLinkApi;
  /** The origin the app is open at, e.g. `https://photos.example.org`. */
  readonly origin: string;
  readonly scheduler: Scheduler;
  /** Null where the browser offers none, e.g. over plain http: the link stays selectable. */
  readonly clipboard: { writeText(text: string): Promise<void> } | null;
  /** The browser's share sheet (`navigator.share`); null where it has none. */
  readonly shareSheet: ((data: { title: string; url: string }) => Promise<void>) | null;
  /** Opens a URL in a new tab. */
  openTab(url: string): void;
}

export interface ShareLinkSessionPorts extends ShareLinkDevice {
  /** The link was turned off and the sheet closed: the toast "Link turned off". */
  onTurnedOff(): void;
  onError(error: unknown): void;
}

/** The link as the row and the sheet show it. */
export interface SharedLink {
  readonly url: string;
  /** ISO 8601 date-time. */
  readonly createdAt: string;
}

export type ShareLinkRequest = "load" | "create" | "turnOff";

export type ShareSheetView = "closed" | "share" | "confirmTurnOff";

export interface ShareLinkState {
  /** Undefined until the server answered; null while the slideshow is not shared. */
  readonly link: SharedLink | null | undefined;
  readonly sheet: ShareSheetView;
  /** The request on its way to the server. */
  readonly pending: ShareLinkRequest | null;
  /** The request the server did not answer; "Try again" repeats it. */
  readonly unanswered: ShareLinkRequest | null;
  /** "Copy" reads "Copied". */
  readonly copied: boolean;
  readonly qrCodeShown: boolean;
}

const INITIAL_STATE: ShareLinkState = {
  link: undefined,
  sheet: "closed",
  pending: null,
  unanswered: null,
  copied: false,
  qrCodeShown: false,
};

/**
 * A server slideshow's link (SHARE_LINK.md, In the app): the share row's state and its sheet's,
 * with the calls to the private API behind them.
 */
export class ShareLinkSession {
  readonly #slideshowId: string;
  readonly #ports: ShareLinkSessionPorts;
  readonly #listeners = new Set<(state: ShareLinkState) => void>();
  #state: ShareLinkState = INITIAL_STATE;
  #cancelCopied: (() => void) | null = null;

  constructor(slideshowId: string, ports: ShareLinkSessionPorts) {
    this.#slideshowId = slideshowId;
    this.#ports = ports;
  }

  get state(): ShareLinkState {
    return this.#state;
  }

  /** The app is open at an address only the home network reaches: the sheet's lemon note. */
  get atHomeNetworkAddress(): boolean {
    return isHomeNetworkOrigin(this.#ports.origin);
  }

  /** "Copy" shows only where the browser offers the clipboard. */
  get canCopy(): boolean {
    return this.#ports.clipboard !== null;
  }

  /** "Share …" shows only where the browser has a share sheet. */
  get canUseShareSheet(): boolean {
    return this.#ports.shareSheet !== null;
  }

  /** Called with every change; returns the unsubscribe function. */
  subscribe(listener: (state: ShareLinkState) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  load(): Promise<void> {
    return this.#request("load", async () => {
      const link = await this.#ports.api.shareOf(this.#slideshowId);
      this.#set({ link: this.#shown(link) });
    });
  }

  open(): void {
    this.#set({ sheet: "share" });
    if (this.#state.link === undefined && this.#state.pending === null) void this.load();
  }

  close(): void {
    this.#stopCopied();
    this.#set({ sheet: "closed", qrCodeShown: false, unanswered: null });
  }

  create(): Promise<void> {
    return this.#request("create", async () => {
      const link = await this.#ports.api.share(this.#slideshowId);
      this.#set({ link: this.#shown(link) });
    });
  }

  async copy(): Promise<void> {
    const url = this.#url();
    const clipboard = this.#ports.clipboard;
    if (clipboard === null) throw new Error("this browser offers no clipboard to copy the link to");
    try {
      await clipboard.writeText(url);
    } catch (error) {
      this.#ports.onError(error);
      return;
    }
    this.#stopCopied();
    this.#cancelCopied = this.#ports.scheduler.after(COPIED_FEEDBACK_MS, () => {
      this.#cancelCopied = null;
      this.#set({ copied: false });
    });
    this.#set({ copied: true });
  }

  /** Hands the link to the browser's share sheet; dismissing it is no failure. */
  async shareVia(title: string): Promise<void> {
    const shareSheet = this.#ports.shareSheet;
    if (shareSheet === null) throw new Error("this browser has no share sheet to share the link");
    try {
      await shareSheet({ title, url: this.#url() });
    } catch (error) {
      if (error instanceof DOMException && error.name === SHARE_DISMISSED) return;
      this.#ports.onError(error);
    }
  }

  openAsViewer(): void {
    this.#ports.openTab(this.#url());
  }

  toggleQrCode(): void {
    this.#set({ qrCodeShown: !this.#state.qrCodeShown });
  }

  askTurnOff(): void {
    this.#set({ sheet: "confirmTurnOff", unanswered: null });
  }

  cancelTurnOff(): void {
    this.#set({ sheet: "share", unanswered: null });
  }

  turnOff(): Promise<void> {
    return this.#request("turnOff", async () => {
      await this.#ports.api.unshare(this.#slideshowId);
      this.#stopCopied();
      this.#set({ link: null, sheet: "closed", qrCodeShown: false });
      this.#ports.onTurnedOff();
    });
  }

  /** "Try again": repeats the request the server did not answer. */
  retry(): Promise<void> {
    switch (this.#state.unanswered) {
      case "load":
        return this.load();
      case "create":
        return this.create();
      case "turnOff":
        return this.turnOff();
      case null:
        throw new Error("no request to try again: the server answered the last one");
    }
  }

  /** The screen closed: nothing is scheduled any more. */
  dispose(): void {
    this.#stopCopied();
    this.#listeners.clear();
  }

  async #request(request: ShareLinkRequest, call: () => Promise<void>): Promise<void> {
    if (this.#state.pending !== null) return;
    this.#set({ pending: request, unanswered: null });
    try {
      await call();
      this.#set({ pending: null });
    } catch (error) {
      if (error instanceof ServerLibraryUnavailableError) {
        this.#set({ pending: null, unanswered: request });
        return;
      }
      this.#set({ pending: null });
      this.#ports.onError(error);
    }
  }

  #shown(link: ShareLink | null): SharedLink | null {
    if (link === null) return null;
    return { url: `${this.#ports.origin}${SHARE_PATH}${link.token}`, createdAt: link.createdAt };
  }

  #url(): string {
    const link = this.#state.link;
    if (link == null) throw new Error(`slideshow "${this.#slideshowId}" has no link to hand on`);
    return link.url;
  }

  #stopCopied(): void {
    this.#cancelCopied?.();
    this.#cancelCopied = null;
    if (this.#state.copied) this.#set({ copied: false });
  }

  #set(change: Partial<ShareLinkState>): void {
    this.#state = { ...this.#state, ...change };
    for (const listener of this.#listeners) listener(this.#state);
  }
}
