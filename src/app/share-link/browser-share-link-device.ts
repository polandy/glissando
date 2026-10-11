import type { Scheduler } from "../../ui-kit/scheduler";
import type { ShareLinkApi, ShareLinkDevice } from "./share-link-session";

/** A new tab that cannot reach back into the app. */
const NEW_TAB = "_blank";
const NEW_TAB_FEATURES = "noopener";

/** Sharing by link in the browser the app runs in. */
export function browserShareLinkDevice(
  window: Window,
  api: ShareLinkApi,
  scheduler: Scheduler,
): ShareLinkDevice {
  const { navigator } = window;
  return {
    api,
    origin: window.location.origin,
    scheduler,
    // Browsers offer the clipboard only to a secure context: https or localhost.
    clipboard:
      "clipboard" in navigator
        ? { writeText: (text) => navigator.clipboard.writeText(text) }
        : null,
    shareSheet: "share" in navigator ? (data) => navigator.share(data) : null,
    openTab: (url) => {
      window.open(url, NEW_TAB, NEW_TAB_FEATURES);
    },
  };
}
