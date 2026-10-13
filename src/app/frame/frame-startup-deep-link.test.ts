import { describe, expect, it, vi } from "vitest";
import type { Route } from "../navigation/route";
import type { ServerLibraryState } from "../../server-library/server-library-availability";
import { browserClearDeepLinkHash, openDeepLinkedFrame } from "./frame-startup-deep-link";

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

    openDeepLinkedFrame("album-1", new FakeAvailability({ kind: "on" }), navigator, vi.fn());

    expect(navigator.opened).toEqual([
      { screen: "frameSetup" },
      { screen: "frame", albumId: "album-1" },
    ]);
  });

  it("waits for the server library to turn on before opening the frame", () => {
    const navigator = new FakeNavigator();
    const availability = new FakeAvailability({ kind: "checking" });

    openDeepLinkedFrame("album-1", availability, navigator, vi.fn());
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

    openDeepLinkedFrame("album-1", availability, navigator, vi.fn());
    availability.set({ kind: "off" });

    expect(navigator.opened).toEqual([]);
  });

  it("opens the frame only once, even if the server library flaps on again", () => {
    const navigator = new FakeNavigator();
    const availability = new FakeAvailability({ kind: "on" });

    openDeepLinkedFrame("album-1", availability, navigator, vi.fn());
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

    openDeepLinkedFrame("album-1", availability, navigator, vi.fn());
    navigator.route = { screen: "settings" };
    availability.set({ kind: "on" });

    expect(navigator.opened).toEqual([]);
  });

  it("clears the deep link hash once resolved, so a later reload cannot replay it", () => {
    const navigator = new FakeNavigator();
    const clearDeepLinkHash = vi.fn();

    openDeepLinkedFrame(
      "album-1",
      new FakeAvailability({ kind: "on" }),
      navigator,
      clearDeepLinkHash,
    );

    expect(clearDeepLinkHash).toHaveBeenCalledOnce();
  });

  it("clears the deep link hash even if the user already navigated elsewhere", () => {
    const navigator = new FakeNavigator();
    const availability = new FakeAvailability({ kind: "checking" });
    const clearDeepLinkHash = vi.fn();

    openDeepLinkedFrame("album-1", availability, navigator, clearDeepLinkHash);
    navigator.route = { screen: "settings" };
    availability.set({ kind: "on" });

    expect(clearDeepLinkHash).toHaveBeenCalledOnce();
    expect(navigator.opened).toEqual([]);
  });

  it("does not clear the hash again if availability flaps after it already resolved", () => {
    const navigator = new FakeNavigator();
    const availability = new FakeAvailability({ kind: "on" });
    const clearDeepLinkHash = vi.fn();

    openDeepLinkedFrame("album-1", availability, navigator, clearDeepLinkHash);
    availability.set({ kind: "off" });
    availability.set({ kind: "on" });

    expect(clearDeepLinkHash).toHaveBeenCalledOnce();
  });
});

describe("browserClearDeepLinkHash", () => {
  it("drops the hash from the address bar without replacing history.state", () => {
    const state = { screen: "frame", albumId: "album-1" };
    const replaceState = vi.fn();
    const fakeWindow = {
      location: { pathname: "/", search: "", hash: "#frame=album-1" },
      history: { state, replaceState },
    } as unknown as Window;

    browserClearDeepLinkHash(fakeWindow)();

    expect(replaceState).toHaveBeenCalledWith(state, "", "/");
  });
});
