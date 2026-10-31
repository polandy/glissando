import { describe, expect, it } from "vitest";
import { FakeHistory } from "../testing/fake-history";
import { Navigator, type Route } from "./navigator";

const START: Route = { screen: "start" };
const SHOW: Route = { screen: "slideshow", slideshowId: "s1" };
const PLAYER: Route = { screen: "player", slideshowId: "s1" };
const ADD: Route = { screen: "add", slideshowId: "s1" };

/** A navigator on the add screen, entered from the slideshow. */
function onAddScreen() {
  const history = new FakeHistory();
  const navigator = new Navigator(history);
  navigator.open(SHOW);
  navigator.open(ADD);
  const seen: Route[] = [];
  navigator.subscribe((route) => seen.push(route));
  return { history, navigator, seen };
}

describe("Navigator leave guard (UX-23)", () => {
  it("asks the guard with the destination when the browser's back gesture leaves", () => {
    const { history, navigator } = onAddScreen();
    const asked: Route[] = [];
    navigator.guardLeave((to) => {
      asked.push(to);
      return true;
    });

    history.deliverPop(-1);

    expect(asked).toEqual([SHOW]);
  });

  it("lets the move through when the guard says yes", () => {
    const { history, navigator, seen } = onAddScreen();
    navigator.guardLeave(() => true);

    history.deliverPop(-1);

    expect(navigator.route).toEqual(SHOW);
    expect(seen).toEqual([SHOW]);
  });

  it("keeps the screen and restores its entry when the guard says no, telling nobody", () => {
    const { history, navigator, seen } = onAddScreen();
    const entriesBefore = [...history.entries];
    const indexBefore = history.index;
    const unregister = navigator.guardLeave(() => false);

    history.deliverPop(-1);

    expect(navigator.route).toEqual(ADD);
    expect(history.entries).toEqual(entriesBefore);
    expect(history.index).toBe(indexBefore);
    expect(seen).toEqual([]);

    // Positive signal: without the guard the same gesture does move and notifies.
    unregister();
    history.deliverPop(-1);
    expect(navigator.route).toEqual(SHOW);
    expect(seen).toEqual([SHOW]);
  });

  it("does not ask the guard while open() climbs down through the guarded screen", () => {
    const { history, navigator } = onAddScreen();
    let asked = 0;
    navigator.guardLeave(() => {
      asked += 1;
      return false;
    });

    navigator.open(PLAYER);
    history.deliverPop();

    expect(asked).toBe(0);
    expect(navigator.route).toEqual(PLAYER);
    expect(history.entries).toEqual([START, SHOW, PLAYER]);
  });

  it("lets an unregister remove only its own guard", () => {
    const { history, navigator } = onAddScreen();
    const staleUnregister = navigator.guardLeave(() => true);
    navigator.guardLeave(() => false);

    staleUnregister();
    history.deliverPop(-1);

    expect(navigator.route).toEqual(ADD);
  });
});
