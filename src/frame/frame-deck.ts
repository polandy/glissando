/**
 * The endless order a picture frame plays an album in (`dev-docs/app/FRAME.md`, ADR-0030): the
 * player itself is a finite timeline, so the frame hands it one bounded round at a time.
 */

/** A finite slideshow's worth of pictures; large enough to feel endless, small enough to compose fast. */
export const ROUND_SIZE = 40;

export type FrameOrder = "shuffled" | "newestFirst" | "oldestFirst";
export const FRAME_ORDERS: readonly FrameOrder[] = ["shuffled", "newestFirst", "oldestFirst"];

export interface FramePicture {
  readonly id: string;
  /** Immich's `takenAt`, an ISO instant; ties break by `id` so the order is reproducible. */
  readonly takenAt: string;
}

export interface FrameDeck {
  /** The next round's picture ids, at most `ROUND_SIZE`; empty only for an empty album. */
  nextRound(): readonly string[];
}

/**
 * `shuffled` deals every picture once before any repeats, reshuffling once the deck runs out
 * without starting the new deck on the picture just shown; `newestFirst`/`oldestFirst` cycle the
 * album in capture-date order, repeating from the start once it is exhausted.
 */
export function createFrameDeck(
  pictures: readonly FramePicture[],
  order: FrameOrder,
  random: () => number,
): FrameDeck {
  const roundSize = Math.min(ROUND_SIZE, pictures.length);
  const draw = order === "shuffled" ? shuffledDraw(pictures, random) : orderedDraw(pictures, order);

  return {
    nextRound(): readonly string[] {
      const round: string[] = [];
      for (let drawn = 0; drawn < roundSize; drawn += 1) {
        round.push(draw());
      }
      return round;
    },
  };
}

function orderedDraw(
  pictures: readonly FramePicture[],
  order: "newestFirst" | "oldestFirst",
): () => string {
  const direction = order === "newestFirst" ? -1 : 1;
  const sorted = [...pictures].sort((a, b) => {
    const byDate = a.takenAt.localeCompare(b.takenAt) * direction;
    return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
  });
  let cursor = 0;

  return () => {
    const picture = sorted[cursor % sorted.length];
    if (picture === undefined) {
      throw new Error("frame deck: ordered draw from an empty album");
    }
    cursor += 1;
    return picture.id;
  };
}

function shuffledDraw(pictures: readonly FramePicture[], random: () => number): () => string {
  const ids = pictures.map((picture) => picture.id);
  let bag: string[] = [];
  let lastDrawn: string | null = null;

  function dealBag(): void {
    bag = shuffled(ids, random);
    // Without this, a reshuffle can deal the picture just shown again right away.
    if (lastDrawn !== null && bag.length > 1 && bag[0] === lastDrawn) {
      [bag[0], bag[1]] = [bag[1] as string, bag[0]];
    }
  }

  return () => {
    if (bag.length === 0) {
      dealBag();
    }
    const id = bag.shift();
    if (id === undefined) {
      throw new Error("frame deck: shuffled draw from an empty album");
    }
    lastDrawn = id;
    return id;
  };
}

function shuffled(ids: readonly string[], random: () => number): string[] {
  const result = [...ids];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const left = result[i] as string;
    const right = result[j] as string;
    result[i] = right;
    result[j] = left;
  }
  return result;
}
