import { describe, expect, it } from "vitest";
import { PAIR_WEIGHT, slideOfPicture, slideUnits, timedUnit, type SlideUnit } from "./slide-units";
import type { StoredPicture } from "../library/stored-slideshow";

function portrait(id: string, overrides: Partial<StoredPicture> = {}): StoredPicture {
  return {
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    fileName: `${id}.jpg`,
    width: 300,
    height: 400,
    ...overrides,
  };
}

function landscape(id: string): StoredPicture {
  return { id, capturedAt: "2025-07-01T10:00:00Z", fileName: `${id}.jpg`, width: 400, height: 300 };
}

describe("slideUnits", () => {
  it("pairs two consecutive portrait pictures when automatic", () => {
    const units = slideUnits([portrait("a"), portrait("b")], undefined);

    expect(units).toEqual([{ pictureIndices: [0, 1] }]);
  });

  it("keeps a landscape picture single", () => {
    const units = slideUnits([landscape("a"), portrait("b"), portrait("c")], undefined);

    expect(units).toEqual([{ pictureIndices: [0] }, { pictureIndices: [1, 2] }]);
  });

  it("never reorders: an unpaired portrait leaves a following one single too", () => {
    const units = slideUnits([portrait("a"), landscape("b"), portrait("c")], undefined);

    expect(units).toEqual([
      { pictureIndices: [0] },
      { pictureIndices: [1] },
      { pictureIndices: [2] },
    ]);
  });

  it("keeps a portrait picture with an own Ken Burns single", () => {
    const own = portrait("a", {
      kenBurns: {
        from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
        to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
      },
    });
    const units = slideUnits([own, portrait("b")], undefined);

    expect(units).toEqual([{ pictureIndices: [0] }, { pictureIndices: [1] }]);
  });

  it("keeps a portrait picture with a caption single", () => {
    const units = slideUnits([portrait("a", { caption: "Jetty" }), portrait("b")], undefined);

    expect(units).toEqual([{ pictureIndices: [0] }, { pictureIndices: [1] }]);
  });

  it("keeps a portrait picture with an own duration single", () => {
    const units = slideUnits([portrait("a", { durationMs: 8000 }), portrait("b")], undefined);

    expect(units).toEqual([{ pictureIndices: [0] }, { pictureIndices: [1] }]);
  });

  it("keeps a portrait picture with an own transition single", () => {
    const units = slideUnits([portrait("a", { transition: "cut" }), portrait("b")], undefined);

    expect(units).toEqual([{ pictureIndices: [0] }, { pictureIndices: [1] }]);
  });

  it("keeps a picture marked alone single", () => {
    const units = slideUnits([portrait("a", { alone: true }), portrait("b")], undefined);

    expect(units).toEqual([{ pictureIndices: [0] }, { pictureIndices: [1] }]);
  });

  it("composes no pairs with one-at-a-time", () => {
    const units = slideUnits([portrait("a"), portrait("b")], "one-at-a-time");

    expect(units).toEqual([{ pictureIndices: [0] }, { pictureIndices: [1] }]);
  });

  it("composes no pairs with fill-screen", () => {
    const units = slideUnits([portrait("a"), portrait("b")], "fill-screen");

    expect(units).toEqual([{ pictureIndices: [0] }, { pictureIndices: [1] }]);
  });
});

describe("slideOfPicture", () => {
  it("maps a picture index to the slide unit that holds it", () => {
    const units = slideUnits([landscape("a"), portrait("b"), portrait("c")], undefined);

    expect(slideOfPicture(units, 0)).toBe(0);
    expect(slideOfPicture(units, 1)).toBe(1);
    expect(slideOfPicture(units, 2)).toBe(1);
  });

  it("fails loud for a picture index no slide holds", () => {
    const units = slideUnits([landscape("a")], undefined);

    expect(() => slideOfPicture(units, 5)).toThrow(RangeError);
  });
});

describe("timedUnit", () => {
  it("is the pair weight for a pair, which never has an own duration", () => {
    const pictures = [portrait("a"), portrait("b")];
    const [pair] = slideUnits(pictures, undefined) as [SlideUnit];

    expect(timedUnit(pictures, pair)).toEqual({ weight: PAIR_WEIGHT });
  });

  it("keeps a single picture's own duration", () => {
    const pictures = [landscape("a"), portrait("b", { durationMs: 4000 })];
    const [, single] = slideUnits(pictures, undefined) as [SlideUnit, SlideUnit];

    expect(timedUnit(pictures, single)).toEqual({ durationMs: 4000 });
  });
});
