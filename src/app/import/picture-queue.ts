/**
 * The queue panel's rows while an import runs (`dev-docs/app/IMPORT_ARRANGING.md`, Picking while
 * an import runs): one row per pick, the last few shown, older finished picks collapsed into a
 * count. Picks drain strictly in the order they were made — one pick's files are fully read
 * before the next pick's first file starts — so any pick before the shown window is guaranteed
 * already finished or stopped; no extra check is needed to say so.
 */

import type { ImportPick } from "../../import/picture-import";
import { pickProgress, type PickProgress } from "./import-view";

/** At most this many of the queue's rows show; older finished picks collapse into a count. */
const VISIBLE_ROWS = 4;

export interface QueueRow extends PickProgress {
  /** Every file of the pick is through, stored, skipped, or dropped by stopping it. */
  readonly finished: boolean;
}

export interface QueueRows {
  /** The picks to show as rows, oldest first, at most `VISIBLE_ROWS`. */
  readonly rows: readonly QueueRow[];
  /** Picks before the shown rows; always finished (see above). */
  readonly earlierDone: number;
}

export function queueRows(picks: readonly ImportPick[]): QueueRows {
  const rows = pickProgress(picks).map(
    (progress): QueueRow => ({ ...progress, finished: progress.pick.done >= progress.pick.total }),
  );
  return {
    rows: rows.slice(-VISIBLE_ROWS),
    earlierDone: Math.max(0, rows.length - VISIBLE_ROWS),
  };
}
