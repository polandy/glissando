import type { ServerLibraryState } from "../server-library/server-library-availability";
import type { Route } from "./navigation/route";

export interface ServerFocusStartOptions {
  /** Replays its current state on subscribe, like `ServerLibraryAvailability`. */
  readonly availability: {
    readonly state: ServerLibraryState;
    subscribe(listener: (state: ServerLibraryState) => void): () => void;
  };
  readonly navigator: {
    readonly route: Route;
    subscribe(listener: (route: Route) => void): () => void;
  };
  start(): void;
}

const isFrame = (route: Route): boolean => route.screen === "frame";

/**
 * Starts the server focus pass whenever the server library turns on — app open included, as the
 * availability replays — and when the app leaves the frame for its own screens, since a frame
 * opened first held the pass back: a kiosk showing one album has no library to search.
 */
export function followServerFocusStart(options: ServerFocusStartOptions): void {
  const { availability, navigator, start } = options;
  const startIfAllowed = (): void => {
    if (availability.state.kind === "on" && !isFrame(navigator.route)) start();
  };
  availability.subscribe(startIfAllowed);
  let previous = navigator.route;
  navigator.subscribe((route) => {
    const leftFrame = isFrame(previous) && !isFrame(route);
    previous = route;
    if (leftFrame) startIfAllowed();
  });
}
