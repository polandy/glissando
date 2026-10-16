import type { StoredPicture } from "../../library/stored-slideshow";
import type { SetAsideGroup } from "./picture-culling";

export type SetAsideReason = SetAsideGroup["kind"];

/** One picture the full-screen viewer can show; `setAside` says why it is not in the strip. */
export interface ViewerEntry {
  readonly picture: StoredPicture;
  readonly setAside: SetAsideReason | null;
}

/** The strip's pictures in order, then the set-aside ones group by group. */
export function viewerEntries(
  pictures: readonly StoredPicture[],
  groups: readonly SetAsideGroup[],
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
