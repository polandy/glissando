import type { SlideshowSearch } from "./focus-pass-types";

/** The faces-and-subjects search still under way, summed over its slideshows. */
export interface RunningSearch {
  readonly done: number;
  readonly total: number;
  /** Every slideshow still searched already had a stored focus: "looking again". */
  readonly again: boolean;
}

/** Sums each pass's slideshows that still have pictures to look at; null when none has. */
export function runningSearch(
  passes: Iterable<ReadonlyMap<string, SlideshowSearch>>,
): RunningSearch | null {
  let done = 0;
  let total = 0;
  let again = true;
  for (const slideshows of passes) {
    for (const search of slideshows.values()) {
      if (search.done < search.total) {
        done += search.done;
        total += search.total;
        again &&= search.again;
      }
    }
  }
  return total === 0 ? null : { done, total, again };
}
