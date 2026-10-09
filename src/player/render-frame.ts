import { ease } from "./easing";
import type { RenderFrame, SlideLayer } from "./ports";
import type { Easing, Slideshow } from "./slideshow";
import type { SlideAtTime, TimelineFrame } from "./timeline";

const TRANSITION_EASING: Easing = "ease-in-out";

/** A transition's linear progress (0..1) as the player draws it. */
export function easeTransition(progress: number): number {
  return ease(TRANSITION_EASING, progress);
}

/** What the renderer draws for `frame`; `pictureAt` holds the loaded picture of each slide on it. */
export function renderFrame<Picture>(
  frame: TimelineFrame,
  slideshow: Slideshow,
  pictureAt: (index: number) => Picture | undefined,
): RenderFrame<Picture> {
  const layer = (slideAtTime: SlideAtTime): SlideLayer<Picture> => {
    const picture = pictureAt(slideAtTime.index);
    const slide = slideshow.slides[slideAtTime.index];
    if (picture === undefined || slide === undefined) {
      throw new Error(`slide ${slideAtTime.index} is drawn before its picture loaded`);
    }
    const motion = { kenBurns: slide.kenBurns, progress: slideAtTime.kenBurnsProgress };
    return slide.caption === undefined
      ? { picture, motion }
      : { picture, motion, caption: slide.caption };
  };
  if (frame.kind === "slide") {
    return { kind: "slide", slide: layer(frame.slide) };
  }
  return {
    kind: "transition",
    effect: frame.effect,
    progress: easeTransition(frame.progress),
    from: layer(frame.from),
    to: layer(frame.to),
  };
}
