import { describe, expect, it } from "vitest";
import type { StoredPicture } from "../library/stored-slideshow";
import { pictureLayoutSummaries } from "./picture-layout-summary";

function picture(id: string, width: number, height: number): StoredPicture {
  return { id, capturedAt: "2025-07-01T10:00:00Z", fileName: `${id}.jpg`, width, height };
}

const portrait = (id: string) => picture(id, 300, 400);
const landscape = (id: string) => picture(id, 400, 300);

describe("pictureLayoutSummaries", () => {
  it("names each pair picture's partner by number, one-based", () => {
    const summaries = pictureLayoutSummaries([portrait("a"), portrait("b")], undefined);

    expect(summaries).toEqual([
      { pairedWithNumber: 2, blurredFill: false },
      { pairedWithNumber: 1, blurredFill: false },
    ]);
  });

  it("gives a lone portrait picture a blurred fill against the 16:9 reference screen", () => {
    const summaries = pictureLayoutSummaries([landscape("a"), portrait("b")], undefined);

    expect(summaries).toEqual([
      { pairedWithNumber: null, blurredFill: false },
      { pairedWithNumber: null, blurredFill: true },
    ]);
  });

  it("gives every single picture no blurred fill once fill-screen covers every slide", () => {
    const summaries = pictureLayoutSummaries([portrait("a"), portrait("b")], "fill-screen");

    expect(summaries).toEqual([
      { pairedWithNumber: null, blurredFill: false },
      { pairedWithNumber: null, blurredFill: false },
    ]);
  });

  it("leaves a landscape picture without a blurred fill: cropping loses little of it", () => {
    const summaries = pictureLayoutSummaries([landscape("a")], undefined);

    expect(summaries).toEqual([{ pairedWithNumber: null, blurredFill: false }]);
  });
});
