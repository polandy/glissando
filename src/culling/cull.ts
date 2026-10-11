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

/** Similar shots of one scene taken within a few minutes: the sharpest is kept. */
export interface SimilarGroup {
  readonly keptId: string;
  /** In capture order. */
  readonly similarIds: readonly string[];
}

export interface CullResult {
  readonly setAside: ReadonlyMap<string, SetAsideReason>;
  /** In capture order. */
  readonly similarGroups: readonly SimilarGroup[];
}

/** A picture joins a similar group taken at most this long after the group's first picture. */
export const SIMILAR_SHOTS_WINDOW_MS = 120_000;
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
 * Which pictures of one import are set aside: of each similar group all but the sharpest (ties go to
 * the earliest), and blurry ones. Blurry needs both the fixed floor and the import's own median,
 * so a set shot in dim light is not emptied; the median picture is never below a third of
 * itself, so some picture always stays. See ADR-0024.
 */
export function cull(candidates: readonly CullCandidate[]): CullResult {
  const byCaptureTime = [...candidates].sort(
    (first, second) => Date.parse(first.capturedAt) - Date.parse(second.capturedAt),
  );
  const setAside = new Map<string, SetAsideReason>();
  const similarGroups: SimilarGroup[] = [];
  const kept = new Set<string>();
  for (const group of similarGroupsOf(byCaptureTime)) {
    const sharpest = group.reduce((best, next) => (next.sharpness > best.sharpness ? next : best));
    const similar = group.filter((picture) => picture !== sharpest);
    for (const picture of similar) setAside.set(picture.id, "similar");
    kept.add(sharpest.id);
    similarGroups.push({ keptId: sharpest.id, similarIds: similar.map(({ id }) => id) });
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
  return { setAside, similarGroups };
}

/**
 * Groups of two or more pictures, each within the window and the same scene as its group's
 * first picture. Comparing with the first picture, not the one before, keeps a slow pan from
 * chaining into one group. A picture that fits several groups joins the one whose first picture
 * is nearest in hash, the later-started one on a tie; one that fits none starts a group.
 */
function similarGroupsOf(byCaptureTime: readonly CullCandidate[]): CullCandidate[][] {
  const groups: CullCandidate[][] = [];
  for (const picture of byCaptureTime) {
    let nearest: { group: CullCandidate[]; distance: number } | undefined;
    for (const group of groups) {
      const [first] = group;
      if (first === undefined || !withinWindow(first, picture)) continue;
      const distance = hashDistance(first.hash, picture.hash);
      if (distance <= SAME_SCENE_MAX_HASH_DISTANCE && distance <= (nearest?.distance ?? distance)) {
        nearest = { group, distance };
      }
    }
    if (nearest === undefined) groups.push([picture]);
    else nearest.group.push(picture);
  }
  return groups.filter((group) => group.length > 1);
}

function withinWindow(first: CullCandidate, later: CullCandidate): boolean {
  return Date.parse(later.capturedAt) - Date.parse(first.capturedAt) <= SIMILAR_SHOTS_WINDOW_MS;
}

function medianSharpness(candidates: readonly CullCandidate[]): number {
  const sorted = candidates
    .map(({ sharpness }) => sharpness)
    .sort((first, second) => first - second);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}
