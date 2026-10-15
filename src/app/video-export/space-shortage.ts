import { VIDEO_PRESETS, type PresetId } from "../../video-export";
import type { SpaceShortage } from "./export-sheet-state";

/** What a private export of `preset` is short of; null when it fits or the space is unknown. */
export function spaceShortage(
  preset: PresetId,
  available: readonly PresetId[],
  freeBytes: number | null,
  estimate: (preset: PresetId) => number,
): SpaceShortage | null {
  const neededBytes = estimate(preset);
  if (freeBytes === null || freeBytes >= neededBytes) {
    return null;
  }
  const fitting =
    VIDEO_PRESETS.filter(
      ({ id }) => id !== preset && available.includes(id) && estimate(id) <= freeBytes,
    ).at(-1)?.id ?? null;
  return { freeBytes, neededBytes, fitting };
}
