import { isGroundSlide, type Slide, type SlideVideo } from "./slideshow";

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
  /** The clip's sound is audible for its slide's own duration only. */
  readonly soundOn: boolean;
}

interface PlacedClip {
  readonly index: number;
  readonly video: SlideVideo;
  readonly startMs: number;
  readonly endMs: number;
  readonly leadInMs: number;
  readonly isLast: boolean;
}

/** The video slides of `slides`, laid end to end, answering which clips matter at a show time. */
export function createClipPlan(
  slides: readonly Slide[],
): (timeMs: number) => readonly ClipTarget[] {
  const clips: PlacedClip[] = [];
  let startMs = 0;
  let leadInMs = 0;
  slides.forEach((slide, index) => {
    const endMs = startMs + slide.durationMs;
    if (!isGroundSlide(slide) && slide.video !== undefined) {
      clips.push({
        index,
        video: slide.video,
        startMs,
        endMs,
        leadInMs,
        isLast: index === slides.length - 1,
      });
    }
    leadInMs = slide.transitionToNext?.durationMs ?? 0;
    startMs = endMs;
  });
  return (timeMs) => clips.flatMap((clip) => targetOf(clip, timeMs));
}

function targetOf(clip: PlacedClip, timeMs: number): readonly ClipTarget[] {
  const onScreenFromMs = clip.startMs - clip.leadInMs;
  const slideTimeMs = timeMs - clip.startMs;
  const isOver = clip.isLast ? timeMs > clip.endMs : timeMs >= clip.endMs;
  if (isOver || timeMs < onScreenFromMs - VIDEO_PRELOAD_MS) {
    return [];
  }
  const { video, index } = clip;
  const fileMs = video.startMs + slideTimeMs;
  // A file with less footage before the excerpt than the lead-in waits on its first frame while
  // the slide fades in, so it still reaches `endMs` exactly when its slide ends.
  const phase: ClipPhase = timeMs < onScreenFromMs ? "waiting" : fileMs < 0 ? "holding" : "playing";
  return [
    {
      index,
      video,
      phase,
      clipMs:
        phase === "playing"
          ? Math.min(video.endMs, fileMs)
          : Math.max(0, video.startMs - clip.leadInMs),
      soundOn: slideTimeMs >= 0 && slideTimeMs < clip.endMs - clip.startMs,
    },
  ];
}
