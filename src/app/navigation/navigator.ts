import { isRestorable, parentOf, parseRoute, sameRoute, START_ROUTE, type Route } from "./route";

export type { Route } from "./route";

/** The slice of the browser's session history the navigator needs. */
export interface HistoryPort {
  /** The current entry's state. */
  readonly state: unknown;
  push(state: Route): void;
  replace(state: Route): void;
  /** Moves `delta` entries; the move lands later, as a pop. */
  go(delta: number): void;
  /** Called with the new entry's state after every move, the user's own back/forward included. */
  onPop(listener: (state: unknown) => void): () => void;
}

const BACK_ONE = -1;

/**
 * One history entry per screen, so the back arrow and the browser's back gesture do the same.
 * A route history cannot restore (see `isRestorable`) is left again for its nearest restorable
 * ancestor.
 */
export class Navigator {
  readonly #history: HistoryPort;
  readonly #listeners = new Set<(route: Route) => void>();
  #route: Route;
  /** A route to push once a backward move lands; set while `open` climbs the history down. */
  #pushAfterPop: Route | null = null;

  constructor(history: HistoryPort) {
    this.#history = history;
    const stored = parseRoute(history.state);
    if (stored === null) {
      history.replace(START_ROUTE);
    }
    this.#route = this.#leaveUnrestorable(stored ?? START_ROUTE, null);
    history.onPop((state) => this.#onPop(state));
  }

  get route(): Route {
    return this.#route;
  }

  /** Called with every new route; returns the unsubscribe function. */
  subscribe(listener: (route: Route) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /**
   * Goes to `target`: a push from its parent, or back down to its parent first, so the history
   * holds only the path to `target` (e.g. the created slideshow replaces the import steps).
   */
  open(target: Route): void {
    const parent = parentOf(target);
    if (parent !== null && sameRoute(parent, this.#route)) {
      this.#history.push(target);
      this.#setRoute(target);
      return;
    }
    const stepsDown = parent === null ? null : this.#stepsDownTo(parent);
    if (stepsDown === null) {
      throw new Error(
        `cannot open ${JSON.stringify(target)} from ${JSON.stringify(this.#route)}: ` +
          "open its parent screen first",
      );
    }
    this.#pushAfterPop = target;
    this.#setRoute(target);
    this.#history.go(-stepsDown);
  }

  /** One screen up; the route follows when the history move lands. */
  back(): void {
    if (parentOf(this.#route) !== null) {
      this.#history.go(BACK_ONE);
    }
  }

  #stepsDownTo(ancestor: Route): number | null {
    let steps = 0;
    for (let route: Route | null = this.#route; route !== null; route = parentOf(route)) {
      if (sameRoute(route, ancestor)) {
        return steps;
      }
      steps += 1;
    }
    return null;
  }

  #onPop(state: unknown): void {
    const pending = this.#pushAfterPop;
    if (pending !== null) {
      this.#pushAfterPop = null;
      this.#history.push(pending);
      return;
    }
    this.#setRoute(this.#leaveUnrestorable(parseRoute(state) ?? START_ROUTE, this.#route));
  }

  /** The nearest restorable ancestor of `route`; moves the history there when it differs. */
  #leaveUnrestorable(route: Route, from: Route | null): Route {
    let target = route;
    let steps = 0;
    while (!isRestorable(target, from)) {
      target = parentOf(target) ?? START_ROUTE;
      steps += 1;
    }
    if (steps > 0) {
      this.#history.go(-steps);
    }
    return target;
  }

  #setRoute(route: Route): void {
    if (sameRoute(route, this.#route)) {
      return;
    }
    this.#route = route;
    for (const listener of this.#listeners) {
      listener(route);
    }
  }
}

/** The navigator's port onto `window.history`. */
export function createWindowHistory(window: Window): HistoryPort {
  return {
    get state() {
      return window.history.state;
    },
    push: (state) => window.history.pushState(state, ""),
    replace: (state) => window.history.replaceState(state, ""),
    go: (delta) => window.history.go(delta),
    onPop(listener) {
      const handle = (event: PopStateEvent) => listener(event.state);
      window.addEventListener("popstate", handle);
      return () => window.removeEventListener("popstate", handle);
    },
  };
}
