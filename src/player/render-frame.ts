import { ease } from "./easing";
import { framingAt } from "./ken-burns";
import type { RenderFrame, SlideLayer } from "./ports";
import type { Easing, Slideshow } from "./slideshow";
import type { SlideAtTime, TimelineFrame } from "./timeline";

const TRANSITION_EASING: Easing = "ease-in-out";

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
    const framing = framingAt(slide.kenBurns, slideAtTime.kenBurnsProgress);
    return slide.caption === undefined
      ? { picture, framing }
      : { picture, framing, caption: slide.caption };
  };
  if (frame.kind === "slide") {
    return { kind: "slide", slide: layer(frame.slide) };
  }
  return {
    kind: "transition",
    effect: frame.effect,
    progress: ease(TRANSITION_EASING, frame.progress),
    from: layer(frame.from),
    to: layer(frame.to),
  };
}
