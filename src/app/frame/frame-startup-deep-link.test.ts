import { describe, expect, it } from "vitest";
import type { Route } from "../navigation/route";
import type { ServerLibraryState } from "../../server-library/server-library-availability";
import { openDeepLinkedFrame } from "./frame-startup-deep-link";

/** A server availability a test can push states through. */
class FakeAvailability {
  #listeners = new Set<(state: ServerLibraryState) => void>();
  #state: ServerLibraryState;

  constructor(state: ServerLibraryState) {
    this.#state = state;
  }

  subscribe(listener: (state: ServerLibraryState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  set(state: ServerLibraryState): void {
    this.#state = state;
    for (const listener of this.#listeners) listener(state);
  }
}

/** A navigator a test can read and record opens on, without the browser's history. */
class FakeNavigator {
  route: Route = { screen: "start" };
  opened: Route[] = [];

  open(route: Route): void {
    this.opened.push(route);
    this.route = route;
  }
}

describe("openDeepLinkedFrame", () => {
  it("opens the set-up screen then the frame once the server library is already on", () => {
    const navigator = new FakeNavigator();

    openDeepLinkedFrame("album-1", new FakeAvailability({ kind: "on" }), navigator);

    expect(navigator.opened).toEqual([
      { screen: "frameSetup" },
      { screen: "frame", albumId: "album-1" },
    ]);
  });

  it("waits for the server library to turn on before opening the frame", () => {
    const navigator = new FakeNavigator();
    const availability = new FakeAvailability({ kind: "checking" });

    openDeepLinkedFrame("album-1", availability, navigator);
    expect(navigator.opened).toEqual([]);

    availability.set({ kind: "on" });

    expect(navigator.opened).toEqual([
      { screen: "frameSetup" },
      { screen: "frame", albumId: "album-1" },
    ]);
  });

  it("never opens the frame while the server library stays off", () => {
    const navigator = new FakeNavigator();
    const availability = new FakeAvailability({ kind: "checking" });

    openDeepLinkedFrame("album-1", availability, navigator);
    availability.set({ kind: "off" });

    expect(navigator.opened).toEqual([]);
  });

  it("opens the frame only once, even if the server library flaps on again", () => {
    const navigator = new FakeNavigator();
    const availability = new FakeAvailability({ kind: "on" });

    openDeepLinkedFrame("album-1", availability, navigator);
    availability.set({ kind: "off" });
    availability.set({ kind: "on" });

    expect(navigator.opened).toEqual([
      { screen: "frameSetup" },
      { screen: "frame", albumId: "album-1" },
    ]);
  });

  it("does not open the frame if the user has already navigated elsewhere by the time it turns on", () => {
    const navigator = new FakeNavigator();
    const availability = new FakeAvailability({ kind: "checking" });

    openDeepLinkedFrame("album-1", availability, navigator);
    navigator.route = { screen: "settings" };
    availability.set({ kind: "on" });

    expect(navigator.opened).toEqual([]);
  });
});
