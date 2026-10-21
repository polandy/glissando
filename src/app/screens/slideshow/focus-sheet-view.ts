import {
  pictureFocusDisplay,
  type FocusDisplayStatus,
  type FocusSlideshowSummary,
  type PicturesFocus,
} from "../../focus/pictures-focus";
import type { MessageKey } from "../../i18n/messages";

/** The Focus sheet's status header, from a slideshow's focus summary (ADR-0041). */
export type FocusSheetStatus =
  | {
      readonly kind: "looking";
      readonly again: boolean;
      readonly done: number;
      readonly total: number;
    }
  | { readonly kind: "waitingForServer"; readonly done: number; readonly total: number }
  | {
      readonly kind: "failed";
      readonly done: number;
      readonly total: number;
      readonly failedCount: number;
    }
  | { readonly kind: "done"; readonly total: number };

/** Pending work first (paused on the server takes priority over a plain progress bar), then failures. */
export function focusSheetStatus(
  summary: FocusSlideshowSummary,
  passPaused: boolean,
): FocusSheetStatus {
  if (summary.done < summary.total) {
    return passPaused
      ? { kind: "waitingForServer", done: summary.done, total: summary.total }
      : { kind: "looking", again: summary.again, done: summary.done, total: summary.total };
  }
  if (summary.failedCount > 0) {
    return {
      kind: "failed",
      done: summary.done,
      total: summary.total,
      failedCount: summary.failedCount,
    };
  }
  return { kind: "done", total: summary.total };
}

/** The legend's and stacked bar's statuses, in the order the Focus sheet shows them. */
export const FOCUS_SHEET_STATUS_ORDER: readonly FocusDisplayStatus[] = [
  "face",
  "immich",
  "subject",
  "scenery",
  "none",
  "outdated",
  "failed",
  "looking",
  "waiting",
  "waitingForServer",
];

/** Only the statuses present among the slideshow's pictures, in the sheet's fixed order. */
export function visibleFocusStatuses(
  counts: Readonly<Record<FocusDisplayStatus, number>>,
): readonly FocusDisplayStatus[] {
  return FOCUS_SHEET_STATUS_ORDER.filter((status) => counts[status] > 0);
}

/** The dot/stacked-bar/legend colour for each status: the three status tokens plus accent/faint
 * for "found something"/"neutral", never a raw colour (tokens.css). */
export const FOCUS_STATUS_COLOR: Readonly<Record<FocusDisplayStatus, string>> = {
  face: "var(--gl-accent)",
  subject: "var(--gl-accent)",
  immich: "var(--gl-accent)",
  scenery: "var(--gl-accent)",
  none: "var(--gl-faint)",
  waiting: "var(--gl-faint)",
  outdated: "var(--gl-lemon)",
  waitingForServer: "var(--gl-lemon)",
  failed: "var(--gl-coral)",
  looking: "var(--gl-mint)",
};

/** A legend chip, or none: the grid's tiles the chip does not cover are dimmed. */
export type FocusSheetFilter = FocusDisplayStatus | "ownMotion" | null;

/** Whether a tile is dimmed under the current legend filter; a status filter ignores own motion. */
export function tileDimmed(
  status: FocusDisplayStatus,
  ownMotion: boolean,
  filter: FocusSheetFilter,
): boolean {
  if (filter === null) {
    return false;
  }
  return filter === "ownMotion" ? !ownMotion : status !== filter;
}

/** The legend's and status dot's label for each status (`focusSheet.statusXxx` in the catalogue). */
export const FOCUS_STATUS_LABEL_KEY: Readonly<Record<FocusDisplayStatus, MessageKey>> = {
  face: "focusSheet.statusFace",
  subject: "focusSheet.statusSubject",
  immich: "focusSheet.statusImmich",
  scenery: "focusSheet.statusScenery",
  none: "focusSheet.statusNone",
  outdated: "focusSheet.statusOutdated",
  failed: "focusSheet.statusFailed",
  waiting: "focusSheet.statusWaiting",
  waitingForServer: "focusSheet.statusWaitingForServer",
  looking: "focusSheet.statusLooking",
};

/** One grid tile: a picture with its display status and whether the current filter dims it. */
export interface FocusSheetTile {
  readonly id: string;
  readonly thumbnailUrl: string;
  readonly status: FocusDisplayStatus;
  readonly ownMotion: boolean;
  readonly dimmed: boolean;
}

/** The Focus sheet's grid, in the slideshow's own picture order. */
export function focusSheetTiles(
  focus: PicturesFocus,
  pictures: readonly {
    readonly id: string;
    readonly thumbnailUrl: string;
    readonly ownMotion: boolean;
  }[],
  passPaused: boolean,
  filter: FocusSheetFilter,
): readonly FocusSheetTile[] {
  return pictures.map((picture) => {
    const { status, ownMotion } = pictureFocusDisplay(
      focus,
      picture.id,
      picture.ownMotion,
      passPaused,
    );
    return {
      id: picture.id,
      thumbnailUrl: picture.thumbnailUrl,
      status,
      ownMotion,
      dimmed: tileDimmed(status, ownMotion, filter),
    };
  });
}
