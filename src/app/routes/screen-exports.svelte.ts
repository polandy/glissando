import type { StoredSlideshow } from "../../library/stored-slideshow";
import type { ExportProgress } from "../glissando-file/export-job";
import { exportMenuState, type ExportMenuState } from "../glissando-file/export-menu";
import { ExportSize } from "../glissando-file/export-size.svelte";
import { slideshowHtmlExport, type HtmlExportDevice } from "../html-export/slideshow-html-export";
import type { Translator } from "../i18n/translator";
import {
  slideshowVideoExport,
  type VideoExportDevice,
} from "../video-export/slideshow-video-export";
import type { RouteStore } from "./slideshow-home";
import type { SlideshowHome } from "./slideshow-storage";

/** What the slideshow screen's exports need, fixed for the screen's lifetime. */
export interface ScreenExportPorts {
  readonly store: RouteStore;
  readonly home: SlideshowHome;
  readonly videoExport: VideoExportDevice;
  readonly htmlExport: HtmlExportDevice;
  readonly translator: Translator;
  /** The slideshow as shown; null until it loaded. */
  readonly shown: () => StoredSlideshow | null;
  readonly onError: (error: unknown) => void;
  /** Aborted once the screen is left. */
  readonly left: AbortSignal;
}

/** The slideshow screen's exports: the .glissando file's size, the video and the web page. */
export class ScreenExports {
  readonly #ports: ScreenExportPorts;
  readonly #size: ExportSize;

  constructor(ports: ScreenExportPorts) {
    this.#ports = ports;
    this.#size = new ExportSize(ports.store, ports.onError, ports.left);
  }

  /** Measures the .glissando file's size when the ⋯ menu opens. */
  readonly measure = (): void => {
    const shown = this.#ports.shown();
    // A server slideshow's size is not known before its pictures are downloaded.
    if (shown !== null && this.#ports.home === "device") this.#size.measure(shown);
  };

  menuState(running: ExportProgress | null, slideshowId: string): ExportMenuState {
    return exportMenuState(running, slideshowId, this.#size.bytes);
  }

  readonly newVideoExport = () =>
    slideshowVideoExport(
      this.#ports.videoExport,
      this.#ports.store,
      this.#loaded(),
      this.#ports.translator.language,
    );

  readonly newHtmlExport = () => {
    const { htmlExport, store, translator, home } = this.#ports;
    return slideshowHtmlExport(htmlExport, store, this.#loaded(), translator, home);
  };

  /** The slideshow an export starts from; the screen shows only once it loaded. */
  #loaded(): StoredSlideshow {
    const shown = this.#ports.shown();
    if (shown === null) throw new Error("an export needs the slideshow loaded first");
    return shown;
  }
}
