import { ImmichUnavailableError } from "../../immich/immich-client";
import type { LibraryStore, StoredSlideshow } from "../../library/stored-slideshow";
import type { ServerLibrary } from "../../server-library/server-library";
import {
  ServerLibraryRefusedError,
  ServerLibraryUnavailableError,
} from "../../server-library/server-library-client";
import { PictureMissingFromImmichError } from "../../server-library/server-slideshow-store";
import type { ExportProgress } from "../glissando-file/export-job";
import type { Translator } from "../i18n/translator";
import type { Toaster } from "../toast/toaster";

export interface ServerCopyFlowsPorts {
  readonly serverLibrary: Pick<ServerLibrary, "keepCopy" | "saveOnServer">;
  readonly deviceStore: Pick<LibraryStore, "listSlideshows">;
  readonly toaster: Pick<Toaster, "show">;
  /** Opens a slideshow's screen, the copy's from a toast's "Open". */
  open(slideshowId: string): void;
  reportError(error: unknown): void;
  log(error: unknown): void;
  readonly translator: Pick<Translator, "t">;
}

/** Failures the user is told about in words: the server or Immich is not answering. */
function isUnavailable(error: unknown): boolean {
  return error instanceof ServerLibraryUnavailableError || error instanceof ImmichUnavailableError;
}

/**
 * "Keep a copy on this device" and "Save on the server" (`dev-docs/SERVER_LIBRARY.md`), run in
 * the background: the copy's progress shows in the header (`ExportProgress`, `copying`), the end
 * in a toast with "Open". Never rejects.
 */
export class ServerCopyFlows {
  readonly #ports: ServerCopyFlowsPorts;
  readonly #listeners = new Set<(progress: ExportProgress | null) => void>();
  #progress: ExportProgress | null = null;
  #settled: Promise<void> = Promise.resolve();

  constructor(ports: ServerCopyFlowsPorts) {
    this.#ports = ports;
  }

  subscribe(listener: (progress: ExportProgress | null) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#progress);
    return () => this.#listeners.delete(listener);
  }

  /** Resolves once the last flow started has ended. */
  settled(): Promise<void> {
    return this.#settled;
  }

  keepCopy(serverSlideshow: StoredSlideshow): Promise<void> {
    this.#settled = this.#keepCopy(serverSlideshow);
    return this.#settled;
  }

  saveOnServer(deviceSlideshow: StoredSlideshow): Promise<void> {
    this.#settled = this.#saveOnServer(deviceSlideshow);
    return this.#settled;
  }

  async #keepCopy(serverSlideshow: StoredSlideshow): Promise<void> {
    const { serverLibrary, deviceStore, toaster, translator } = this.#ports;
    const { id: slideshowId, title } = serverSlideshow;
    const { t } = translator;
    try {
      const existingTitles = (await deviceStore.listSlideshows()).map((shown) => shown.title);
      this.#publish({ slideshowId, title, fraction: 0, copying: true });
      const copy = await serverLibrary.keepCopy(serverSlideshow, {
        existingTitles,
        signal: new AbortController().signal,
        onProgress: (fraction) => this.#publish({ slideshowId, title, fraction, copying: true }),
      });
      this.#publish(null);
      toaster.show({ text: t("server.copied"), tone: "info", action: this.#opening(copy.id) });
    } catch (error) {
      this.#publish(null);
      if (error instanceof PictureMissingFromImmichError) {
        this.#ports.log(error);
        toaster.show({ text: t("server.copyMissing"), tone: "error" });
      } else if (isUnavailable(error)) {
        this.#ports.log(error);
        toaster.show({
          text: t("server.copyFailed"),
          tone: "error",
          action: { label: t("common.retry"), run: () => void this.keepCopy(serverSlideshow) },
        });
      } else {
        this.#ports.reportError(error);
      }
    }
  }

  async #saveOnServer(deviceSlideshow: StoredSlideshow): Promise<void> {
    const { serverLibrary, toaster, translator } = this.#ports;
    const { t } = translator;
    try {
      const saved = await serverLibrary.saveOnServer(deviceSlideshow);
      toaster.show({
        text: t("server.savedOnServer"),
        tone: "info",
        action: this.#opening(saved.id),
      });
    } catch (error) {
      if (error instanceof ServerLibraryRefusedError) {
        this.#ports.log(error);
        toaster.show({ text: t(refusalMessage(error)), tone: "error" });
        return;
      }
      if (!isUnavailable(error)) {
        this.#ports.reportError(error);
        return;
      }
      this.#ports.log(error);
      toaster.show({ text: t("server.saveOnServerFailed"), tone: "error" });
    }
  }

  #opening(slideshowId: string) {
    const { t } = this.#ports.translator;
    return { label: t("server.open"), run: () => this.#ports.open(slideshowId) };
  }

  #publish(progress: ExportProgress | null): void {
    this.#progress = progress;
    for (const listener of this.#listeners) listener(progress);
  }
}

const HTTP_TOO_LARGE = 413;

/** What the user is told when the server refused saving a slideshow. */
function refusalMessage(error: ServerLibraryRefusedError) {
  if (error.status !== HTTP_TOO_LARGE) return "server.saveRefused";
  return error.refused === "music" ? "server.musicTooLarge" : "server.slideshowTooLarge";
}
