import { getContext, setContext } from "svelte";
import type { ExportProgress } from "./export-job";

const EXPORT_STATUS_CONTEXT = Symbol("export-status");

/** Where the header reads the background export; a reactive source re-renders it. */
export interface ExportStatusSource {
  readonly current: ExportProgress | null;
}

/** Call during the root component's initialisation. */
export function setExportStatus(source: ExportStatusSource): void {
  setContext(EXPORT_STATUS_CONTEXT, source);
}

/** Undefined where no root set one, e.g. a component mounted on its own in a test. */
export function getExportStatus(): ExportStatusSource | undefined {
  return getContext<ExportStatusSource | undefined>(EXPORT_STATUS_CONTEXT);
}
