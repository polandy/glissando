import { describe, expect, it } from "vitest";
import { InvalidOwnKenBurnsError, MAX_OWN_KEN_BURNS_ZOOM, checkOwnKenBurns } from "./own-ken-burns";

const framing = (zoom: number, centerX = 0.5, centerY = 0.5) => ({ zoom, centerX, centerY });

describe("checkOwnKenBurns", () => {
  it("accepts framings with a zoom from 1 to the maximum and a centre inside the picture", () => {
    const motion = { from: framing(1, 0, 1), to: framing(MAX_OWN_KEN_BURNS_ZOOM, 1, 0) };

    expect(checkOwnKenBurns(motion, "picture p1")).toEqual(motion);
  });

  it.each([
    ["a zoom below crop-to-fit", { from: framing(0.9), to: framing(1) }, "from.zoom"],
    ["a zoom above the maximum", { from: framing(1), to: framing(3.01) }, "to.zoom"],
    ["a centre left of the picture", { from: framing(1, -0.1), to: framing(1) }, "from.centerX"],
    ["a centre below the picture", { from: framing(1), to: framing(1, 0.5, 1.2) }, "to.centerY"],
    ["no number", { from: framing(Number.NaN), to: framing(1) }, "from.zoom"],
  ])("refuses %s, naming the field", (_, motion, field) => {
    expect(() => checkOwnKenBurns(motion, "picture p1")).toThrow(InvalidOwnKenBurnsError);
    expect(() => checkOwnKenBurns(motion, "picture p1")).toThrow(`picture p1 kenBurns.${field}`);
  });

  it("keeps only from and to: an easing or unknown key is no part of a stored motion", () => {
    const motion = { from: framing(1), to: framing(2), easing: "linear" };

    expect(() => checkOwnKenBurns(motion, "picture p1")).toThrow("kenBurns.easing");
  });
});
