import { describe, expect, it } from "vitest";
import { autoKenBurns } from "../../compose";
import type { StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import { pictureEditorView } from "./picture-editor-view";

const own = {
  from: { zoom: 2, centerX: 0.3, centerY: 0.5 },
  to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
};
const stored: StoredSlideshow = {
  id: "show",
  title: "Juli 2025",
  createdAt: "2026-10-08T12:00:00Z",
  pictures: [
    { id: "p1", capturedAt: "2025-07-01T10:00:00Z", width: 300, height: 200, fileName: "a.jpg" },
    {
      id: "p2",
      capturedAt: "2025-07-02T10:00:00Z",
      width: 300,
      height: 200,
      fileName: "b.jpg",
      kenBurns: own,
      caption: "Am Steg",
    },
    { id: "p3", capturedAt: "2025-07-03T10:00:00Z", width: 200, height: 300, fileName: "c.jpg" },
  ],
  secondsPerPicture: 4,
};

function withPicture(index: number, changes: Partial<StoredPicture>): StoredSlideshow {
  return {
    ...stored,
    pictures: stored.pictures.map((picture, at) =>
      at === index ? { ...picture, ...changes } : picture,
    ),
  };
}

function music(durationMs: number) {
  return { id: "m", fileName: "m.mp3", durationMs, mimeType: "audio/mpeg" };
}

describe("pictureEditorView", () => {
  it("shows an automatic picture's motion for its position, its place and neighbours", () => {
    const automatic = autoKenBurns(0, stored.pictures[0] as StoredPicture);

    const view = pictureEditorView(stored, "p1");

    expect(view).toEqual({
      id: "p1",
      number: 1,
      count: 3,
      fileName: "a.jpg",
      capturedAt: "2025-07-01T10:00:00Z",
      size: { width: 300, height: 200 },
      motion: { from: automatic.from, to: automatic.to },
      ownMotion: false,
      durationMs: 4000,
      ownDuration: false,
      durationBasis: { kind: "seconds-per-picture", automaticMs: 4000 },
      transition: { choice: "crossfade", own: false, automatic: "crossfade", durationMs: 1000 },
      caption: "",
      previousId: null,
      nextId: "p2",
      next: {
        size: { width: 300, height: 200 },
        motion: own,
        durationMs: 4000,
        caption: "Am Steg",
      },
    });
  });

  it("shows a picture's own motion", () => {
    const view = pictureEditorView(stored, "p2");

    expect(view.motion).toEqual(own);
    expect(view.ownMotion).toBe(true);
    expect([view.previousId, view.nextId]).toEqual(["p1", "p3"]);
  });

  it("shows a picture's caption", () => {
    expect(pictureEditorView(stored, "p2").caption).toBe("Am Steg");
  });

  it("plays the slide's real duration, as the music sets it", () => {
    const withMusic = {
      ...stored,
      music: { id: "m", fileName: "m.mp3", durationMs: 30_000, mimeType: "audio/mpeg" },
    };

    expect(pictureEditorView(withMusic, "p3").durationMs).toBe(10_000);
  });

  it("shows an own duration and still names the automatic one", () => {
    const timed = withPicture(1, { durationMs: 8000 });

    const view = pictureEditorView(timed, "p2");

    expect(view.durationMs).toBe(8000);
    expect(view.ownDuration).toBe(true);
    expect(view.durationBasis).toEqual({ kind: "seconds-per-picture", automaticMs: 4000 });
  });

  it("with music, counts the pictures sharing the rest and names their share", () => {
    const timed = { ...withPicture(1, { durationMs: 8000 }), music: music(30_000) };

    expect(pictureEditorView(timed, "p2").durationBasis).toEqual({
      kind: "music",
      automaticCount: 2,
      shareMs: 11_000,
      clamped: false,
    });
    expect(pictureEditorView(timed, "p1").durationBasis).toEqual({
      kind: "music",
      automaticCount: 2,
      shareMs: 11_000,
      clamped: false,
    });
  });

  it("with music and every picture timed, names no share", () => {
    const all = {
      ...stored,
      pictures: stored.pictures.map((picture) => ({ ...picture, durationMs: 3000 })),
      music: music(30_000),
    };

    expect(pictureEditorView(all, "p1").durationBasis).toEqual({
      kind: "music",
      automaticCount: 0,
      shareMs: null,
      clamped: false,
    });
  });

  it("with music, marks the automatic pictures clamped once the own durations use it up", () => {
    const outlasted = { ...withPicture(1, { durationMs: 15_000 }), music: music(17_000) };

    expect(pictureEditorView(outlasted, "p1").durationBasis).toEqual({
      kind: "music",
      automaticCount: 2,
      shareMs: 2000,
      clamped: true,
    });
  });

  it("shows an own transition beside the automatic one, its length from the duration", () => {
    const timed = withPicture(1, { transition: "dissolve", durationMs: 2000 });

    expect(pictureEditorView(timed, "p2").transition).toEqual({
      choice: "dissolve",
      own: true,
      automatic: "push-left",
      durationMs: 600,
    });
  });

  it("gives a cut no length", () => {
    const cut = withPicture(0, { transition: "cut" });

    expect(pictureEditorView(cut, "p1").transition).toMatchObject({ choice: "cut", durationMs: 0 });
  });

  it("at the last picture, keeps a stored transition but plays none and has no next", () => {
    const last = withPicture(2, { transition: "zoom-in" });

    const view = pictureEditorView(last, "p3");

    expect(view.transition).toEqual({
      choice: "zoom-in",
      own: true,
      automatic: "wipe-right",
      durationMs: 0,
    });
    expect(view.next).toBeNull();
  });

  it("refuses a picture the slideshow does not hold", () => {
    expect(() => pictureEditorView(stored, "gone")).toThrow(/gone/);
  });
});
