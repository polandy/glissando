import { FOCUS_DETECTOR_VERSION } from "../../focus/focus-detector-version";
import type { FocusPassState } from "../../library/focus-pass";
import type { PictureFocus, StoredFocus } from "../../library/picture-focus";

/** What is known of the pictures' focus: as stored when a slideshow was opened, and found since. */
export interface PicturesFocus {
  /** By picture id; a picture absent has not been looked at. */
  readonly found: ReadonlyMap<string, PictureFocus>;
  /** The pictures the background pass will still look at. */
  readonly searching: ReadonlySet<string>;
  /** Pictures whose detection failed this session; a later successful look removes them. */
  readonly failed: ReadonlySet<string>;
  /** Stored by an older detector: current until the pass looks again, which happens soon. */
  readonly outdated: ReadonlySet<string>;
}

/** Before the stored focus is read: nothing known, the automatic motion aims at the middle. */
export const NO_FOCUS_KNOWN: PicturesFocus = {
  found: new Map(),
  searching: new Set(),
  failed: new Set(),
  outdated: new Set(),
};

/** What a store gives for display: the focus only, without the detector version that found it. */
export function bareFocus(
  stored: ReadonlyMap<string, StoredFocus>,
): ReadonlyMap<string, PictureFocus> {
  return new Map([...stored].map(([id, { focus }]) => [id, focus]));
}

/** The ids among `stored` whose record predates the current detector (ADR-0041). */
export function outdatedIds(stored: ReadonlyMap<string, StoredFocus>): ReadonlySet<string> {
  return new Set(
    [...stored].filter(([, record]) => record.detector < FOCUS_DETECTOR_VERSION).map(([id]) => id),
  );
}

/**
 * What the picture editor shows of one picture's focus: the subject box or none, being searched
 * for, or not looked at (its detection failed; the next pass tries again).
 */
export type PictureFocusStatus =
  PictureFocus | { readonly kind: "searching" } | { readonly kind: "not-looked-at" };

/**
 * The pass stores before it publishes, so what it found since is never older than `stored`.
 * `outdated` is `stored`'s ids from an older detector (`outdatedIds`, computed once at load: the
 * pass always writes the current detector, so a picture it found since is never outdated).
 */
export function picturesFocus(
  stored: ReadonlyMap<string, PictureFocus>,
  pass: FocusPassState,
  outdated: ReadonlySet<string> = new Set(),
): PicturesFocus {
  return {
    found: new Map([...stored, ...pass.found]),
    searching: pass.searching,
    failed: pass.failed,
    outdated: new Set([...outdated].filter((id) => !pass.found.has(id))),
  };
}

export function focusStatus(focus: PicturesFocus, pictureId: string): PictureFocusStatus {
  const found = focus.found.get(pictureId);
  if (found !== undefined) {
    return found;
  }
  return focus.searching.has(pictureId) ? { kind: "searching" } : { kind: "not-looked-at" };
}

/** The states a picture's focus search is shown in, across the start, slideshow and editor screens. */
export const FOCUS_DISPLAY_STATUSES = [
  "waiting",
  "looking",
  "face",
  "subject",
  "immich",
  "scenery",
  "none",
  "outdated",
  "failed",
  "waitingForServer",
] as const;
export type FocusDisplayStatus = (typeof FOCUS_DISPLAY_STATUSES)[number];

/** One picture's focus status for display, and whether its own motion ignores it (ADR-0041). */
export interface PictureFocusDisplay {
  readonly status: FocusDisplayStatus;
  readonly ownMotion: boolean;
}

/** Which status a found subject shows, by what found it: the marker and chip follow `foundBy`. */
function subjectDisplayStatus(
  foundBy: Extract<PictureFocus, { kind: "subject" }>["foundBy"],
): FocusDisplayStatus {
  switch (foundBy) {
    case "face":
      return "face";
    case "object":
      return "subject";
    case "immich-faces":
      return "immich";
  }
}

/**
 * A pause only ever waits on the server or Immich (`FocusPassPorts.pausesOn`, ADR-0041): a
 * not-yet-looked-at picture then says so, rather than a plain, open-ended "waiting".
 */
export function pictureFocusDisplay(
  focus: PicturesFocus,
  pictureId: string,
  ownMotion: boolean,
  passPaused: boolean,
): PictureFocusDisplay {
  return { status: displayStatus(focus, pictureId, passPaused), ownMotion };
}

function displayStatus(
  focus: PicturesFocus,
  pictureId: string,
  passPaused: boolean,
): FocusDisplayStatus {
  if (focus.failed.has(pictureId)) {
    return "failed";
  }
  if (focus.searching.has(pictureId)) {
    return "looking";
  }
  const found = focus.found.get(pictureId);
  if (found === undefined) {
    return passPaused ? "waitingForServer" : "waiting";
  }
  if (focus.outdated.has(pictureId)) {
    return "outdated";
  }
  switch (found.kind) {
    case "subject":
      return subjectDisplayStatus(found.foundBy);
    case "scenery":
      return "scenery";
    case "none":
      return "none";
  }
}

/** One slideshow's focus search, summed up for its start-screen card and its Focus sheet. */
export interface FocusSlideshowSummary {
  readonly counts: Readonly<Record<FocusDisplayStatus, number>>;
  readonly done: number;
  readonly total: number;
  /** Every picture already had a stored focus: the pass is looking again, not for the first time. */
  readonly again: boolean;
  readonly failedCount: number;
  /** Pictures with a start and end set by hand: an automatic focus is found but not used for them. */
  readonly ownMotionCount: number;
}

/** A slideshow's pictures, their own-motion flag, matched against `SlideshowSearch` for progress. */
export function focusSlideshowSummary(
  focus: PicturesFocus,
  pictures: readonly { readonly id: string; readonly ownMotion: boolean }[],
  search: { readonly done: number; readonly total: number; readonly again: boolean } | undefined,
  passPaused: boolean,
): FocusSlideshowSummary {
  const counts = Object.fromEntries(FOCUS_DISPLAY_STATUSES.map((status) => [status, 0])) as Record<
    FocusDisplayStatus,
    number
  >;
  let ownMotionCount = 0;
  for (const picture of pictures) {
    counts[displayStatus(focus, picture.id, passPaused)] += 1;
    if (picture.ownMotion) ownMotionCount += 1;
  }
  return {
    counts,
    done: search?.done ?? pictures.length,
    total: search?.total ?? pictures.length,
    again: search?.again ?? false,
    failedCount: counts.failed,
    ownMotionCount,
  };
}
