import type { SlideshowTransition } from "../library/own-timing";
import type { StoredCard, StoredPicture } from "../library/stored-slideshow";
import { pictureOf } from "./card-slide";
import { CHAPTER_SLIDE_MS, type ComposedChapter } from "./compose-chapters";
import { openingLeadMs } from "./opening-lead";
import { slideOfPicture, type SlideUnit } from "./slide-units";

/**
 * Real time a title card or chapter card adds around a slide unit, before the beat snap: the
 * playlist's beats and the music's energy and lifts already include it (ADR-0021, ADR-0046), so
 * everything that measures a slide boundary against them must add it back in. `beforeMs[i]` is a
 * dedicated slide placed right before unit `i` starts; `ownMs[i]` widens unit `i`'s own displayed
 * duration (a card merged onto it). Both are 0 for a unit nothing is composed onto.
 */
export interface InsertedTime {
  readonly beforeMs: readonly number[];
  readonly ownMs: readonly number[];
}

/**
 * `insertedTimeFor` mirrors, ahead of `slideDurationsMs`, the same merge-or-insert choices
 * `composeCards` (the opening card) and `composeChapters` (each trip chapter) make afterwards —
 * see `openingLeadMs` and `TRIP_CHAPTERS.md` Rule F. A paired slide never carries a chapter card
 * itself (`mergeChapterOntoAnchor`), so a chapter anchored there always gets a dedicated slide.
 */
export function insertedTimeFor(
  openingCard: StoredCard | undefined,
  chapters: readonly ComposedChapter[],
  pictures: readonly StoredPicture[],
  units: readonly SlideUnit[],
  beatsMs: readonly number[] | undefined,
  defaultTransition: SlideshowTransition,
  transitionShare?: number,
  maxTransitionMs?: number,
): InsertedTime {
  const beforeMs = units.map(() => 0);
  const ownMs = units.map(() => 0);
  const lead = openingLeadMs(
    openingCard,
    pictures,
    units,
    beatsMs,
    defaultTransition,
    transitionShare,
    maxTransitionMs,
  );
  if (lead.mergeOntoFirstUnit) {
    ownMs[0] = (ownMs[0] as number) + lead.insertedMs;
  } else {
    beforeMs[0] = (beforeMs[0] as number) + lead.insertedMs;
  }
  for (const chapter of chapters) {
    const picture = pictureOf(pictures, chapter.anchorPictureId);
    const unitIndex = slideOfPicture(units, pictures.indexOf(picture));
    const paired = (units[unitIndex] as SlideUnit).pictureIndices.length === 2;
    if (paired) {
      beforeMs[unitIndex] = (beforeMs[unitIndex] as number) + CHAPTER_SLIDE_MS;
    } else {
      ownMs[unitIndex] = (ownMs[unitIndex] as number) + CHAPTER_SLIDE_MS;
    }
  }
  return { beforeMs, ownMs };
}

/**
 * Each unit's real start and end offset from its nominal, cumulative-from-zero position:
 * `startMs[i]` from whatever plays directly before it, `endMs[i]` additionally from what widens
 * its own end. Static — independent of how the beat snap later divides the nominal durations
 * between units, so it is computed once and read throughout.
 */
export function realOffsetsMs(
  inserted: InsertedTime | undefined,
  unitCount: number,
): { readonly startMs: readonly number[]; readonly endMs: readonly number[] } {
  const startMs: number[] = [];
  const endMs: number[] = [];
  let priorEndMs = 0;
  for (let index = 0; index < unitCount; index += 1) {
    const beforeMs = inserted?.beforeMs[index] ?? 0;
    const ownMs = inserted?.ownMs[index] ?? 0;
    const start = priorEndMs + beforeMs;
    const end = start + ownMs;
    startMs.push(start);
    endMs.push(end);
    priorEndMs = end;
  }
  return { startMs, endMs };
}
