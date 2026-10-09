import { describe, expect, it } from "vitest";
import { FakeHistory } from "../testing/fake-history";
import { Navigator, type Route } from "./navigator";
import { parentOf, parseRoute } from "./route";

const START: Route = { screen: "start" };
const SHOW: Route = { screen: "slideshow", slideshowId: "s1" };
const MUSIC: Route = { screen: "music", slideshowId: "s1" };

describe("Navigator, the music editor", () => {
  it("opens the music one level below its slideshow, with its own history entry", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);
    navigator.open(SHOW);

    navigator.open(MUSIC);

    expect(navigator.route).toEqual(MUSIC);
    expect(history.entries).toEqual([START, SHOW, MUSIC]);
    expect(parentOf(MUSIC)).toEqual(SHOW);
  });

  it("back returns to the slideshow", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);
    navigator.open(SHOW);
    navigator.open(MUSIC);

    navigator.back();
    history.deliverPop();

    expect(navigator.route).toEqual(SHOW);
  });

  it("restores the music editor after a reload", () => {
    expect(new Navigator(new FakeHistory([START, SHOW, MUSIC])).route).toEqual(MUSIC);
  });

  it("reads a music route without a slideshow id as unknown", () => {
    expect(parseRoute({ screen: "music" })).toBeNull();
  });
});
