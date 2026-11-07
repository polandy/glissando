import { isGroundSlide, type Slide, type SlideVideo } from "./slideshow";
import { slideSpans, type SlideSpan } from "./timeline";

/** How long before its transition starts a clip is opened and put in place, silent and paused. */
export const VIDEO_PRELOAD_MS = 2000;

/**
 * `waiting`: opened ahead and held at its lead-in position; `holding`: on screen but still held
 * there, fading in on its first frame; `playing`: on screen, following the clock.
 */
export type ClipPhase = "waiting" | "holding" | "playing";

/** Where one video slide's clip should be at a show time. */
export interface ClipTarget {
  readonly index: number;
  readonly video: SlideVideo;
  readonly phase: ClipPhase;
  /** ms of the clip, never before its file's start. */
  readonly clipMs: number;
  /** The clip's sound is audible for its slide's chosen duration only. */
  readonly soundOn: boolean;
}

interface PlacedClip {
  readonly index: number;
  readonly video: SlideVideo;
  readonly span: SlideSpan;
  readonly isLast: boolean;
}

/**
 * The video slides of `slides`, placed as the timeline draws them, answering which clips matter
 * at a show time.
 */
export function createClipPlan(
  slides: readonly Slide[],
): (timeMs: number) => readonly ClipTarget[] {
  const spans = slideSpans(slides);
  const clips = slides.flatMap((slide, index): PlacedClip[] => {
    const span = spans[index];
    if (isGroundSlide(slide) || slide.video === undefined || span === undefined) {
      return [];
    }
    return [{ index, video: slide.video, span, isLast: index === slides.length - 1 }];
  });
  return (timeMs) => clips.flatMap((clip) => targetOf(clip, timeMs));
}

function targetOf(clip: PlacedClip, timeMs: number): readonly ClipTarget[] {
  const { startMs, endMs, visibleFromMs } = clip.span;
  const slideTimeMs = timeMs - startMs;
  const isOver = clip.isLast ? timeMs > endMs : timeMs >= endMs;
  if (isOver || timeMs < visibleFromMs - VIDEO_PRELOAD_MS) {
    return [];
  }
  const { video, index } = clip;
  const fileMs = video.startMs + slideTimeMs;
  // A file with less footage before the excerpt than the lead-in waits on its first frame while
  // the slide fades in, so it still reaches `endMs` exactly when its slide ends.
  const phase: ClipPhase = timeMs < visibleFromMs ? "waiting" : fileMs < 0 ? "holding" : "playing";
  return [
    {
      index,
      video,
      phase,
      clipMs:
        phase === "playing"
          ? Math.min(video.endMs, fileMs)
          : Math.max(0, video.startMs - (startMs - visibleFromMs)),
      soundOn: slideTimeMs >= 0 && slideTimeMs < endMs - startMs,
    },
  ];
}
