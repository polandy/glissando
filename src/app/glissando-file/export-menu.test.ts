import { describe, expect, it } from "vitest";
import { exportMenuState } from "./export-menu";

describe("exportMenuState", () => {
  it("offers the export with the measured size while none runs", () => {
    expect(exportMenuState(null, "a", 1000)).toEqual({ kind: "idle", sizeBytes: 1000 });
  });

  it("shows this slideshow's export running with its progress", () => {
    const running = { slideshowId: "a", title: "A", fraction: 0.5 };
    expect(exportMenuState(running, "a", null)).toEqual({ kind: "this", fraction: 0.5 });
  });

  it("waits while another slideshow exports", () => {
    const running = { slideshowId: "b", title: "B", fraction: 0.5 };
    expect(exportMenuState(running, "a", 1000)).toEqual({ kind: "other" });
  });
});
