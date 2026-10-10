import { bundledPlayerAsset } from "../../html-export/browser/bundled-player-asset";
import { canvasPictureScaler } from "../../html-export/browser/canvas-picture-scaler";
import { pickPageFile } from "../../html-export/browser/page-file-target";
import { MemoryBlobSink, PAGE_TYPE, streamPageSink } from "../../html-export/browser/page-sinks";
import { canPickSaveFile } from "../../video-export";
import type { PageDestination } from "./html-export-state";
import type { HtmlExportDevice } from "./slideshow-html-export";

export interface BrowserHtmlExportOptions {
  readonly window: Window;
  readonly download: (file: Blob, fileName: string) => void;
  readonly log: (error: unknown) => void;
}

/**
 * The web page export sheet's browser: the save picker, a Blob in memory elsewhere, the share
 * sheet and new tabs. A picked file is read back from disk to open it, so the page is never held
 * in memory whole.
 */
export function browserHtmlExportDevice({
  window,
  download,
  log,
}: BrowserHtmlExportOptions): HtmlExportDevice {
  const { navigator } = window;
  return {
    scaler: canvasPictureScaler,
    playerAsset: bundledPlayerAsset,
    canPickSaveFile,
    pickDestination: async (fileName) => {
      const target = await pickPageFile(fileName);
      return target === null
        ? null
        : { kind: "picked", sink: streamPageSink(target), file: () => target.file() };
    },
    memoryDestination: (fileName): PageDestination => {
      const sink = new MemoryBlobSink();
      return {
        kind: "memory",
        sink,
        file: () => Promise.resolve(new File([sink.blob()], fileName, { type: PAGE_TYPE })),
      };
    },
    canShare: (file) => "canShare" in navigator && navigator.canShare({ files: [file] }),
    share: (file) => navigator.share({ files: [file], title: file.name }),
    download: (file) => download(file, file.name),
    openPage: (file) => {
      const url = URL.createObjectURL(file);
      window.open(url, "_blank", "noopener");
      return () => URL.revokeObjectURL(url);
    },
    log,
  };
}
