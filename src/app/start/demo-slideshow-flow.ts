import type { Toaster } from "../toast/toaster";

/** Named like a picked file would be, so the import path sees nothing special. */
const DEMO_FILE_NAME = "glissando-demo.glissando";

export type DemoSlideshowState =
  | { readonly kind: "idle"; readonly online: boolean }
  | {
      readonly kind: "loading";
      readonly online: boolean;
      readonly received: number;
      /** From the download's Content-Length; null where it was absent (an indeterminate state). */
      readonly total: number | null;
    };

/** Downloads the whole file, reporting bytes received and the total as it becomes known. */
export interface DemoDownloadPort {
  download(
    url: string,
    onProgress: (received: number, total: number | null) => void,
  ): Promise<Blob>;
}

/** The device's network connection, as the browser reports it (immich/immich-availability.ts). */
export interface DemoConnectivity {
  isOnline(): boolean;
  onChange(listener: (online: boolean) => void): () => void;
}

export interface DemoSlideshowFlowPorts {
  readonly url: string;
  readonly download: DemoDownloadPort;
  readonly connectivity: DemoConnectivity;
  /** Hands the downloaded bytes to the existing .glissando import, exactly as a picked file would. */
  openFile(file: File): void;
  readonly toaster: Pick<Toaster, "show">;
  failedText(): string;
}

/** The start screen's third hero button shows only on the public install with an empty library. */
export function isDemoSlideshowVisible(options: {
  readonly publicInstall: boolean;
  readonly libraryEmpty: boolean;
}): boolean {
  return options.publicInstall && options.libraryEmpty;
}

/**
 * Downloads the demo slideshow and opens it through the existing .glissando import, so the
 * result is an ordinary slideshow with nothing about it special-cased.
 */
export class DemoSlideshowFlow {
  readonly #ports: DemoSlideshowFlowPorts;
  readonly #listeners = new Set<(state: DemoSlideshowState) => void>();
  #state: DemoSlideshowState;
  #loading = false;

  constructor(ports: DemoSlideshowFlowPorts) {
    this.#ports = ports;
    this.#state = { kind: "idle", online: ports.connectivity.isOnline() };
    ports.connectivity.onChange((online) => this.#publish({ ...this.#state, online }));
  }

  get state(): DemoSlideshowState {
    return this.#state;
  }

  subscribe(listener: (state: DemoSlideshowState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  /** Ignored while offline, or while a download is already under way. */
  async start(): Promise<void> {
    if (this.#loading || !this.#state.online) {
      return;
    }
    this.#loading = true;
    this.#publish({ kind: "loading", online: this.#state.online, received: 0, total: null });
    try {
      const blob = await this.#ports.download.download(this.#ports.url, (received, total) =>
        this.#publish({ kind: "loading", online: this.#state.online, received, total }),
      );
      this.#loading = false;
      this.#publish({ kind: "idle", online: this.#state.online });
      this.#ports.openFile(new File([blob], DEMO_FILE_NAME, { type: blob.type }));
    } catch {
      this.#loading = false;
      this.#publish({ kind: "idle", online: this.#state.online });
      this.#ports.toaster.show({ text: this.#ports.failedText(), tone: "error" });
    }
  }

  #publish(state: DemoSlideshowState): void {
    this.#state = state;
    for (const listener of this.#listeners) {
      listener(state);
    }
  }
}
