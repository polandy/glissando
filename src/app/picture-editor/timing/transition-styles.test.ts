import { describe, expect, it } from "vitest";
import { transitionStyles } from "./transition-styles";

const viewport = { width: 320, height: 180 };

describe("transitionStyles", () => {
  it("crossfade fades the next picture in over this one", () => {
    const { from, to } = transitionStyles("crossfade", 0.25, viewport);

    expect(from.opacity).toBe("1");
    expect(to.opacity).toBe("0.25");
  });

  it("push moves both pictures left by the progress", () => {
    const { from, to } = transitionStyles("push-left", 0.25, viewport);

    expect(from.transform).toBe("translateX(-25%)");
    expect(to.transform).toBe("translateX(75%)");
  });

  it("wipe reveals the next picture from the left behind a soft edge", () => {
    const { from, to } = transitionStyles("wipe-right", 0.5, viewport);

    expect(from.maskImage).toBe("none");
    expect(to.maskImage).toBe("linear-gradient(to right, #000 48%, transparent 52%)");
  });

  it("circle opens from the centre to the farthest corner behind a soft edge", () => {
    const { to } = transitionStyles("circle-open", 1, viewport);
    // The corner lies half the diagonal away; the soft edge is 4 % of the height.
    const cornerPx = Math.hypot(160, 90);

    expect(to.maskImage).toBe(
      `radial-gradient(circle at center, #000 ${cornerPx}px, transparent ${cornerPx + 7.2}px)`,
    );
  });

  it("zoom enlarges this picture from the centre while the next fades in smoothly", () => {
    const { from, to } = transitionStyles("zoom-in", 0.5, viewport);

    expect(from.transform).toBe("scale(1.5)");
    expect(to.opacity).toBe("0.5");
  });

  it("dissolve reveals more cells of the next picture as it runs", () => {
    const cells = (progress: number) =>
      (transitionStyles("dissolve", progress, viewport).to.clipPath.match(/M/g) ?? []).length;

    expect(cells(0)).toBe(0);
    expect(cells(0.5)).toBeGreaterThan(0);
    expect(cells(0.5)).toBeLessThan(cells(0.9));
    expect(cells(1)).toBe(16 * 9);
  });

  it("leaves every property set, so nothing of an earlier effect stays", () => {
    const { from, to } = transitionStyles("crossfade", 0.5, viewport);

    for (const layer of [from, to]) {
      expect(Object.keys(layer).sort()).toEqual(["clipPath", "maskImage", "opacity", "transform"]);
    }
  });
});
