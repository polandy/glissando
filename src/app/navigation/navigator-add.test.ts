import { describe, expect, it } from "vitest";
import { FakeHistory } from "../testing/fake-history";
import { Navigator, type Route } from "./navigator";
import { parentOf, parseRoute } from "./route";

const START: Route = { screen: "start" };
const SHOW: Route = { screen: "slideshow", slideshowId: "s1" };
const ADD: Route = { screen: "add", slideshowId: "s1" };
const IMMICH: Route = { screen: "immich", albumId: null, slideshowId: "s1" };
const ALBUM: Route = { screen: "immich", albumId: "a1", slideshowId: "s1" };

describe("Navigator, adding pictures to a slideshow", () => {
  it("opens the add screen below its slideshow and its Immich browser below that", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);
    navigator.open(SHOW);

    navigator.open(ADD);
    navigator.open(IMMICH);
    navigator.open(ALBUM);

    expect(history.entries).toEqual([START, SHOW, ADD, IMMICH, ALBUM]);
    expect(parentOf(ALBUM)).toEqual(IMMICH);
    expect(parentOf(IMMICH)).toEqual(ADD);
    expect(parentOf(ADD)).toEqual(SHOW);
  });

  it("returns to the slideshow after a reload, as the selection lived in memory", () => {
    const history = new FakeHistory([START, SHOW, ADD, IMMICH]);
    const navigator = new Navigator(history);

    expect(navigator.route).toEqual(SHOW);
    history.deliverPop();
    expect(history.index).toBe(1);
  });

  it("does not let browser forward re-enter a finished adding", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);
    navigator.open(SHOW);
    navigator.open(ADD);
    navigator.back();
    history.deliverPop();

    history.deliverPop(+1);
    history.deliverPop();

    expect(navigator.route).toEqual(SHOW);
  });

  it("restores the add screen from its own Immich browser", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);
    navigator.open(SHOW);
    navigator.open(ADD);
    navigator.open(IMMICH);

    navigator.back();
    history.deliverPop();

    expect(navigator.route).toEqual(ADD);
  });

  it("reads the add routes back and rejects a slideshow id that is not one", () => {
    expect(parseRoute({ screen: "add", slideshowId: "s1" })).toEqual(ADD);
    expect(parseRoute({ screen: "add" })).toBeNull();
    expect(parseRoute({ screen: "immich", albumId: "a1", slideshowId: "s1" })).toEqual(ALBUM);
    expect(parseRoute({ screen: "immich", albumId: null, slideshowId: 7 })).toBeNull();
    expect(parseRoute({ screen: "immich", albumId: null })).toBeNull();
  });
});
