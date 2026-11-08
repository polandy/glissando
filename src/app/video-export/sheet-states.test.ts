import { describe, expect, it } from "vitest";
import type { VideoExportResult } from "../../video-export";
import { failedState, outcomeState } from "./sheet-states";

describe("outcomeState", () => {
  const file = new File(["mp4"], "Sommer.mp4");
  const run = (result: VideoExportResult) =>
    outcomeState({
      preset: "1080p",
      framesTotal: 100,
      estimate: 1000,
      delivery: () => "share",
      result,
    });

  it("maps a finished export to the done state with its delivery", () => {
    expect(run({ kind: "done", frames: 100, file })).toEqual({
      kind: "done",
      preset: "1080p",
      file,
      delivery: "share",
    });
  });

  it("maps a full storage to the bytes still missing", () => {
    expect(run({ kind: "storage-full", frameReached: 25 })).toEqual({
      kind: "storage-full",
      preset: "1080p",
      frameReached: 25,
      framesTotal: 100,
      missingBytes: 750,
    });
  });

  it("maps a failed export to the failed state", () => {
    const error = new Error("encoder broke");
    expect(run({ kind: "failed", error })).toEqual({ kind: "failed", error });
  });

  it("maps a cancelled export to no state", () => {
    expect(run({ kind: "cancelled" })).toBeNull();
  });
});

describe("failedState", () => {
  it("wraps a thrown non-error in an Error", () => {
    expect(failedState("boom")).toEqual({ kind: "failed", error: new Error("boom") });
  });
});
