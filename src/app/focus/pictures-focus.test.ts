import { describe, expect, it } from "vitest";
import type { FocusPassState } from "../../library/focus-pass";
import type { PictureFocus } from "../../library/picture-focus";
import { focusStatus, picturesFocus } from "./pictures-focus";

const FACES: PictureFocus = { kind: "subject", box: { x: 0.2, y: 0.1, width: 0.3, height: 0.4 } };
const NOTHING: PictureFocus = { kind: "none" };

function passState(change: Partial<FocusPassState> = {}): FocusPassState {
  return {
    running: false,
    slideshows: new Map(),
    searching: new Set(),
    found: new Map(),
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
