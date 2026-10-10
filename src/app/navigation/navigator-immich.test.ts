import { describe, expect, it } from "vitest";
import { FakeHistory } from "../testing/fake-history";
import { Navigator, type Route } from "./navigator";
import { parentOf, parseRoute } from "./route";

const START: Route = { screen: "start" };
const PICTURES: Route = { screen: "import", step: "pictures" };
const IMMICH: Route = { screen: "immich", albumId: null, slideshowId: null };
const ALBUM: Route = { screen: "immich", albumId: "a1", slideshowId: null };

describe("Navigator, the Immich browser", () => {
  it("opens the browser below the pictures step and an album below the browser", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);
    navigator.open(PICTURES);

    navigator.open(IMMICH);
    navigator.open(ALBUM);

    expect(navigator.route).toEqual(ALBUM);
    expect(history.entries).toEqual([START, PICTURES, IMMICH, ALBUM]);
    expect(parentOf(ALBUM)).toEqual(IMMICH);
    expect(parentOf(IMMICH)).toEqual(PICTURES);
  });

  it("back goes album → albums → pictures step", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);
    navigator.open(PICTURES);
    navigator.open(IMMICH);
    navigator.open(ALBUM);

    navigator.back();
    history.deliverPop();
    expect(navigator.route).toEqual(IMMICH);
    navigator.back();
    history.deliverPop();
    expect(navigator.route).toEqual(PICTURES);
  });

  it("returns to start after a reload, as the selection lived in memory", () => {
    expect(new Navigator(new FakeHistory([START, PICTURES, IMMICH, ALBUM])).route).toEqual(START);
  });

  it("reads the browser's routes back and rejects an album id that is not one", () => {
    expect(parseRoute({ screen: "immich", albumId: null, slideshowId: null })).toEqual(IMMICH);
    expect(parseRoute({ screen: "immich", albumId: "a1", slideshowId: null })).toEqual(ALBUM);
    expect(parseRoute({ screen: "immich", albumId: 7, slideshowId: null })).toBeNull();
    expect(parseRoute({ screen: "immich", slideshowId: null })).toBeNull();
  });
});
