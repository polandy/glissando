/**
 * The state change for one queued file's outcome, and any side effect it calls for; factored out
 * of `picture-import.ts` to keep the class itself short. `PictureImportState` is imported only as
 * a type, so this does not create a runtime import cycle with `picture-import.ts`.
 */

import { orderByCaptureDate } from "../compose";
import { pickWithOneDone, picksTruncated } from "./picture-import-picks";
import type { Outcome, Queued } from "./picture-import-outcome";
import type { PictureImportState } from "./picture-import";
import type { StoredWithThumbnail } from "./picture-import-types";

export interface ApplyResult {
  readonly change: Partial<PictureImportState>;
  /** The picture to tell `ports.stored` about, if the file was stored. */
  readonly stored?: StoredWithThumbnail;
  /** The duplicate to remember for `addDuplicates`, if the file was skipped as one. */
  readonly duplicate?: {
    readonly source: Queued["source"];
    readonly reason: "alreadyIn" | "chosenTwice";
  };
}

/**
 * The state change (and side effect) for one file's outcome. `wasStopped`: the caller already
 * found and removed `pickId` from its stopped-while-in-flight set, so this file is dropped
 * (`PICTURE_IMPORT.md`) rather than stored or counted, unless storage ran full instead.
 */
export function applyOutcome(
  state: PictureImportState,
  busy: boolean,
  { source, skipDuplicate, pickId }: Queued,
  outcome: Outcome,
  wasStopped: boolean,
): ApplyResult {
  if (outcome.kind === "storageFull") {
    return {
      change: {
        total: state.done,
        picks: picksTruncated(state.picks),
        storageFull: true,
        busy: false,
      },
    };
  }
  if (pickId !== undefined && wasStopped) {
    return { change: { total: state.total - 1, busy } };
  }
  const done = state.done + 1;
  const picks =
    pickId === undefined ? state.picks : pickWithOneDone(state.picks, pickId, outcome.kind === "stored");
  if (outcome.kind === "stored") {
    return {
      change: {
        done,
        busy,
        picks,
        pictures: orderByCaptureDate([...state.pictures, outcome.picture]),
      },
      stored: {
        picture: outcome.picture,
        thumbnail: outcome.thumbnail,
        takenInAnyway: !skipDuplicate,
      },
    };
  }
  const duplicate =
    outcome.reason === "alreadyIn" || outcome.reason === "chosenTwice"
      ? { source, reason: outcome.reason }
      : undefined;
  return {
    change: {
      done,
      busy,
      picks,
      skipped: [...state.skipped, { fileName: source.fileName, reason: outcome.reason }],
    },
    ...(duplicate === undefined ? {} : { duplicate }),
  };
}
