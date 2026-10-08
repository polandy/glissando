import { describe, expect, it } from "vitest";
import { Navigator, type HistoryPort, type Route } from "./navigator";

/** An in-memory session history with the browser's semantics: a push drops forward entries. */
class FakeHistory implements HistoryPort {
  entries: unknown[];
  index: number;
  #listeners: ((state: unknown) => void)[] = [];
  #pendingPop: number | null = null;

  constructor(entries: unknown[] = [null], index = entries.length - 1) {
    this.entries = entries;
    this.index = index;
  }

  get state(): unknown {
    return this.entries[this.index];
  }

  push(state: unknown): void {
    this.entries = [...this.entries.slice(0, this.index + 1), state];
    this.index += 1;
  }

  replace(state: unknown): void {
    this.entries[this.index] = state;
  }

  go(delta: number): void {
    // The browser moves asynchronously; the move lands when the test calls `deliverPop`.
    this.#pendingPop = delta;
  }

  onPop(listener: (state: unknown) => void): () => void {
    this.#listeners.push(listener);
    return () => {
      this.#listeners = this.#listeners.filter((other) => other !== listener);
    };
  }

  /** The browser's back gesture or a finished `go`. */
  deliverPop(delta = this.#pendingPop ?? -1): void {
    this.#pendingPop = null;
    this.index = Math.max(0, Math.min(this.entries.length - 1, this.index + delta));
    for (const listener of this.#listeners) {
      listener(this.state);
    }
  }
}

const START: Route = { screen: "start" };
const SHOW: Route = { screen: "slideshow", slideshowId: "s1" };
const PLAYER: Route = { screen: "player", slideshowId: "s1" };
const PICTURES: Route = { screen: "import", step: "pictures" };
const MUSIC: Route = { screen: "import", step: "music" };
const SETTINGS: Route = { screen: "settings" };

function routes(history: FakeHistory): unknown[] {
  return history.entries;
}

describe("Navigator", () => {
  it("starts on the start screen in a fresh tab", () => {
    expect(new Navigator(new FakeHistory()).route).toEqual(START);
  });

  it("gives every screen its own history entry", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);

    navigator.open(SHOW);
    navigator.open(PLAYER);

    expect(navigator.route).toEqual(PLAYER);
    expect(routes(history)).toEqual([START, SHOW, PLAYER]);
  });

  it("goes back through history, so the back arrow and the browser back do the same", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);
    navigator.open(SHOW);
    navigator.open(PLAYER);

    navigator.back();
    history.deliverPop();

    expect(navigator.route).toEqual(SHOW);
  });

  it("follows the browser's own back gesture and tells its subscribers", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);
    navigator.open(SHOW);
    const seen: Route[] = [];
    navigator.subscribe((route) => seen.push(route));

    history.deliverPop(-1);

    expect(seen).toEqual([START]);
  });

  it("treats a history state it does not know as the start screen", () => {
    const navigator = new Navigator(new FakeHistory([{ screen: "settings" }]));

    expect(navigator.route).toEqual(START);
  });

  it.each([
    [{ screen: "slideshow", slideshowId: "" }],
    [{ screen: "slideshow" }],
    [{ screen: "import", step: "export" }],
    [{ screen: "player", slideshowId: 7 }],
    ["start"],
  ])("rejects the malformed state %j", (state) => {
    expect(new Navigator(new FakeHistory([state])).route).toEqual(START);
  });

  it("restores the slideshow screen after a reload", () => {
    expect(new Navigator(new FakeHistory([START, SHOW])).route).toEqual(SHOW);
  });

  it("reopens the slideshow after a reload in the player, since music needs a gesture", () => {
    const history = new FakeHistory([START, SHOW, PLAYER]);
    const navigator = new Navigator(history);

    expect(navigator.route).toEqual(SHOW);
    history.deliverPop();
    expect(history.index).toBe(1);
    expect(navigator.route).toEqual(SHOW);
  });

  it("returns to the start screen after a reload in the import, whose selection is gone", () => {
    const history = new FakeHistory([START, PICTURES, MUSIC]);
    const navigator = new Navigator(history);

    expect(navigator.route).toEqual(START);
    history.deliverPop();
    expect(history.index).toBe(0);
    expect(navigator.route).toEqual(START);
  });

  it("goes from the music step back to the pictures step", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);
    navigator.open(PICTURES);
    navigator.open(MUSIC);

    navigator.back();
    history.deliverPop();

    expect(navigator.route).toEqual(PICTURES);
  });

  it("replaces the import steps with the created slideshow, so back leads to the start", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);
    navigator.open(PICTURES);
    navigator.open(MUSIC);

    navigator.open(SHOW);
    expect(navigator.route).toEqual(SHOW);
    history.deliverPop();
    expect(routes(history)).toEqual([START, SHOW]);

    navigator.back();
    history.deliverPop();
    expect(navigator.route).toEqual(START);
  });

  it("does not let browser forward re-enter a finished import", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);
    navigator.open(PICTURES);
    navigator.back();
    history.deliverPop();

    history.deliverPop(+1);
    expect(navigator.route).toEqual(START);
    history.deliverPop();
    expect(history.index).toBe(0);
    expect(navigator.route).toEqual(START);
  });

  it("does not let browser forward reopen the player", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);
    navigator.open(SHOW);
    navigator.open(PLAYER);
    navigator.back();
    history.deliverPop();

    history.deliverPop(+1);
    expect(navigator.route).toEqual(SHOW);
  });

  it("opens the settings sheet over the start screen with its own history entry", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);

    navigator.open(SETTINGS);

    expect(navigator.route).toEqual(SETTINGS);
    expect(routes(history)).toEqual([START, SETTINGS]);
  });

  it("closes the settings sheet with the browser back gesture", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);
    navigator.open(SETTINGS);

    history.deliverPop(-1);

    expect(navigator.route).toEqual(START);
  });

  it("returns to the start screen after a reload with the settings sheet open", () => {
    const history = new FakeHistory([START, SETTINGS]);
    const navigator = new Navigator(history);

    expect(navigator.route).toEqual(START);
    history.deliverPop();
    expect(history.index).toBe(0);
  });

  it("does not let browser forward reopen the settings sheet", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);
    navigator.open(SETTINGS);
    navigator.back();
    history.deliverPop();

    history.deliverPop(+1);
    expect(navigator.route).toEqual(START);
  });

  it("rejects a route that is not reachable from the current one, naming both", () => {
    const navigator = new Navigator(new FakeHistory());

    expect(() => navigator.open(PLAYER)).toThrow(/player.*start/);
  });

  it("stops telling a subscriber once it unsubscribed", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);
    navigator.open(SHOW);
    const seen: Route[] = [];
    const unsubscribe = navigator.subscribe((route) => seen.push(route));
    navigator.open(PLAYER);

    unsubscribe();
    history.deliverPop();

    expect(navigator.route).toEqual(SHOW);
    expect(seen).toEqual([PLAYER]);
  });
});
