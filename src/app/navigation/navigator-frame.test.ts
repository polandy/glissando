import { describe, expect, it } from "vitest";
import { FakeHistory } from "../testing/fake-history";
import { Navigator, type Route } from "./navigator";
import { parseRoute } from "./route";

const START: Route = { screen: "start" };
const FRAME_SETUP: Route = { screen: "frameSetup" };
const FRAME: Route = { screen: "frame", albumId: "album-1" };

describe("Navigator, the picture frame", () => {
  it("opens the set-up screen one level below start, with its own history entry", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);

    navigator.open(FRAME_SETUP);

    expect(navigator.route).toEqual(FRAME_SETUP);
    expect(history.entries).toEqual([START, FRAME_SETUP]);
  });

  it("starts the frame over start, replacing the set-up screen's entry", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);
    navigator.open(FRAME_SETUP);

    navigator.open(FRAME);
    history.deliverPop();

    expect(navigator.route).toEqual(FRAME);
    expect(history.entries).toEqual([START, FRAME]);
  });

  it("exits the running frame straight to start, not back to set-up", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);
    navigator.open(FRAME_SETUP);
    navigator.open(FRAME);
    history.deliverPop();

    navigator.back();
    history.deliverPop();

    expect(navigator.route).toEqual(START);
  });

  it("does not restore the running frame after a reload", () => {
    expect(new Navigator(new FakeHistory([START, FRAME])).route).toEqual(START);
  });

  it("does not let browser forward reopen the running frame", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);
    navigator.open(FRAME_SETUP);
    navigator.open(FRAME);
    history.deliverPop();

    navigator.back();
    history.deliverPop();
    // The browser's forward gesture replays the popped frame entry.
    history.deliverPop(1);

    expect(navigator.route).toEqual(START);
  });

  it.each([
    ["no album id", { screen: "frame" }],
    ["an empty album id", { screen: "frame", albumId: "" }],
  ])("reads a frame route with %s as unknown", (_, state) => {
    expect(parseRoute(state)).toBeNull();
  });

  it("reads the set-up screen route back", () => {
    expect(parseRoute({ screen: "frameSetup" })).toEqual(FRAME_SETUP);
  });
});
