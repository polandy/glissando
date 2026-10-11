import { hashDistance } from "./difference-hash";

/** A checked picture of one import: when it was taken and what the check measured. */
export interface CullCandidate {
  readonly id: string;
  /** ISO 8601. */
  readonly capturedAt: string;
  readonly sharpness: number;
  readonly hash: bigint;
}

export type SetAsideReason = "similar" | "blurry";

/** Pictures of one scene taken in quick succession: the sharpest is kept. */
export interface Burst {
  readonly keptId: string;
  /** In capture order. */
  readonly similarIds: readonly string[];
}

export interface CullResult {
  readonly setAside: ReadonlyMap<string, SetAsideReason>;
  /** In capture order. */
  readonly bursts: readonly Burst[];
}

/** Two pictures at most this far apart in time can belong to one burst; a burst chains them. */
export const BURST_GAP_MS = 2000;
/** Difference hashes at most this many bits apart show the same scene. */
export const SAME_SCENE_MAX_HASH_DISTANCE = 10;
/**
 * Below this sharpness a picture can be blurry. Calibrated on generated 480 px JPEG thumbnails,
 * see `check-worker.browser.test.ts`.
 */
export const BLURRY_SHARPNESS_FLOOR = 50;
/** A blurry picture is also below this share of the import's median sharpness. */
export const BLURRY_SHARE_OF_MEDIAN = 1 / 3;

/**
 * Which pictures of one import are set aside: of each burst all but the sharpest (ties go to
 * the earliest), and blurry ones. Blurry needs both the fixed floor and the import's own median,
 * so a set shot in dim light is not emptied; the median picture is never below a third of
 * itself, so some picture always stays. See ADR-0024.
 */
export function cull(candidates: readonly CullCandidate[]): CullResult {
  const byCaptureTime = [...candidates].sort(
    (first, second) => Date.parse(first.capturedAt) - Date.parse(second.capturedAt),
  );
  const setAside = new Map<string, SetAsideReason>();
  const bursts: Burst[] = [];
  const kept = new Set<string>();
  for (const group of burstsOf(byCaptureTime)) {
    const sharpest = group.reduce((best, next) => (next.sharpness > best.sharpness ? next : best));
    const similar = group.filter((picture) => picture !== sharpest);
    for (const picture of similar) setAside.set(picture.id, "similar");
    kept.add(sharpest.id);
    bursts.push({ keptId: sharpest.id, similarIds: similar.map(({ id }) => id) });
  }
  const blurryBelow = Math.min(
    BLURRY_SHARPNESS_FLOOR,
    medianSharpness(candidates) * BLURRY_SHARE_OF_MEDIAN,
  );
  for (const picture of byCaptureTime) {
    if (!setAside.has(picture.id) && !kept.has(picture.id) && picture.sharpness < blurryBelow) {
      setAside.set(picture.id, "blurry");
    }
  }
  return { setAside, bursts };
}

/** Runs of two or more pictures, each close in time and scene to the one before. */
function burstsOf(byCaptureTime: readonly CullCandidate[]): CullCandidate[][] {
  const runs: CullCandidate[][] = [];
  let run: CullCandidate[] = [];
  for (const picture of byCaptureTime) {
    const previous = run.at(-1);
    if (previous === undefined || !sameMoment(previous, picture)) {
      if (run.length > 1) runs.push(run);
      run = [];
    }
    run.push(picture);
  }
  if (run.length > 1) runs.push(run);
  return runs;
}

function sameMoment(earlier: CullCandidate, later: CullCandidate): boolean {
  return (
    Date.parse(later.capturedAt) - Date.parse(earlier.capturedAt) <= BURST_GAP_MS &&
    hashDistance(earlier.hash, later.hash) <= SAME_SCENE_MAX_HASH_DISTANCE
  );
}

function medianSharpness(candidates: readonly CullCandidate[]): number {
  const sorted = candidates
    .map(({ sharpness }) => sharpness)
    .sort((first, second) => first - second);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}
