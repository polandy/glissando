const MILLISECONDS_PER_SECOND = 1000;

/**
 * Which picture of a round is on screen at the player's `currentTime`: a round gives each of its
 * `pictureCount` pictures the same `intervalMs` (`composeRound`), and the end of the round
 * still shows the last one.
 */
export function pictureIndexAt(
  currentTimeSeconds: number,
  intervalMs: number,
  pictureCount: number,
): number {
  const index = Math.floor((currentTimeSeconds * MILLISECONDS_PER_SECOND) / intervalMs);
  return Math.min(Math.max(index, 0), pictureCount - 1);
}
