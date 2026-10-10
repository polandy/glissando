/** How far an arrow key moves the slideshow. */
export const SEEK_STEP_SECONDS = 5;

export function seekBy(
  currentSeconds: number,
  deltaSeconds: number,
  durationSeconds: number,
): number {
  return clamp(currentSeconds + deltaSeconds, durationSeconds);
}

/** The timeline's horizontal extent on screen, in CSS pixels. */
export interface TrackExtent {
  readonly left: number;
  readonly width: number;
}

/** The time at `clientX` on the timeline, for a click or a drag past either end. */
export function timelineSeconds(
  clientX: number,
  track: TrackExtent,
  durationSeconds: number,
): number {
  if (track.width <= 0) {
    return 0;
  }
  return clamp(((clientX - track.left) / track.width) * durationSeconds, durationSeconds);
}

function clamp(seconds: number, durationSeconds: number): number {
  return Math.min(durationSeconds, Math.max(0, seconds));
}
