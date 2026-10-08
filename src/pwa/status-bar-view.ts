import type { InstallGuide } from "./install-guide";

/** Everything the start screen's status bar depends on. */
export interface PwaState {
  /** A secure context that supports service workers: offline use and installing are possible. */
  readonly secureContext: boolean;
  /** Running as an installed app, or the browser's install prompt was accepted. */
  readonly installed: boolean;
  readonly installPromptAvailable: boolean;
  readonly installGuide: InstallGuide | null;
  readonly hintDismissed: boolean;
  /** The refusal of persistent storage was told and storage is still not persistent. */
  readonly storageRefused: boolean;
  readonly updateWaiting: boolean;
}

export type InstallOffer =
  | { readonly kind: "installPrompt" }
  | { readonly kind: "installGuide"; readonly guide: InstallGuide };

export type StatusBarAction =
  | { readonly kind: "none" }
  | { readonly kind: "why" }
  | { readonly kind: "reload" }
  | (InstallOffer & { readonly dismissible: boolean });

export interface StatusBarView {
  readonly status: "insecure" | "storageRefused" | "installed" | "offline";
  readonly action: StatusBarAction;
}

/** The status line and its one action; the rules and their precedence are in dev-docs/APP.md. */
export function statusBarView(state: PwaState): StatusBarView {
  return { status: statusOf(state), action: actionOf(state) };
}

/** What installing means here, whether or not the hint was hidden; null where it is impossible. */
export function installOffer(state: PwaState): InstallOffer | null {
  if (!state.secureContext || state.installed) {
    return null;
  }
  if (state.installPromptAvailable) {
    return { kind: "installPrompt" };
  }
  return state.installGuide === null ? null : { kind: "installGuide", guide: state.installGuide };
}

function statusOf(state: PwaState): StatusBarView["status"] {
  if (!state.secureContext) {
    return "insecure";
  }
  if (state.installed) {
    return "installed";
  }
  return state.storageRefused ? "storageRefused" : "offline";
}

function actionOf(state: PwaState): StatusBarAction {
  if (state.updateWaiting) {
    return { kind: "reload" };
  }
  if (!state.secureContext) {
    return { kind: "why" };
  }
  const offer = installOffer(state);
  if (offer === null || (state.hintDismissed && !state.storageRefused)) {
    return { kind: "none" };
  }
  // A refused storage makes installing the remedy, so its hint cannot be hidden.
  return { ...offer, dismissible: !state.storageRefused };
}
