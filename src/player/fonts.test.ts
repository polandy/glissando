import { describe, expect, it } from "vitest";
import { loadFonts, type Fonts, type FontSpec } from "./fonts";

function fakeFonts(): { fonts: Fonts; requested: string[] } {
  const requested: string[] = [];
  return {
    fonts: {
      load: (font: string) => {
        requested.push(font);
        return Promise.resolve();
      },
    },
    requested,
  };
}

describe("loadFonts", () => {
  it("loads every spec in the list, each as its own CSS font shorthand", async () => {
    const { fonts, requested } = fakeFonts();
    const specs: readonly FontSpec[] = [
      { family: "Instrument Serif", weight: 400, style: "normal" },
      { family: "Instrument Serif", weight: 400, style: "italic" },
    ];

    await loadFonts(fonts, specs);

    expect(requested).toEqual(["400 16px Instrument Serif", "italic 400 16px Instrument Serif"]);
  });

  it("settles only once every requested face has loaded", async () => {
    const order: string[] = [];
    let resolveSecond: (() => void) | undefined;
    const fonts: Fonts = {
      load: (font: string) => {
        if (font.includes("First")) {
          order.push("first requested");
          return Promise.resolve().then(() => order.push("first settled"));
        }
        order.push("second requested");
        return new Promise<void>((resolve) => {
          resolveSecond = () => {
            order.push("second settled");
            resolve();
          };
        });
      },
    };

    const settled = loadFonts(fonts, [
      { family: "First", weight: 400, style: "normal" },
      { family: "Second", weight: 400, style: "normal" },
    ]).then(() => order.push("loadFonts settled"));

    await Promise.resolve();
    expect(order).not.toContain("loadFonts settled");

    resolveSecond?.();
    await settled;

    expect(order.at(-1)).toBe("loadFonts settled");
  });

  it("can fail: a spec with no matching face rejects", async () => {
    const failing: Fonts = {
      load: () => Promise.reject(new Error("no such face")),
    };

    await expect(
      loadFonts(failing, [{ family: "Missing", weight: 400, style: "normal" }]),
    ).rejects.toThrow("no such face");
  });
});
