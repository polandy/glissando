import { describe, expect, it } from "vitest";
import type { FocusBox, PictureFocus } from "../../library/picture-focus";
import type { FocusDisplayStatus, PictureFocusDisplay } from "../focus/pictures-focus";
import {
  focusIndication,
  focusLineText,
  focusLineView,
  type FocusLineView,
  focusResultKind,
} from "./focus-indication";

const FACE: FocusBox = { x: 0.6, y: 0.4, width: 0.12, height: 0.16 };

describe("focusIndication", () => {
  it("marks the subject box of an automatic motion, its chip above and from the box's left", () => {
    expect(focusIndication({ kind: "subject", box: FACE, foundBy: "face" }, false)).toEqual({
      kind: "marker",
      box: FACE,
      foundBy: "face",
      chip: { below: false, alignRight: false },
    });
  });

  it("puts the chip below a box too near the picture's top for it to fit above", () => {
    const high = { ...FACE, y: 0.05 };

    expect(focusIndication({ kind: "subject", box: high, foundBy: "face" }, false)).toMatchObject({
      chip: { below: true, alignRight: false },
    });
  });

  it("aligns the chip to the right of a box reaching close to the picture's right edge", () => {
    const right = { ...FACE, x: 0.75 };

    expect(focusIndication({ kind: "subject", box: right, foundBy: "face" }, false)).toMatchObject({
      chip: { below: false, alignRight: true },
    });
  });

  it("marks scenery as having no subject, as it has no box to show", () => {
    expect(focusIndication({ kind: "scenery" }, false)).toEqual({ kind: "no-subject" });
  });

  it("notes that no subject was found, and that one is being searched for", () => {
    expect(focusIndication({ kind: "none" }, false)).toEqual({ kind: "no-subject" });
    expect(focusIndication({ kind: "searching" }, false)).toEqual({ kind: "searching" });
  });

  it("shows nothing for a picture not looked at", () => {
    expect(focusIndication({ kind: "not-looked-at" }, false)).toEqual({ kind: "nothing" });
  });

  it("shows nothing of the focus while the picture has its own motion", () => {
    expect(focusIndication({ kind: "subject", box: FACE, foundBy: "face" }, true)).toEqual({
      kind: "nothing",
    });
    expect(focusIndication({ kind: "none" }, true)).toEqual({ kind: "nothing" });
    expect(focusIndication({ kind: "searching" }, true)).toEqual({ kind: "nothing" });
  });
});

describe("focusResultKind", () => {
  it.each<[PictureFocus, string]>([
    [{ kind: "subject", box: FACE, foundBy: "face" }, "face"],
    [{ kind: "subject", box: FACE, foundBy: "object" }, "subject"],
    [{ kind: "subject", box: FACE, foundBy: "immich-faces" }, "immich"],
    [{ kind: "scenery" }, "scenery"],
    [{ kind: "none" }, "none"],
  ])("names %o as %s", (found, kind) => {
    expect(focusResultKind(found)).toBe(kind);
  });
});

describe("focusLineView", () => {
  const display = (
    status: PictureFocusDisplay["status"],
    ownMotion = false,
  ): PictureFocusDisplay => ({
    status,
    ownMotion,
  });

  it("carries the status and own motion through", () => {
    expect(focusLineView(display("waiting"), undefined)).toEqual({
      status: "waiting",
      ownMotion: false,
      resultKind: null,
    });
    expect(focusLineView(display("failed", true), undefined)).toEqual({
      status: "failed",
      ownMotion: true,
      resultKind: null,
    });
  });

  it("names the result kind behind a fresh or outdated result", () => {
    const face: PictureFocus = { kind: "subject", box: FACE, foundBy: "face" };

    expect(focusLineView(display("face"), face)).toMatchObject({ resultKind: "face" });
    expect(focusLineView(display("outdated"), face)).toMatchObject({ resultKind: "face" });
  });
});

describe("focusLineText", () => {
  const line = (
    status: FocusDisplayStatus,
    resultKind: FocusLineView["resultKind"] = null,
    ownMotion = false,
  ): FocusLineView => ({ status, ownMotion, resultKind });

  it.each<[FocusDisplayStatus, string]>([
    ["face", "editor.focusFace"],
    ["subject", "editor.focusSubject"],
    ["immich", "editor.focusImmich"],
    ["scenery", "editor.focusScenery"],
    ["none", "editor.focusNone"],
    ["waiting", "editor.focusWaiting"],
    ["looking", "editor.searchingFocus"],
    ["failed", "editor.focusFailed"],
    ["waitingForServer", "editor.focusWaitingForServer"],
  ])("shows %s as %s", (status, textKey) => {
    const resultKind = ["face", "subject", "immich", "scenery", "none"].includes(status)
      ? (status as FocusLineView["resultKind"])
      : null;

    expect(focusLineText(line(status, resultKind)).textKey).toBe(textKey);
  });

  it.each<[string, string]>([
    ["face", "editor.focusOutdatedFace"],
    ["subject", "editor.focusOutdatedSubject"],
    ["immich", "editor.focusOutdatedImmich"],
    ["scenery", "editor.focusOutdatedScenery"],
    ["none", "editor.focusOutdatedNone"],
  ])("phrases outdated %s results by their own kind", (resultKind, textKey) => {
    expect(focusLineText(line("outdated", resultKind as FocusLineView["resultKind"])).textKey).toBe(
      textKey,
    );
  });

  it.each<[FocusDisplayStatus, string | null]>([
    ["face", "editor.lookAgain"],
    ["subject", "editor.lookAgain"],
    ["immich", "editor.lookAgain"],
    ["scenery", "editor.lookAgain"],
    ["none", "editor.lookAgain"],
    ["outdated", "editor.lookAgainNow"],
    ["waiting", "editor.lookNow"],
    ["failed", "editor.tryAgain"],
    ["looking", null],
    ["waitingForServer", null],
  ])("offers %s the action %s", (status, actionKey) => {
    const resultKind = ["face", "subject", "immich", "scenery", "none", "outdated"].includes(status)
      ? "face"
      : null;

    expect(focusLineText(line(status, resultKind as FocusLineView["resultKind"])).actionKey).toBe(
      actionKey,
    );
  });

  it("marks only the looking state as the pending pill", () => {
    expect(focusLineText(line("looking")).pending).toBe(true);
    expect(focusLineText(line("waiting")).pending).toBe(false);
    expect(focusLineText(line("face", "face")).pending).toBe(false);
  });

  it.each<[string, string]>([
    ["face", "editor.ownMotionFace"],
    ["subject", "editor.ownMotionSubject"],
    ["immich", "editor.ownMotionImmich"],
    ["scenery", "editor.ownMotionScenery"],
    ["none", "editor.ownMotionNone"],
  ])("replaces a %s result's line with the own-motion sentence", (resultKind, textKey) => {
    expect(
      focusLineText(line("face", resultKind as FocusLineView["resultKind"], true)).textKey,
    ).toBe(textKey);
  });

  it("keeps an outdated result's own-motion sentence by its underlying kind, not its staleness", () => {
    expect(focusLineText(line("outdated", "subject", true)).textKey).toBe(
      "editor.ownMotionSubject",
    );
  });

  it("leaves a status with no result yet unaffected by own motion", () => {
    expect(focusLineText(line("waiting", null, true)).textKey).toBe("editor.focusWaiting");
    expect(focusLineText(line("looking", null, true)).textKey).toBe("editor.searchingFocus");
    expect(focusLineText(line("failed", null, true)).textKey).toBe("editor.focusFailed");
    expect(focusLineText(line("waitingForServer", null, true)).textKey).toBe(
      "editor.focusWaitingForServer",
    );
  });
});
