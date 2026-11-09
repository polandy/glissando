import { describe, expect, it } from "vitest";
import { SlideshowSheets, type OpenSheet } from "./slideshow-sheets.svelte";

function sheetsRecordingCloses() {
  const closed: OpenSheet[] = [];
  const sheets = new SlideshowSheets((sheet) => closed.push(sheet));
  return { sheets, closed };
}

describe("SlideshowSheets", () => {
  it("has no sheet open at first", () => {
    const { sheets } = sheetsRecordingCloses();

    expect(sheets.current).toBeNull();
  });

  it("keeps one sheet open at a time: opening another replaces it", () => {
    const { sheets, closed } = sheetsRecordingCloses();

    sheets.open({ kind: "look" });
    sheets.open({ kind: "chapter", anchorPictureId: "b" });

    expect(sheets.current).toEqual({ kind: "chapter", anchorPictureId: "b" });
    expect(closed).toEqual([]);
  });

  it("hands the closed sheet back on close, so focus can return to its opener", () => {
    const { sheets, closed } = sheetsRecordingCloses();
    sheets.open({ kind: "chapter", anchorPictureId: "b" });

    sheets.close();

    expect(sheets.current).toBeNull();
    expect(closed).toEqual([{ kind: "chapter", anchorPictureId: "b" }]);
  });

  it("hands nothing back on a hand-off, where the next step takes focus", () => {
    const { sheets, closed } = sheetsRecordingCloses();
    sheets.open({ kind: "focus" });
    sheets.open({ kind: "delete" });

    sheets.handOff();

    expect(sheets.current).toBeNull();
    expect(closed).toEqual([]);
  });

  it("hands nothing back when closing with no sheet open", () => {
    const { sheets, closed } = sheetsRecordingCloses();
    sheets.open({ kind: "share" });
    sheets.close();

    sheets.close();

    expect(closed).toEqual([{ kind: "share" }]);
  });
});
