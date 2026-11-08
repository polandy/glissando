import { DOM_EXCEPTION, isDomException } from "../../dom-exception/dom-exception";
import type { Delivery } from "./export-sheet-state";

/** The ports a delivery uses; both export sheets' ports satisfy it. */
export interface DeliveryPorts {
  share(file: File): Promise<void>;
  download(file: File): void;
  log(error: unknown): void;
}

/** Hands a finished private file over: a download, or the share sheet (a dismissal is no error). */
export async function deliverFile(
  ports: DeliveryPorts,
  delivery: Delivery,
  file: File,
): Promise<void> {
  if (delivery === "download") {
    ports.download(file);
  } else if (delivery === "share") {
    await ports.share(file).catch((error: unknown) => {
      if (!isDomException(error, DOM_EXCEPTION.aborted)) {
        ports.log(error);
      }
    });
  }
}
