import type { SetAsideReason } from "../../culling/cull";

export type { SetAsideReason };

/** A picture as the full-screen viewer can show it: enough to date it and tell it apart. */
export interface ViewerPicture {
  readonly id: string;
  readonly capturedAt: string;
}

/** One picture the full-screen viewer can show; `setAside` says why it is not in the strip. */
export interface ViewerEntry {
  readonly picture: ViewerPicture;
  readonly setAside: SetAsideReason | null;
}

/** A set-aside group, in whatever shape the caller holds it (the import's `SetAsideGroup`). */
interface SetAsideGroupLike {
  readonly kind: SetAsideReason;
  readonly pictures: readonly ViewerPicture[];
}

/** The strip's pictures in order, then the set-aside ones group by group. */
export function viewerEntries(
  pictures: readonly ViewerPicture[],
  groups: readonly SetAsideGroupLike[],
): ViewerEntry[] {
  return [
    ...pictures.map((picture) => ({ picture, setAside: null })),
    ...groups.flatMap((group) =>
      group.pictures.map((picture) => ({ picture, setAside: group.kind })),
    ),
  ];
}

/** The picture `delta` places from `pictureId`, or null past either end. */
export function stepFrom(
  entries: readonly ViewerEntry[],
  pictureId: string,
  delta: number,
): string | null {
  const index = entries.findIndex(({ picture }) => picture.id === pictureId);
  return entries[index + delta]?.picture.id ?? null;
}

/** What to show once `pictureId` is removed: the picture after it, else the one before; null for none. */
export function neighbourAfterRemoval(
  entries: readonly ViewerEntry[],
  pictureId: string,
): string | null {
  return stepFrom(entries, pictureId, 1) ?? stepFrom(entries, pictureId, -1);
}
