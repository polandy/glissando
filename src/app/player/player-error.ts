import { MusicPlaybackError, SlideshowLoadError } from "../../player";
import type { PlayerFailure } from "./player-failure";

/**
 * The card for the player's `error`: a refused music start is no failure (the player pauses, and
 * play retries with a gesture); a picture that failed to load is `pictureFailure`'s to decide.
 */
export function failureOfPlayerError(
  error: Error | null,
  pictureFailure: (cause: unknown) => PlayerFailure | null,
): PlayerFailure | null {
  if (error instanceof MusicPlaybackError) {
    return null;
  }
  if (error instanceof SlideshowLoadError) {
    return pictureFailure(error.cause);
  }
  console.error("the player failed", error);
  return "playback";
}
