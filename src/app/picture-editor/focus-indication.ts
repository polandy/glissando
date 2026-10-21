import type { FocusBox, PictureFocus, SubjectFinder } from "../../library/picture-focus";
import type { MessageKey } from "../i18n/messages";
import type {
  FocusDisplayStatus,
  PictureFocusDisplay,
  PictureFocusStatus,
} from "../focus/pictures-focus";

/** Where the marker's chip sits, so it stays on the picture. */
interface ChipPlacement {
  readonly below: boolean;
  readonly alignRight: boolean;
}

/**
 * What the picture editor shows of the focus its automatic motion aims at: a marker on the
 * subject box (`foundBy` picks its chip and aria-label), a quiet note that there is none or that
 * it is being searched for, or nothing.
 */
export type FocusIndication =
  | {
      readonly kind: "marker";
      readonly box: FocusBox;
      readonly foundBy: SubjectFinder;
      readonly chip: ChipPlacement;
    }
  | { readonly kind: "no-subject" }
  | { readonly kind: "searching" }
  | { readonly kind: "nothing" };

/** A box starting this close to the picture's top leaves no room for the chip above it. */
const CHIP_ROOM_ABOVE = 0.14;
/** A box ending this far right leaves no room for the chip to run on from its left. */
const CHIP_ROOM_RIGHT = 0.82;

/** An own motion aims where its frames say: the focus is not shown then. */
export function focusIndication(focus: PictureFocusStatus, ownMotion: boolean): FocusIndication {
  if (ownMotion) {
    return { kind: "nothing" };
  }
  switch (focus.kind) {
    case "subject":
      return {
        kind: "marker",
        box: focus.box,
        foundBy: focus.foundBy,
        chip: {
          below: focus.box.y < CHIP_ROOM_ABOVE,
          alignRight: focus.box.x + focus.box.width > CHIP_ROOM_RIGHT,
        },
      };
    case "scenery":
    case "none":
      return { kind: "no-subject" };
    case "searching":
      return { kind: "searching" };
    case "not-looked-at":
      return { kind: "nothing" };
  }
}

/** What a found focus is, for the per-kind outdated and own-motion sentences of the focus line. */
export type FocusResultKind = "face" | "subject" | "immich" | "scenery" | "none";

export function focusResultKind(found: PictureFocus): FocusResultKind {
  if (found.kind === "subject") {
    switch (found.foundBy) {
      case "face":
        return "face";
      case "object":
        return "subject";
      case "immich-faces":
        return "immich";
    }
  }
  return found.kind === "none" ? "none" : "scenery";
}

/**
 * The picture editor's focus line: the 10-state status (`pictureFocusDisplay`) and, when it is
 * about a result (face/subject/immich/scenery/none, fresh or outdated), what that result is.
 */
export interface FocusLineView {
  readonly status: FocusDisplayStatus;
  readonly ownMotion: boolean;
  readonly resultKind: FocusResultKind | null;
}

export function focusLineView(
  display: PictureFocusDisplay,
  found: PictureFocus | undefined,
): FocusLineView {
  return {
    status: display.status,
    ownMotion: display.ownMotion,
    resultKind: found === undefined ? null : focusResultKind(found),
  };
}

/** The message the focus line shows, the action beside it (none while it is still being found) and
 * whether it is the pulsing "looking" pill rather than a plain line. */
export interface FocusLineText {
  readonly textKey: MessageKey;
  readonly actionKey: MessageKey | null;
  readonly pending: boolean;
}

const RESULT_TEXT: Record<FocusResultKind, MessageKey> = {
  face: "editor.focusFace",
  subject: "editor.focusSubject",
  immich: "editor.focusImmich",
  scenery: "editor.focusScenery",
  none: "editor.focusNone",
};

const OUTDATED_TEXT: Record<FocusResultKind, MessageKey> = {
  face: "editor.focusOutdatedFace",
  subject: "editor.focusOutdatedSubject",
  immich: "editor.focusOutdatedImmich",
  scenery: "editor.focusOutdatedScenery",
  none: "editor.focusOutdatedNone",
};

/** Own motion ignores whatever is found (ADR-0041), so its sentence never mentions staleness. */
const OWN_MOTION_TEXT: Record<FocusResultKind, MessageKey> = {
  face: "editor.ownMotionFace",
  subject: "editor.ownMotionSubject",
  immich: "editor.ownMotionImmich",
  scenery: "editor.ownMotionScenery",
  none: "editor.ownMotionNone",
};

/** The action a status offers, regardless of own motion: a done result offers to look again. */
const ACTION_KEY: Record<FocusDisplayStatus, MessageKey | null> = {
  face: "editor.lookAgain",
  subject: "editor.lookAgain",
  immich: "editor.lookAgain",
  scenery: "editor.lookAgain",
  none: "editor.lookAgain",
  outdated: "editor.lookAgainNow",
  waiting: "editor.lookNow",
  failed: "editor.tryAgain",
  looking: null,
  waitingForServer: null,
};

/**
 * Resolves a `FocusLineView` into the message to show. A found result's own motion replaces the
 * result sentence (ADR-0041: own motion ignores whatever the pass finds); a status with no result
 * yet (waiting, looking, failed, waiting for the server) is unaffected by own motion, as it has no
 * result to replace.
 */
export function focusLineText({ status, ownMotion, resultKind }: FocusLineView): FocusLineText {
  const actionKey = ACTION_KEY[status];
  if (ownMotion && resultKind !== null) {
    return { textKey: OWN_MOTION_TEXT[resultKind], actionKey, pending: false };
  }
  if (status === "outdated") {
    // `resultKind` is always set alongside "outdated" (pictureFocusDisplay only returns it once a
    // focus was found); "none" is an inert fallback type-checking requires but never shows.
    return { textKey: OUTDATED_TEXT[resultKind ?? "none"], actionKey, pending: false };
  }
  if (status === "looking") {
    return { textKey: "editor.searchingFocus", actionKey, pending: true };
  }
  if (status === "waiting") {
    return { textKey: "editor.focusWaiting", actionKey, pending: false };
  }
  if (status === "failed") {
    return { textKey: "editor.focusFailed", actionKey, pending: false };
  }
  if (status === "waitingForServer") {
    return { textKey: "editor.focusWaitingForServer", actionKey, pending: false };
  }
  return { textKey: RESULT_TEXT[status], actionKey, pending: false };
}
