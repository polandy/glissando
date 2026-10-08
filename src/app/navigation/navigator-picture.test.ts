import { describe, expect, it } from "vitest";
import { FakeHistory } from "../testing/fake-history";
import { Navigator, type Route } from "./navigator";
import { parseRoute } from "./route";

const START: Route = { screen: "start" };
const SHOW: Route = { screen: "slideshow", slideshowId: "s1" };
const PICTURE_A: Route = { screen: "picture", slideshowId: "s1", pictureId: "a" };
const PICTURE_B: Route = { screen: "picture", slideshowId: "s1", pictureId: "b" };

describe("Navigator, the picture editor", () => {
  it("opens a picture one level below its slideshow, with its own history entry", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);
    navigator.open(SHOW);

    navigator.open(PICTURE_A);

    expect(navigator.route).toEqual(PICTURE_A);
    expect(history.entries).toEqual([START, SHOW, PICTURE_A]);
  });

  it("goes from one picture to the next in place, so back still leads to the slideshow", () => {
    const history = new FakeHistory();
    const navigator = new Navigator(history);
    navigator.open(SHOW);
    navigator.open(PICTURE_A);

    navigator.open(PICTURE_B);
    history.deliverPop();

    expect(navigator.route).toEqual(PICTURE_B);
    expect(history.entries).toEqual([START, SHOW, PICTURE_B]);
  });

  it("restores the picture editor after a reload", () => {
    expect(new Navigator(new FakeHistory([START, SHOW, PICTURE_A])).route).toEqual(PICTURE_A);
  });

  it.each([
    ["no picture id", { screen: "picture", slideshowId: "s1" }],
    ["an empty picture id", { screen: "picture", slideshowId: "s1", pictureId: "" }],
    ["no slideshow id", { screen: "picture", pictureId: "a" }],
  ])("reads a picture route with %s as unknown", (_, state) => {
    expect(parseRoute(state)).toBeNull();
  });
});
