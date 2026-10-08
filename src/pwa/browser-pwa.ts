import { requestPersistentStorage } from "../library/persistent-storage";
import { installGuideFor } from "./install-guide";
import type { HintDismissalStore, InstallPromptEvent, PwaPorts } from "./pwa-status";
import { registerServiceWorker } from "./service-worker-updates";

const STANDALONE_QUERY = "(display-mode: standalone)";
const INSTALL_PROMPT_EVENT = "beforeinstallprompt";
const INSTALLED_EVENT = "appinstalled";

type BrowserWindow = Window & typeof globalThis;

/** Whether browsers allow a service worker here, and with it offline use and installing. */
function serviceWorkerPossible(window: BrowserWindow): boolean {
  return window.isSecureContext && "serviceWorker" in window.navigator;
}

/** The browser's side of `PwaStatus`; its listeners are in place before anything awaits. */
export function browserPwaPorts(
  window: BrowserWindow,
  {
    production,
    hintDismissal,
    refusalTold,
    onError,
  }: {
    production: boolean;
    hintDismissal: HintDismissalStore;
    refusalTold: () => boolean;
    onError: (error: unknown) => void;
  },
): PwaPorts {
  const { navigator } = window;
  const secureContext = serviceWorkerPossible(window);
  return {
    secureContext,
    runningInstalled: window.matchMedia(STANDALONE_QUERY).matches || iosStandalone(navigator),
    installGuide: installGuideFor(navigator),
    onInstallPrompt: (listener) =>
      window.addEventListener(INSTALL_PROMPT_EVENT, (event) => {
        if (isInstallPromptEvent(event)) {
          listener(event);
        }
      }),
    onInstalled: (listener) => window.addEventListener(INSTALLED_EVENT, listener),
    hintDismissal,
    storage: {
      refusalTold,
      persisted: () => navigator.storage?.persisted() ?? Promise.resolve(false),
      request: () => requestPersistentStorage(navigator.storage),
    },
    updates:
      production && secureContext
        ? registerServiceWorker({
            container: navigator.serviceWorker,
            reload: () => window.location.reload(),
            onError,
          })
        : NO_UPDATES,
  };
}

/** The dev server and insecure contexts run without a service worker, so nothing updates. */
const NO_UPDATES: PwaPorts["updates"] = {
  onWaiting: () => {},
  apply: () => {
    throw new Error("no service worker runs, so no new version can wait");
  },
};

/** iOS Safari reports a home-screen app only through this non-standard flag. */
function iosStandalone(navigator: Navigator): boolean {
  return "standalone" in navigator && navigator.standalone === true;
}

function isInstallPromptEvent(event: Event): event is Event & InstallPromptEvent {
  return "prompt" in event && typeof event.prompt === "function" && "userChoice" in event;
}
