import type { Navigator, Route } from "../navigation/navigator";
import type { ServerLibraryState } from "../../server-library/server-library-availability";

export interface FrameDeepLinkAvailability {
  /** Replayed on subscribe (`ServerLibraryAvailability`), so there is no ordering race to win. */
  subscribe(listener: (state: ServerLibraryState) => void): () => void;
}

/**
 * Opens `#frame=<albumId>` straight to the running frame (`dev-docs/app/FRAME.md`), once the
 * server library is on: availability answers asynchronously, so this waits for its state rather
 * than racing the app's own startup. Fires at most once, and only while the app is still on the
 * start screen (a user who already navigated elsewhere keeps what they chose).
 */
export function openDeepLinkedFrame(
  albumId: string,
  availability: FrameDeepLinkAvailability,
  navigator: Pick<Navigator, "route" | "open">,
): () => void {
  let opened = false;
  return availability.subscribe((state) => {
    if (opened || state.kind !== "on") {
      return;
    }
    opened = true;
    if (navigator.route.screen === "start") {
      const frameSetup: Route = { screen: "frameSetup" };
      navigator.open(frameSetup);
      navigator.open({ screen: "frame", albumId });
    }
  });
}
