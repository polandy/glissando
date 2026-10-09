import { describe, expect, it } from "vitest";
import { autoKenBurns } from "../../compose";
import type { StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import type { PictureFocus } from "../../library/picture-focus";
import { NO_FOCUS_KNOWN } from "../focus/pictures-focus";
import { pictureEditorView } from "./picture-editor-view";

const FACES: PictureFocus = { kind: "subject", box: { x: 0.6, y: 0.1, width: 0.3, height: 0.3 } };

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
  it("aims an automatic picture's motion, and the next one's, at their focus", () => {
    const [first, second, third] = stored.pictures as [StoredPicture, StoredPicture, StoredPicture];
    const focus = {
      found: new Map([
        ["p1", FACES],
        ["p3", FACES],
      ]),
      searching: new Set<string>(),
    };

    const view = pictureEditorView(stored, "p1", focus);
    const next = pictureEditorView(stored, "p2", focus).next;

    const aimed = autoKenBurns(0, first, FACES);
    expect(view.motion).toEqual({ from: aimed.from, to: aimed.to });
    expect(view.next?.motion).toEqual(second.kenBurns);
    const nextAimed = autoKenBurns(2, third, FACES);
    expect(next?.motion).toEqual({ from: nextAimed.from, to: nextAimed.to });
  });

  it.each([
    ["the subject found", { found: new Map([["p1", FACES]]), searching: new Set<string>() }, FACES],
    [
      "nothing found",
      { found: new Map([["p1", { kind: "none" } as const]]), searching: new Set<string>() },
      { kind: "none" },
    ],
    ["the search", { found: new Map(), searching: new Set(["p1"]) }, { kind: "searching" }],
  ])("shows %s for the picture's focus", (_, focus, status) => {
    expect(pictureEditorView(stored, "p1", focus).focus).toEqual(status);
  });

  it("shows an automatic picture's motion for its position, its place and neighbours", () => {
    const automatic = autoKenBurns(0, stored.pictures[0] as StoredPicture);

    const view = pictureEditorView(stored, "p1", NO_FOCUS_KNOWN);

    expect(view).toEqual({
      id: "p1",
      number: 1,
      count: 3,
      fileName: "a.jpg",
      capturedAt: "2025-07-01T10:00:00Z",
      size: { width: 300, height: 200 },
      motion: { from: automatic.from, to: automatic.to },
      ownMotion: false,
      focus: { kind: "not-looked-at" },
      durationMs: 4000,
      ownDuration: false,
      durationBasis: { kind: "seconds-per-picture", automaticMs: 4000 },
      transition: {
        choice: "crossfade",
        own: false,
        automatic: "crossfade",
        slideshowTransition: "crossfade",
        durationMs: 1000,
      },
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
    const view = pictureEditorView(stored, "p2", NO_FOCUS_KNOWN);

    expect(view.motion).toEqual(own);
    expect(view.ownMotion).toBe(true);
    expect([view.previousId, view.nextId]).toEqual(["p1", "p3"]);
  });

  it("shows a picture's caption", () => {
    expect(pictureEditorView(stored, "p2", NO_FOCUS_KNOWN).caption).toBe("Am Steg");
  });

  it("plays the slide's real duration, as the music sets it", () => {
    const withMusic = {
      ...stored,
      music: { id: "m", fileName: "m.mp3", durationMs: 30_000, mimeType: "audio/mpeg" },
    };

    expect(pictureEditorView(withMusic, "p3", NO_FOCUS_KNOWN).durationMs).toBe(10_000);
  });

  it("shows an own duration and still names the automatic one", () => {
    const timed = withPicture(1, { durationMs: 8000 });

    const view = pictureEditorView(timed, "p2", NO_FOCUS_KNOWN);

    expect(view.durationMs).toBe(8000);
    expect(view.ownDuration).toBe(true);
    expect(view.durationBasis).toEqual({ kind: "seconds-per-picture", automaticMs: 4000 });
  });

  it("with music, counts the pictures sharing the rest and names their share", () => {
    const timed = { ...withPicture(1, { durationMs: 8000 }), music: music(30_000) };

    expect(pictureEditorView(timed, "p2", NO_FOCUS_KNOWN).durationBasis).toEqual({
      kind: "music",
      automaticCount: 2,
      shareMs: 11_000,
      clamped: false,
    });
    expect(pictureEditorView(timed, "p1", NO_FOCUS_KNOWN).durationBasis).toEqual({
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

    expect(pictureEditorView(all, "p1", NO_FOCUS_KNOWN).durationBasis).toEqual({
      kind: "music",
      automaticCount: 0,
      shareMs: null,
      clamped: false,
    });
  });

  it("with music, marks the automatic pictures clamped once the own durations use it up", () => {
    const outlasted = { ...withPicture(1, { durationMs: 15_000 }), music: music(17_000) };

    expect(pictureEditorView(outlasted, "p1", NO_FOCUS_KNOWN).durationBasis).toEqual({
      kind: "music",
      automaticCount: 2,
      shareMs: 2000,
      clamped: true,
    });
  });

  it("with trimmed music, shares the excerpt rather than the whole track", () => {
    const trimmed = {
      ...withPicture(1, { durationMs: 8000 }),
      music: { ...music(60_000), trim: { startMs: 10_000, endMs: 40_000 } },
    };

    expect(pictureEditorView(trimmed, "p1", NO_FOCUS_KNOWN).durationBasis).toMatchObject({
      shareMs: 11_000,
    });
  });

  it("with trimmed music, marks the pictures clamped against the excerpt", () => {
    const trimmed = {
      ...withPicture(1, { durationMs: 15_000 }),
      music: { ...music(60_000), trim: { startMs: 0, endMs: 17_000 } },
    };

    expect(pictureEditorView(trimmed, "p1", NO_FOCUS_KNOWN).durationBasis).toMatchObject({
      clamped: true,
    });
  });

  it("shows an own transition beside the automatic one, its length from the duration", () => {
    const timed = withPicture(1, { transition: "dissolve", durationMs: 2000 });

    expect(pictureEditorView(timed, "p2", NO_FOCUS_KNOWN).transition).toEqual({
      choice: "dissolve",
      own: true,
      automatic: "crossfade",
      slideshowTransition: "crossfade",
      durationMs: 600,
    });
  });

  it("plays the slideshow's default while the picture has no transition of its own", () => {
    const view = pictureEditorView({ ...stored, transition: "circle-open" }, "p2", NO_FOCUS_KNOWN);

    expect(view.transition).toEqual({
      choice: "circle-open",
      own: false,
      automatic: "circle-open",
      slideshowTransition: "circle-open",
      durationMs: 1000,
    });
  });

  it("plays the effect for the position while the slideshow alternates", () => {
    const view = pictureEditorView({ ...stored, transition: "alternate" }, "p2", NO_FOCUS_KNOWN);

    expect(view.transition).toMatchObject({
      choice: "push-left",
      own: false,
      automatic: "push-left",
      slideshowTransition: "alternate",
    });
  });

  it("gives an automatic cut no length while the slideshow cuts", () => {
    const view = pictureEditorView({ ...stored, transition: "cut" }, "p1", NO_FOCUS_KNOWN);

    expect(view.transition).toMatchObject({ choice: "cut", automatic: "cut", durationMs: 0 });
  });

  it("gives a cut no length", () => {
    const cut = withPicture(0, { transition: "cut" });

    expect(pictureEditorView(cut, "p1", NO_FOCUS_KNOWN).transition).toMatchObject({
      choice: "cut",
      durationMs: 0,
    });
  });

  it("at the last picture, keeps a stored transition but plays none and has no next", () => {
    const last = withPicture(2, { transition: "zoom-in" });

    const view = pictureEditorView(last, "p3", NO_FOCUS_KNOWN);

    expect(view.transition).toEqual({
      choice: "zoom-in",
      own: true,
      automatic: "crossfade",
      slideshowTransition: "crossfade",
      durationMs: 0,
    });
    expect(view.next).toBeNull();
  });

  it("refuses a picture the slideshow does not hold", () => {
    expect(() => pictureEditorView(stored, "gone", NO_FOCUS_KNOWN)).toThrow(/gone/);
  });
});
