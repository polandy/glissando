import type { Scheduler } from "../scheduler";
import type { ObjectUrlPorts } from "../media/object-urls";

/**
 * How long a download's object URL stays valid: the browser starts reading it after the click
 * returns, so it is revoked later, not at once.
 */
const DOWNLOAD_URL_KEPT_MS = 60_000;

export interface DownloadPorts {
  readonly document: Document;
  readonly urls: Pick<ObjectUrlPorts, "create" | "revoke">;
  readonly scheduler: Scheduler;
}

/** Hands a file to the browser's downloads under `fileName`. */
export function createDownloader(ports: DownloadPorts): (file: Blob, fileName: string) => void {
  return (file, fileName) => {
    const url = ports.urls.create(file);
    const link = ports.document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    ports.scheduler.after(DOWNLOAD_URL_KEPT_MS, () => ports.urls.revoke(url));
  };
}
