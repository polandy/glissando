import type { StoredSlideshow } from "../../library/stored-slideshow";
import { ServerLibraryUnavailableError } from "../../server-library/server-library-client";
import { SlideshowChangedError } from "../../server-library/server-slideshow-store";
import type { Translator } from "../i18n/translator";
import type { ToastMessage } from "../toast/toaster";

/**
 * Why a server slideshow's edit was not applied (`dev-docs/SERVER_LIBRARY.md`, A server
 * slideshow's screen): it changed on another device, or the server is not answering.
 */
export type EditRefusal = "changed" | "unavailable";

/** A refused edit, with the version the server has when it changed elsewhere. */
export type RefusedEdit =
  | { readonly reason: "changed"; readonly current: StoredSlideshow }
  | { readonly reason: "unavailable" };

/** The refusal `error` stands for; null for any other failure. */
export function refusedEditOf(error: unknown): RefusedEdit | null {
  if (error instanceof SlideshowChangedError) return { reason: "changed", current: error.current };
  if (error instanceof ServerLibraryUnavailableError) return { reason: "unavailable" };
  return null;
}

/** The toast telling a refused edit, the same wherever the edit was made. */
export function refusalToast(reason: EditRefusal, { t }: Pick<Translator, "t">): ToastMessage {
  return reason === "changed"
    ? { text: t("server.changedElsewhere"), tone: "info" }
    : { text: t("server.saveFailed"), tone: "error" };
}
