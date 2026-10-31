import { describe, expect, it, vi } from "vitest";
import { FakeHistory } from "../testing/fake-history";
import { Navigator, type Route } from "./navigator";

const START: Route = { screen: "start" };
const SHOW: Route = { screen: "slideshow", slideshowId: "s1" };
const PICTURE: Route = { screen: "picture", slideshowId: "s1", pictureId: "p1" };

function onPicture() {
  const history = new FakeHistory();
  const navigator = new Navigator(history);
  navigator.open(SHOW);
  navigator.open(PICTURE);
  return { history, navigator };
}

describe("Navigator.backTo", () => {
  it("moves the history back to an ancestor and the route follows the pop", () => {
    const { history, navigator } = onPicture();

    navigator.backTo(START);
    expect(navigator.route).toEqual(PICTURE);
    history.deliverPop();

    expect(navigator.route).toEqual(START);
    expect(history.index).toBe(0);
  });

  it("moves nothing for the current route, and a later back still works", () => {
    const { history, navigator } = onPicture();
    const entries = [...history.entries];
    const go = vi.spyOn(history, "go");

    navigator.backTo(PICTURE);
    expect(go).not.toHaveBeenCalled();
    expect(history.entries).toEqual(entries);
    expect(history.index).toBe(2);

    navigator.back();
    history.deliverPop();
    expect(navigator.route).toEqual(SHOW);
  });

  it("throws for a route that is not on the path", () => {
    const { navigator } = onPicture();

    expect(() => navigator.backTo({ screen: "slideshow", slideshowId: "other" })).toThrow(
      /not on the path/,
    );
  });

  it("keeps the route when the leave guard says no", () => {
    const { history, navigator } = onPicture();
    navigator.guardLeave(() => false);

    navigator.backTo(START);
    history.deliverPop();

    expect(navigator.route).toEqual(PICTURE);
  });
});
