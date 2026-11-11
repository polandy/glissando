import { describe, expect, it } from "vitest";
import { FakeHistory } from "../testing/fake-history";
import { Navigator, type Route } from "./navigator";
import { parentOf, parseRoute } from "./route";

const START: Route = { screen: "start" };
const PICTURES: Route = { screen: "import", step: "pictures" };
const IMMICH: Route = { screen: "immich", opened: null, slideshowId: null };
const ALBUM: Route = { screen: "immich", opened: { kind: "album", id: "a1" }, slideshowId: null };
const PERSON: Route = {
  screen: "immich",
  opened: { kind: "person", id: "p1" },
  slideshowId: null,
};

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
    expect(parseRoute({ screen: "immich", opened: null, slideshowId: null })).toEqual(IMMICH);
    expect(
      parseRoute({ screen: "immich", opened: { kind: "album", id: "a1" }, slideshowId: null }),
    ).toEqual(ALBUM);
    expect(parseRoute({ screen: "immich", opened: 7, slideshowId: null })).toBeNull();
    expect(parseRoute({ screen: "immich", slideshowId: null })).toBeNull();
  });

  it("reads a person's route back and rejects a kind or id that is not one", () => {
    expect(
      parseRoute({ screen: "immich", opened: { kind: "person", id: "p1" }, slideshowId: null }),
    ).toEqual(PERSON);
    expect(
      parseRoute({ screen: "immich", opened: { kind: "folder", id: "p1" }, slideshowId: null }),
    ).toBeNull();
    expect(
      parseRoute({ screen: "immich", opened: { kind: "person", id: "" }, slideshowId: null }),
    ).toBeNull();
    expect(
      parseRoute({ screen: "immich", opened: { kind: "person" }, slideshowId: null }),
    ).toBeNull();
  });

  it("takes a person one level up to the browser, whose People tab it came from", () => {
    expect(parentOf(PERSON)).toEqual(IMMICH);
  });
});
