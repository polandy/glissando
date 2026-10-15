import { ease } from "./easing";
import { cardTimingAt, endFadeAmount } from "./card-timing";
import type { CardVisual, LiveFrame, PictureSlideLayer, RenderFrame, SlideLayer } from "./ports";
import {
  isGroundSlide,
  type Card,
  type Easing,
  type PictureSlide,
  type Slideshow,
} from "./slideshow";
import type { SlideAtTime, TimelineFrame } from "./timeline";

const TRANSITION_EASING: Easing = "ease-in-out";

/** A transition's linear progress (0..1) as the player draws it. */
export function easeTransition(progress: number): number {
  return ease(TRANSITION_EASING, progress);
}

/** What `renderFrame` needs beyond the timeline frame itself, read fresh for each call. */
export interface RenderFrameContext {
  /** The whole show's length, for the end fade (ADR-0032). */
  readonly showDurationMs: number;
  readonly reducedMotion: boolean;
}

/**
 * What the renderer draws for `frame`; `picturesAt` holds the loaded pictures of the slide on
 * it, its own picture first and its partner's second if it is paired (ADR-0028). A card's
 * timing (ADR-0032) is computed here, once, from `cardTimingAt`, so no renderer repeats it.
 * `liveFrameAt` gives a video slide's clip frame once one is ready (ADR-0035).
 */
export function renderFrame<Picture>(
  frame: TimelineFrame,
  slideshow: Slideshow,
  context: RenderFrameContext,
  picturesAt: (index: number) => readonly Picture[] | undefined,
  liveFrameAt: (index: number) => LiveFrame | undefined = () => undefined,
): RenderFrame<Picture> {
  const layer = (slideAtTime: SlideAtTime): SlideLayer<Picture> => {
    const slide = slideshow.slides[slideAtTime.index];
    if (slide === undefined) {
      throw new Error(`slide ${slideAtTime.index} is drawn before its picture loaded`);
    }
    const cardVisual = cardVisualFor(slide.card, slideAtTime.slideTimeMs, context.reducedMotion);
    if (isGroundSlide(slide)) {
      if (cardVisual === undefined) {
        throw new Error(`ground slide ${slideAtTime.index} has no card`);
      }
      return { kind: "ground", ground: slide.ground, card: cardVisual };
    }
    const pictures = picturesAt(slideAtTime.index);
    const picture = pictures?.[0];
    if (pictures === undefined || picture === undefined) {
      throw new Error(`slide ${slideAtTime.index} is drawn before its picture loaded`);
    }
    const progress = slideAtTime.kenBurnsProgress;
    const partner = partnerLayer(slide, pictures, progress);
    const live = slide.video === undefined ? undefined : liveFrameAt(slideAtTime.index);
    return {
      kind: "picture",
      picture,
      motion: { kenBurns: slide.kenBurns, progress },
      ...(partner === undefined ? {} : { partner }),
      ...(live === undefined ? {} : { live }),
      ...(slide.fit === undefined ? {} : { fit: slide.fit }),
      ...(slide.caption === undefined ? {} : { caption: slide.caption }),
      ...(cardVisual === undefined
        ? {}
        : { card: cardVisual, captionOpacity: 1 - cardVisual.textOpacity }),
    };
  };
  const endFade =
    slideshow.endFadeMs === undefined
      ? 0
      : endFadeAmount(slideshow.endFadeMs, context.showDurationMs, frame.showTimeMs);
  if (frame.kind === "slide") {
    return { kind: "slide", slide: layer(frame.slide), endFade };
  }
  return {
    kind: "transition",
    effect: frame.effect,
    progress: easeTransition(frame.progress),
    from: layer(frame.from),
    to: layer(frame.to),
    endFade,
  };
}

function cardVisualFor(
  card: Card | undefined,
  slideTimeMs: number,
  reducedMotion: boolean,
): CardVisual | undefined {
  if (card === undefined) {
    return undefined;
  }
  const timing = cardTimingAt(card, slideTimeMs, reducedMotion);
  return {
    card,
    textOpacity: timing.textOpacity,
    driftEm: timing.driftEm,
    veilAmount: timing.veilAmount,
    slideTimeMs,
    reducedMotion,
  };
}

function partnerLayer<Picture>(
  slide: PictureSlide,
  pictures: readonly Picture[],
  progress: number,
): PictureSlideLayer<Picture>["partner"] {
  if (slide.partner === undefined) {
    return undefined;
  }
  const picture = pictures[1];
  if (picture === undefined) {
    throw new Error("the slide's partner picture is drawn before it loaded");
  }
  return { picture, motion: { kenBurns: slide.partner.kenBurns, progress } };
}
