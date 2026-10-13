import type { BrowserPlayer } from "../player/browser-player";
import { MILLISECONDS_PER_SECOND, type Slideshow } from "../player/slideshow";
import { timelineSeconds } from "./seek";

/** Where each slide starts, in seconds: slides lie end to end (`createTimeline`). */
export function startsOf(slideshow: Slideshow): readonly number[] {
  let startMs = 0;
  return slideshow.slides.map((slide) => {
    const start = startMs / MILLISECONDS_PER_SECOND;
    startMs += slide.durationMs;
    return start;
  });
}

/** Click or drag along the timeline to seek. */
export function wireTimeline(
  track: HTMLElement,
  player: () => BrowserPlayer,
  seek: (s: number) => void,
): void {
  const seekTo = (event: PointerEvent) =>
    seek(timelineSeconds(event.clientX, track.getBoundingClientRect(), player().duration));
  track.addEventListener("pointerdown", (event) => {
    track.setPointerCapture(event.pointerId);
    seekTo(event);
  });
  track.addEventListener("pointermove", (event) => {
    if (track.hasPointerCapture(event.pointerId)) seekTo(event);
  });
}
