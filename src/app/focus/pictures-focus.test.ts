import { describe, expect, it } from "vitest";
import type { FocusPassState } from "../../library/focus-pass";
import type { PictureFocus, StoredFocus } from "../../library/picture-focus";
import { FOCUS_DETECTOR_VERSION } from "../../focus/focus-detector-version";
import {
  focusSlideshowSummary,
  focusStatus,
  outdatedIds,
  pictureFocusDisplay,
  picturesFocus,
} from "./pictures-focus";

const FACES: PictureFocus = {
  kind: "subject",
  box: { x: 0.2, y: 0.1, width: 0.3, height: 0.4 },
  foundBy: "face",
};
const OBJECT: PictureFocus = {
  kind: "subject",
  box: { x: 0.2, y: 0.1, width: 0.3, height: 0.4 },
  foundBy: "object",
};
const IMMICH: PictureFocus = {
  kind: "subject",
  box: { x: 0.2, y: 0.1, width: 0.3, height: 0.4 },
  foundBy: "immich-faces",
};
const SCENERY: PictureFocus = { kind: "scenery" };
const NOTHING: PictureFocus = { kind: "none" };

function passState(change: Partial<FocusPassState> = {}): FocusPassState {
  return {
    running: false,
    paused: false,
    slideshows: new Map(),
    searching: new Set(),
    found: new Map(),
    failed: new Set(),
    ...change,
  };
}

describe("picturesFocus", () => {
  it("knows the focus stored when the slideshow was opened and what the pass found since", () => {
    const focus = picturesFocus(
      new Map([["stored", NOTHING]]),
      passState({ found: new Map([["found-since", FACES]]) }),
    );

    expect(focus.found.get("stored")).toEqual(NOTHING);
    expect(focus.found.get("found-since")).toEqual(FACES);
  });

  it("takes the pass's searching pictures over", () => {
    const focus = picturesFocus(new Map(), passState({ searching: new Set(["queued"]) }));

    expect(focus.searching).toEqual(new Set(["queued"]));
  });
});

describe("focusStatus", () => {
  const focus = picturesFocus(
    new Map<string, PictureFocus>([
      ["faces", FACES],
      ["landscape", NOTHING],
    ]),
    passState({ searching: new Set(["queued"]) }),
  );

  it.each([
    ["faces", FACES],
    ["landscape", NOTHING],
    ["queued", { kind: "searching" }],
    ["failed", { kind: "not-looked-at" }],
  ])("tells for picture %s: %o", (pictureId, status) => {
    expect(focusStatus(focus, pictureId)).toEqual(status);
  });
});

describe("outdatedIds", () => {
  it("names the stored records from a detector older than the current one", () => {
    const stored = new Map<string, StoredFocus>([
      ["current", { focus: NOTHING, detector: FOCUS_DETECTOR_VERSION }],
      ["old", { focus: NOTHING, detector: FOCUS_DETECTOR_VERSION - 1 }],
    ]);

    expect(outdatedIds(stored)).toEqual(new Set(["old"]));
  });
});

describe("pictureFocusDisplay", () => {
  const noStored = new Map<string, PictureFocus>();
  const noOutdated = new Set<string>();

  it.each<
    [
      string,
      ReadonlyMap<string, PictureFocus>,
      FocusPassState,
      ReadonlySet<string>,
      boolean,
      string,
    ]
  >([
    ["failed", noStored, passState({ failed: new Set(["p1"]) }), noOutdated, false, "failed"],
    ["looking", noStored, passState({ searching: new Set(["p1"]) }), noOutdated, false, "looking"],
    ["waiting", noStored, passState(), noOutdated, false, "waiting"],
    ["waitingForServer", noStored, passState(), noOutdated, true, "waitingForServer"],
    ["outdated", new Map([["p1", FACES]]), passState(), new Set(["p1"]), false, "outdated"],
    ["a face", new Map([["p1", FACES]]), passState(), noOutdated, false, "face"],
    ["an object", new Map([["p1", OBJECT]]), passState(), noOutdated, false, "subject"],
    ["an Immich face", new Map([["p1", IMMICH]]), passState(), noOutdated, false, "immich"],
    ["scenery", new Map([["p1", SCENERY]]), passState(), noOutdated, false, "scenery"],
    ["nothing", new Map([["p1", NOTHING]]), passState(), noOutdated, false, "none"],
  ])("shows %s as %s", (_name, stored, pass, outdated, paused, status) => {
    const focus = picturesFocus(stored, pass, outdated);

    expect(pictureFocusDisplay(focus, "p1", false, paused).status).toBe(status);
  });

  it("carries the picture's own motion through untouched", () => {
    const focus = picturesFocus(new Map([["p1", FACES]]), passState());

    expect(pictureFocusDisplay(focus, "p1", true, false).ownMotion).toBe(true);
  });

  it("never calls a picture the pass already found since outdated, even if stored that way", () => {
    const focus = picturesFocus(
      new Map(),
      passState({ found: new Map([["p1", FACES]]) }),
      new Set(["p1"]),
    );

    expect(pictureFocusDisplay(focus, "p1", false, false).status).toBe("face");
  });
});

describe("focusSlideshowSummary", () => {
  it("counts each picture's status, and the pictures with their own motion", () => {
    const focus = picturesFocus(
      new Map<string, PictureFocus>([
        ["p1", FACES],
        ["p2", NOTHING],
      ]),
      passState({ failed: new Set(["p3"]) }),
    );
    const pictures = [
      { id: "p1", ownMotion: true },
      { id: "p2", ownMotion: false },
      { id: "p3", ownMotion: false },
    ];

    const summary = focusSlideshowSummary(
      focus,
      pictures,
      { done: 2, total: 3, again: false },
      false,
    );

    expect(summary.counts.face).toBe(1);
    expect(summary.counts.none).toBe(1);
    expect(summary.counts.failed).toBe(1);
    expect(summary.failedCount).toBe(1);
    expect(summary.ownMotionCount).toBe(1);
    expect(summary.done).toBe(2);
    expect(summary.total).toBe(3);
    expect(summary.again).toBe(false);
  });

  it("falls back to every picture done when the pass has no search entry for it", () => {
    const focus = picturesFocus(new Map([["p1", FACES]]), passState());

    const summary = focusSlideshowSummary(
      focus,
      [{ id: "p1", ownMotion: false }],
      undefined,
      false,
    );

    expect(summary.done).toBe(1);
    expect(summary.total).toBe(1);
  });
});
