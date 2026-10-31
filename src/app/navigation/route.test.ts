import { describe, expect, it } from "vitest";
import { ancestorAt, type Route } from "./route";

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
