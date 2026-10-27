import { describe, expect, it } from "vitest";
import { lookSwatchColour } from "./look-swatch-colour";

describe("lookSwatchColour", () => {
  it("shows no swatch for None, which has no grade to show", () => {
    expect(lookSwatchColour("none")).toBeNull();
  });

  it("grades the neutral reference grey through warm's own matrix and curve", () => {
    // Matrix: R = 1.08·.5+.02·.5+.015 = .565, G = .01·.5+1.01·.5+.008 = .518, B = .86·.5 = .43.
    // Curve: R knots .53,.78 at t=.26 → .595; G knots .51,.76 at t=.072 → .528;
    // B knots .23,.47 at t=.72 → .4028. ×255 and rounded: 152, 135, 103.
    expect(lookSwatchColour("warm")).toBe("rgb(152 135 103)");
  });

  it("grades the same reference grey differently under a different look", () => {
    expect(lookSwatchColour("cool")).toBe("rgb(112 135 159)");
  });
});
