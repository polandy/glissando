import { describe, expect, it } from "vitest";
import type { Route } from "./navigation/route";
import type { ServerLibraryState } from "../server-library/server-library-availability";
import { followServerFocusStart } from "./server-focus-start";

const ON: ServerLibraryState = { kind: "on" };
const OFFLINE: ServerLibraryState = { kind: "offline" };
const START: Route = { screen: "start" };
const FRAME: Route = { screen: "frame", albumId: "album-1" };

/** A replaying source like `ServerLibraryAvailability` and a plain one like `Navigator`. */
function harness(initial: { state: ServerLibraryState; route: Route }) {
  let state = initial.state;
  let route = initial.route;
  const stateListeners = new Set<(s: ServerLibraryState) => void>();
  const routeListeners = new Set<(r: Route) => void>();
  let starts = 0;
  followServerFocusStart({
    availability: {
      get state() {
        return state;
      },
      subscribe(listener) {
        stateListeners.add(listener);
        listener(state);
        return () => stateListeners.delete(listener);
      },
    },
    navigator: {
      get route() {
        return route;
      },
      subscribe(listener) {
        routeListeners.add(listener);
        return () => routeListeners.delete(listener);
      },
    },
    start: () => {
      starts += 1;
    },
  });
  return {
    starts: () => starts,
    setState(next: ServerLibraryState) {
      state = next;
      stateListeners.forEach((l) => l(next));
    },
    open(next: Route) {
      route = next;
      routeListeners.forEach((l) => l(next));
    },
  };
}

describe("followServerFocusStart", () => {
  it("starts on app open when the server library is on", () => {
    expect(harness({ state: ON, route: START }).starts()).toBe(1);
  });

  it("starts again when the server library comes back on", () => {
    const h = harness({ state: ON, route: START });
    h.setState(OFFLINE);
    h.setState(ON);
    expect(h.starts()).toBe(2);
  });

  it("does not start on the frame", () => {
    const h = harness({ state: ON, route: FRAME });
    h.setState(OFFLINE);
    h.setState(ON);
    expect(h.starts()).toBe(0);
  });

  it("starts once the app leaves the frame for a screen of the app", () => {
    const h = harness({ state: ON, route: FRAME });
    h.open(START);
    expect(h.starts()).toBe(1);
  });

  it("waits for the server library when the app leaves the frame while it is offline", () => {
    const h = harness({ state: OFFLINE, route: FRAME });
    h.open(START);
    expect(h.starts()).toBe(0);
    h.setState(ON);
    expect(h.starts()).toBe(1);
  });

  it("does not start again on a move between two screens of the app", () => {
    const h = harness({ state: ON, route: START });
    h.open({ screen: "settings" });
    expect(h.starts()).toBe(1);
  });
});
