import type { Delivery, VideoExportPorts } from "./export-sheet-state";

const SHARE_DISMISSED = "AbortError";

/** Hands a finished private file over: a download, or the share sheet (a dismissal is no error). */
export async function deliverFile<Preview>(
  ports: VideoExportPorts<Preview>,
  delivery: Delivery,
  file: File,
): Promise<void> {
  if (delivery === "download") {
    ports.download(file);
  } else if (delivery === "share") {
    await ports.share(file).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === SHARE_DISMISSED)) {
        ports.log(error);
      }
    });
  }
}
