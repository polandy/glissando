import type { MusicOutput } from "../../player";
import type { Route } from "./route";

/**
 * Opens the player over a slideshow, at `pictureId`'s slide or, without one, at the start. Call
 * it within the tap: the music is unlocked first, since iOS lets it start later (once the
 * pictures have loaded) only when it was unlocked inside a gesture.
 */
export function startPlaying(
  ports: {
    readonly musicOutput: Pick<MusicOutput, "unlock">;
    readonly navigator: { open(route: Route): void };
  },
  slideshowId: string,
  pictureId?: string,
): void {
  ports.musicOutput.unlock();
  ports.navigator.open({
    screen: "player",
    slideshowId,
    ...(pictureId === undefined ? {} : { pictureId }),
  });
}
