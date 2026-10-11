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
    clipboard: {
      writeText: (text) => {
        // Browsers offer the clipboard only to a secure context: https or localhost.
        if (!("clipboard" in navigator)) {
          return Promise.reject(
            new Error("this browser offers no clipboard here; open Glissando over https to copy"),
          );
        }
        return navigator.clipboard.writeText(text);
      },
    },
    shareSheet: "share" in navigator ? (data) => navigator.share(data) : null,
    openTab: (url) => {
      window.open(url, NEW_TAB, NEW_TAB_FEATURES);
    },
  };
}
