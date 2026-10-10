import { describe, expect, it } from "vitest";
import { PictureMissingFromImmichError } from "../../server-library/server-slideshow-store";
import { reportUnlessMissingFromImmich } from "./missing-thumbnails";

describe("reportUnlessMissingFromImmich", () => {
  it("reports any other error but leaves a picture gone from Immich unreported", () => {
    const reported: unknown[] = [];
    const other = new Error("the thumbnail could not be read");
    const report = reportUnlessMissingFromImmich((error) => reported.push(error));

    report(other);
    report(new PictureMissingFromImmichError("gone"));

    expect(reported).toEqual([other]);
  });
});
