import { isGroundSlide, type Slide, type SlideVideo } from "./slideshow";

/** How long before its transition starts a clip is opened and put in place, silent and paused. */
export const VIDEO_PRELOAD_MS = 2000;

/** `waiting`: opened ahead and held at its lead-in position; `playing`: on screen, following the clock. */
export type ClipPhase = "waiting" | "playing";

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
  const shiftMs = videoShiftMs(video, clip.leadInMs);
  if (timeMs < onScreenFromMs) {
    return [
      {
        index,
        video,
        phase: "waiting",
        clipMs: clipMsAt(video, -clip.leadInMs, shiftMs),
        soundOn: false,
      },
    ];
  }
  return [
    {
      index,
      video,
      phase: "playing",
      clipMs: clipMsAt(video, slideTimeMs, shiftMs),
      soundOn: slideTimeMs >= -shiftMs && slideTimeMs < clip.endMs - clip.startMs,
    },
  ];
}

/**
 * How much earlier a clip plays than its slide time alone would put it: enough that a clip whose
 * `startMs` falls inside the lead-in reaches file time 0 exactly when the transition into its
 * slide starts, instead of waiting there paused while the slide fades in over it. 0 once
 * `startMs` already reaches past the lead-in.
 */
export function videoShiftMs(video: SlideVideo, leadInMs: number): number {
  return Math.max(0, leadInMs - video.startMs);
}

function clipMsAt(video: SlideVideo, slideTimeMs: number, shiftMs: number): number {
  return Math.min(video.endMs, Math.max(0, video.startMs + slideTimeMs + shiftMs));
}
