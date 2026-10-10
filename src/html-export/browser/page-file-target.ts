import { pickSaveTarget, type ExportTarget, type SaveFileType } from "../../video-export";
import { PAGE_FILE_EXTENSION } from "../plan";
import { PAGE_TYPE } from "./page-sinks";

const PAGE_FILE_TYPE: SaveFileType = {
  description: "HTML",
  mimeType: PAGE_TYPE,
  extension: PAGE_FILE_EXTENSION,
};

/**
 * Asks where to save the page (Chromium's save picker); call it in the click's user gesture.
 * Null when the user dismissed the picker. Stream into it with `streamPageSink`.
 */
export function pickPageFile(suggestedName: string): Promise<ExportTarget | null> {
  return pickSaveTarget(suggestedName, PAGE_FILE_TYPE);
}
