import { getContext, setContext } from "svelte";
import type { ExportProgress } from "./export-job";

const EXPORT_STATUS_CONTEXT = Symbol("export-status");

/** Where the header reads what runs in the background; a reactive source re-renders it. */
export interface ExportStatusSource {
  /** The background export first, then the server slideshows' copies in the order they started. */
  readonly running: readonly ExportProgress[];
}

/** The header's progress: the background export, if one runs, beside the running copies. */
export function runningInHeader(
  exported: ExportProgress | null,
  copies: readonly ExportProgress[],
): readonly ExportProgress[] {
  return exported === null ? copies : [exported, ...copies];
}

/** Call during the root component's initialisation. */
export function setExportStatus(source: ExportStatusSource): void {
  setContext(EXPORT_STATUS_CONTEXT, source);
}

/** Undefined where no root set one, e.g. a component mounted on its own in a test. */
export function getExportStatus(): ExportStatusSource | undefined {
  return getContext<ExportStatusSource | undefined>(EXPORT_STATUS_CONTEXT);
}
