import { ease } from "./easing";
import type { RenderFrame, SlideLayer } from "./ports";
import type { Easing, Slide, Slideshow } from "./slideshow";
import type { SlideAtTime, TimelineFrame } from "./timeline";

const TRANSITION_EASING: Easing = "ease-in-out";

/** A transition's linear progress (0..1) as the player draws it. */
export function easeTransition(progress: number): number {
  return ease(TRANSITION_EASING, progress);
}

/**
 * What the renderer draws for `frame`; `picturesAt` holds the loaded pictures of the slide on
 * it, its own picture first and its partner's second if it is paired (ADR-0028).
 */
export function renderFrame<Picture>(
  frame: TimelineFrame,
  slideshow: Slideshow,
  picturesAt: (index: number) => readonly Picture[] | undefined,
): RenderFrame<Picture> {
  const layer = (slideAtTime: SlideAtTime): SlideLayer<Picture> => {
    const pictures = picturesAt(slideAtTime.index);
    const slide = slideshow.slides[slideAtTime.index];
    const picture = pictures?.[0];
    if (pictures === undefined || picture === undefined || slide === undefined) {
      throw new Error(`slide ${slideAtTime.index} is drawn before its picture loaded`);
    }
    const progress = slideAtTime.kenBurnsProgress;
    const partner = partnerLayer(slide, pictures, progress);
    return {
      picture,
      motion: { kenBurns: slide.kenBurns, progress },
      ...(partner === undefined ? {} : { partner }),
      ...(slide.fit === undefined ? {} : { fit: slide.fit }),
      ...(slide.caption === undefined ? {} : { caption: slide.caption }),
    };
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

function partnerLayer<Picture>(
  slide: Slide,
  pictures: readonly Picture[],
  progress: number,
): SlideLayer<Picture>["partner"] {
  if (slide.partner === undefined) {
    return undefined;
  }
  const picture = pictures[1];
  if (picture === undefined) {
    throw new Error("the slide's partner picture is drawn before it loaded");
  }
  return { picture, motion: { kenBurns: slide.partner.kenBurns, progress } };
}
