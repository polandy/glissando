import type { InstallOffer, StatusBarAction } from "../pwa/status-bar-view";
import type { Translator } from "./i18n/translator";
import type { PwaSheetContent } from "./pwa/PwaSheet.svelte";
import type { AppServices } from "./services";
import type { Toaster } from "./toast/toaster";

export interface AppActionPorts {
  readonly pwa: Pick<AppServices["pwa"], "install" | "reload">;
  readonly toaster: Toaster;
  readonly reportError: AppServices["reportError"];
  readonly appAddress: string;
}

export interface AppActions {
  install(offer: InstallOffer): void;
  statusBarAction(action: StatusBarAction): void;
  createFailed(retry: () => void): void;
  musicUnreadable(retry: () => void): void;
}

/**
 * The status bar's install/update actions, and the toasts offering a retry after a failed
 * server create or an unreadable music file.
 */
export function createAppActions(
  ports: AppActionPorts,
  t: Translator["t"],
  setPwaSheet: (sheet: PwaSheetContent | null) => void,
): AppActions {
  function install(offer: InstallOffer): void {
    if (offer.kind === "installPrompt") {
      ports.pwa.install().catch(ports.reportError);
    } else {
      setPwaSheet({ kind: "guide", guide: offer.guide });
    }
  }

  function statusBarAction(action: StatusBarAction): void {
    switch (action.kind) {
      case "none":
        return;
      case "reload":
        ports.pwa.reload();
        return;
      case "why":
        setPwaSheet({ kind: "why", address: ports.appAddress });
        return;
      default:
        install(action);
    }
  }

  function createFailed(retry: () => void): void {
    ports.toaster.show({
      text: t("server.createFailed"),
      tone: "error",
      action: { label: t("server.tryAgain"), run: retry },
    });
  }

  function musicUnreadable(retry: () => void): void {
    ports.toaster.show({
      text: t("import.musicUnreadable"),
      tone: "error",
      action: { label: t("common.retry"), run: retry },
    });
  }

  return { install, statusBarAction, createFailed, musicUnreadable };
}
