import type { Navigator, Route } from "../navigation/navigator";
import type { ServerLibraryState } from "../../server-library/server-library-availability";

export interface FrameDeepLinkAvailability {
  /** Replayed on subscribe (`ServerLibraryAvailability`), so there is no ordering race to win. */
  subscribe(listener: (state: ServerLibraryState) => void): () => void;
}

/**
 * Opens `#frame=<albumId>` straight to the running frame (`dev-docs/app/FRAME.md`), once the
 * server library is on: availability answers asynchronously, so this waits for its state rather
 * than racing the app's own startup. Resolves at most once, and only opens the frame while the
 * app is still on the start screen (a user who already navigated elsewhere keeps what they
 * chose). Either way, the hash is cleared once resolved: it is not part of `history.state`
 * (`dev-docs/app/NAVIGATION.md`), so left in place it would replay the same deep link on a later
 * reload, overriding a user who has since exited the frame or navigated elsewhere.
 */
export function openDeepLinkedFrame(
  albumId: string,
  availability: FrameDeepLinkAvailability,
  navigator: Pick<Navigator, "route" | "open">,
  clearDeepLinkHash: () => void,
): () => void {
  let resolved = false;
  return availability.subscribe((state) => {
    if (resolved || state.kind !== "on") {
      return;
    }
    resolved = true;
    clearDeepLinkHash();
    if (navigator.route.screen === "start") {
      const frameSetup: Route = { screen: "frameSetup" };
      navigator.open(frameSetup);
      navigator.open({ screen: "frame", albumId });
    }
  });
}

/** Drops `#frame=<albumId>` from the address bar without touching `history.state`. */
export function browserClearDeepLinkHash(window: Window): () => void {
  return () => {
    const url = window.location.pathname + window.location.search;
    window.history.replaceState(window.history.state, "", url);
  };
}
