import { describe, expect, it } from "vitest";
import { ancestorAt, parseRoute, sameRoute, type Route } from "./route";

const START: Route = { screen: "start" };
const SHOW: Route = { screen: "slideshow", slideshowId: "s1" };
const PICTURE: Route = { screen: "picture", slideshowId: "s1", pictureId: "p1" };

describe("ancestorAt", () => {
  it("returns the route itself for zero levels and follows the parents otherwise", () => {
    expect(ancestorAt(PICTURE, 0)).toEqual(PICTURE);
    expect(ancestorAt(PICTURE, 1)).toEqual(SHOW);
    expect(ancestorAt(PICTURE, 2)).toEqual(START);
  });

  it("throws, naming the route and the level, when the path is shorter", () => {
    expect(() => ancestorAt(SHOW, 2)).toThrow(/"slideshow".*2 levels up/);
  });
});

describe("the player route", () => {
  const FROM_START: Route = { screen: "player", slideshowId: "s1" };
  const FROM_PICTURE: Route = { screen: "player", slideshowId: "s1", pictureId: "p1" };

  it("reads back from history state with or without a picture to start from", () => {
    expect(parseRoute({ screen: "player", slideshowId: "s1" })).toEqual(FROM_START);
    expect(parseRoute({ screen: "player", slideshowId: "s1", pictureId: "p1" })).toEqual(
      FROM_PICTURE,
    );
  });

  it.each([[""], [7], [null]])("is unknown for the picture id %j", (pictureId) => {
    expect(parseRoute({ screen: "player", slideshowId: "s1", pictureId })).toBeNull();
  });

  it("tells playing from a picture from playing from the start", () => {
    expect(sameRoute(FROM_START, FROM_PICTURE)).toBe(false);
    expect(sameRoute(FROM_PICTURE, { ...FROM_PICTURE })).toBe(true);
  });

  it("goes back to its slideshow", () => {
    expect(ancestorAt(FROM_PICTURE, 1)).toEqual(SHOW);
  });
});
