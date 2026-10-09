import {
  canPickSaveFile,
  pickSaveTarget,
  privateExportTarget,
  probeVideoExport,
} from "../../video-export";
import { browserScreenAwakePorts, keepScreenAwake } from "./screen-awake";
import type { VideoExportDevice } from "./slideshow-video-export";

export interface BrowserVideoExportOptions {
  readonly window: Window;
  /** Quota minus usage; null where the browser cannot tell. */
  readonly freeBytes: () => Promise<number | null>;
  readonly download: (file: Blob, fileName: string) => void;
  readonly log: (error: unknown) => void;
}

/** The video export sheet's browser: WebCodecs, the file targets, wake lock and share sheet. */
export function browserVideoExportDevice({
  window,
  freeBytes,
  download,
  log,
}: BrowserVideoExportOptions): VideoExportDevice {
  const { navigator, document } = window;
  return {
    probe: (withMusic) => probeVideoExport({ withMusic }),
    freeBytes,
    canPickSaveFile,
    pickSaveTarget,
    privateExportTarget,
    keepScreenAwake: () => keepScreenAwake(browserScreenAwakePorts(document, navigator, log)),
    canShare: (file) => "canShare" in navigator && navigator.canShare({ files: [file] }),
    share: (file) => navigator.share({ files: [file], title: file.name }),
    download: (file) => download(file, file.name),
    log,
  };
}
