/**
 * A pick groups the files of one `PictureImport.add()` call (or Immich selection) for the
 * queue's progress display (`PICTURE_IMPORT.md`); pure bookkeeping over `ImportPick[]`, kept out of
 * `picture-import.ts` to leave it readable. Named `ImportPick`, not `Pick`, to avoid shadowing
 * TypeScript's built-in `Pick<T, K>` utility type in files that import it.
 */

export type PickKind = "files" | "folder" | "immich";

export interface PickInput {
  readonly kind: PickKind;
  /** The folder's name; only for a folder pick (`webkitRelativePath`'s first segment). */
  readonly folderName?: string;
}

/** One `add()` call, read one file at a time among the others, in the order picked. */
export interface ImportPick {
  readonly id: string;
  readonly kind: PickKind;
  readonly folderName?: string;
  readonly total: number;
  readonly done: number;
  /** Of `done`, how many are pictures now in stay; the rest were duplicates or unreadable. */
  readonly stored: number;
}

export const FILES_PICK: PickInput = { kind: "files" };

export function newPick(id: string, input: PickInput, total: number): ImportPick {
  return {
    id,
    kind: input.kind,
    ...(input.folderName === undefined ? {} : { folderName: input.folderName }),
    total,
    done: 0,
    stored: 0,
  };
}

/** The pick's progress after one more of its files is processed; `stored`: it was kept in. */
export function pickWithOneDone(
  picks: readonly ImportPick[],
  pickId: string,
  stored: boolean,
): readonly ImportPick[] {
  return picks.map((pick) =>
    pick.id === pickId
      ? { ...pick, done: pick.done + 1, stored: pick.stored + (stored ? 1 : 0) }
      : pick,
  );
}

/** Every pick's waiting files dropped, such as when storage runs full. */
export function picksTruncated(picks: readonly ImportPick[]): readonly ImportPick[] {
  return picks.map((pick) => ({ ...pick, total: pick.done }));
}

/** The pick to stop, found and checked; throws for an unknown or already-finished pick. */
export function pickToStop(picks: readonly ImportPick[], pickId: string): ImportPick {
  const pick = picks.find((candidate) => candidate.id === pickId);
  if (pick === undefined) {
    throw new Error(`the import has no pick "${pickId}" to stop`);
  }
  if (pick.done >= pick.total) {
    throw new Error(`pick "${pickId}" is already finished; there is nothing left to stop`);
  }
  return pick;
}

/** The pick's waiting files dropped: it is done as far as it goes, so it reads as finished. */
export function pickStopped(picks: readonly ImportPick[], pickId: string): readonly ImportPick[] {
  return picks.map((pick) => (pick.id === pickId ? { ...pick, total: pick.done } : pick));
}
