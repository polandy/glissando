import { describe, expect, it } from "vitest";
import type { StoredPicture } from "../library/stored-slideshow";
import { pictureLayoutSummaries } from "./picture-layout-summary";

function picture(id: string, width: number, height: number): StoredPicture {
  return {
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    fileName: `${id}.jpg`,
    width,
    height,
    colours: { veil: "#404040", accent: "#C0C0C0" },
  };
}

const portrait = (id: string) => picture(id, 300, 400);
const landscape = (id: string) => picture(id, 400, 300);

describe("pictureLayoutSummaries", () => {
  it("names each pair picture's partner by number, one-based", () => {
    const summaries = pictureLayoutSummaries([portrait("a"), portrait("b")], undefined);

    expect(summaries).toEqual([
      { pairedWithNumber: 2, blurredFill: false, rejoinsWithNumber: null },
      { pairedWithNumber: 1, blurredFill: false, rejoinsWithNumber: null },
    ]);
  });

  it("gives a lone portrait picture a blurred fill against the 16:9 reference screen", () => {
    const summaries = pictureLayoutSummaries([landscape("a"), portrait("b")], undefined);

    expect(summaries).toEqual([
      { pairedWithNumber: null, blurredFill: false, rejoinsWithNumber: null },
      { pairedWithNumber: null, blurredFill: true, rejoinsWithNumber: null },
    ]);
  });

  it("gives every single picture no blurred fill once fill-screen covers every slide", () => {
    const summaries = pictureLayoutSummaries([portrait("a"), portrait("b")], "fill-screen");

    expect(summaries).toEqual([
      { pairedWithNumber: null, blurredFill: false, rejoinsWithNumber: null },
      { pairedWithNumber: null, blurredFill: false, rejoinsWithNumber: null },
    ]);
  });

  it("leaves a landscape picture without a blurred fill: cropping loses little of it", () => {
    const summaries = pictureLayoutSummaries([landscape("a")], undefined);

    expect(summaries).toEqual([
      { pairedWithNumber: null, blurredFill: false, rejoinsWithNumber: null },
    ]);
  });

  it("names the neighbour an alone picture would pair with again, once its mark is cleared", () => {
    const summaries = pictureLayoutSummaries(
      [portrait("a"), { ...portrait("b"), alone: true }, landscape("c")],
      undefined,
    );

    expect(summaries.map((summary) => summary.rejoinsWithNumber)).toEqual([null, 1, null]);
  });

  it("names no rejoin partner when the alone picture would stay single without its mark", () => {
    const summaries = pictureLayoutSummaries(
      [landscape("a"), { ...portrait("b"), alone: true }, landscape("c")],
      undefined,
    );

    expect(summaries.map((summary) => summary.rejoinsWithNumber)).toEqual([null, null, null]);
  });

  it("names no rejoin partner while the slideshow shows every picture on its own", () => {
    const summaries = pictureLayoutSummaries(
      [portrait("a"), { ...portrait("b"), alone: true }],
      "one-at-a-time",
    );

    expect(summaries.map((summary) => summary.rejoinsWithNumber)).toEqual([null, null]);
  });
});
