import type { MessageKey } from "../i18n/messages";

/** What is exported; only the words differ. */
export type ExportKind = "video" | "page";

export type ExportFailureClass =
  "storage-full" | "clip-unsupported" | "unsupported" | "cancelled" | "unknown";

/** The way out the sheet offers under the sentence. */
export type ExportFailureAction = "try-again" | "smaller-size" | "close";

/** Where an export sheet stands when it cannot go on, as its session reports it. */
export type ExportProblem =
  | { readonly kind: "storage-full" }
  | { readonly kind: "clip-unsupported"; readonly clip: number }
  | { readonly kind: "unsupported" }
  | { readonly kind: "failed"; readonly error: unknown };

export interface ExportFailureDescription {
  readonly failure: ExportFailureClass;
  readonly title: MessageKey;
  readonly text: MessageKey;
  /** The 1-based clip the title names ("{clip}"), else null. */
  readonly clip: number | null;
  readonly action: ExportFailureAction;
  /** The raw error as one line, for the "Show details" fold only. */
  readonly details: string;
}

const QUOTA_EXCEEDED = "QuotaExceededError";
const ABORTED = "AbortError";

/** Only keys: a sheet never renders an `Error`'s own message (scripts/no-raw-error-text.sh). */
export function describeExportFailure(error: unknown, kind: ExportKind): ExportFailureDescription {
  const details = errorDetails(error);
  if (isDomException(error, QUOTA_EXCEEDED)) return storageFull(details);
  if (isDomException(error, ABORTED)) return cancelled(details);
  return {
    failure: "unknown",
    title: kind === "video" ? "exportErrors.unknownVideoTitle" : "exportErrors.unknownPageTitle",
    text: "exportErrors.unknownText",
    clip: null,
    action: "try-again",
    details,
  };
}

/** The same words for a state the session reports without an error. */
export function describeExportProblem(
  problem: ExportProblem,
  kind: ExportKind,
): ExportFailureDescription {
  const video = kind === "video";
  switch (problem.kind) {
    case "storage-full":
      return storageFull("");
    case "clip-unsupported":
      return {
        failure: "clip-unsupported",
        title: video ? "exportErrors.clipVideoTitle" : "exportErrors.clipPageTitle",
        text: video ? "exportErrors.clipVideoText" : "exportErrors.clipPageText",
        clip: problem.clip,
        action: "try-again",
        details: "",
      };
    case "unsupported":
      return {
        failure: "unsupported",
        title: video ? "exportErrors.unsupportedVideoTitle" : "exportErrors.unsupportedPageTitle",
        text: "exportErrors.unsupportedText",
        clip: null,
        action: "close",
        details: "",
      };
    case "failed":
      return describeExportFailure(problem.error, kind);
  }
}

function storageFull(details: string): ExportFailureDescription {
  return {
    failure: "storage-full",
    title: "exportErrors.storageFullTitle",
    text: "exportErrors.storageFullText",
    clip: null,
    action: "smaller-size",
    details,
  };
}

function cancelled(details: string): ExportFailureDescription {
  return {
    failure: "cancelled",
    title: "exportErrors.cancelledTitle",
    text: "exportErrors.cancelledText",
    clip: null,
    action: "try-again",
    details,
  };
}

function isDomException(error: unknown, name: string): boolean {
  return error instanceof DOMException && error.name === name;
}

function errorDetails(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
