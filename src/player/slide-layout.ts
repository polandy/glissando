import { cropAt, cropRect, type KenBurnsAt, type Rect, type Size } from "./ken-burns";

/**
 * Share of the viewport's long side left as a black gap between a pair's two halves
 * (ADR-0028).
 */
export const PAIR_GAP_SHARE = 0.006;

/**
 * A single picture is drawn whole over a blurred fill once cropping it to cover the viewport
 * would hide more of it than this share (ADR-0028).
 */
export const BLURRED_FILL_HIDDEN_SHARE = 1 / 3;

/** The blurred backdrop is darkened to this fraction of its original brightness (ADR-0028). */
export const BACKDROP_BRIGHTNESS = 0.55;

/** Framing, held still, that covers a viewport of the picture's own shape: the whole picture. */
const STILL_AT_CENTRE = { zoom: 1, centerX: 0.5, centerY: 0.5 };

export interface LayoutPicture<Picture extends Size> {
  readonly picture: Picture;
  readonly motion: KenBurnsAt;
}

export interface LayoutInput<Picture extends Size> extends LayoutPicture<Picture> {
  readonly partner?: LayoutPicture<Picture>;
  /** `"cover"` turns the blurred fill off; absent: whole picture over a fill if needed. */
  readonly fit?: "cover";
}

export type SlideLayout =
  | { readonly kind: "cover"; readonly crop: Rect }
  | {
      readonly kind: "blurred-fill";
      /** Screen-space rect (0..1, origin top left) the whole picture is drawn in. */
      readonly frontRect: Rect;
      /** Picture-space crop of the front picture, framed within its own shape. */
      readonly frontCrop: Rect;
      /** Picture-space crop of the static, blurred backdrop that covers the whole screen. */
      readonly backdropCrop: Rect;
    }
  | {
      readonly kind: "pair-across" | "pair-stacked";
      /** Screen-space rect of the slide's own picture (left or top). */
      readonly firstRect: Rect;
      readonly firstCrop: Rect;
      /** Screen-space rect of the partner picture (right or bottom). */
      readonly secondRect: Rect;
      readonly secondCrop: Rect;
    };

/**
 * How a slide is drawn in `viewport`: a pair side by side or stacked, or a single picture
 * covering the screen or, once that would hide too much of it, whole over a blurred fill
 * (ADR-0028).
 */
export function slideLayout<Picture extends Size>(
  input: LayoutInput<Picture>,
  viewport: Size,
): SlideLayout {
  if (input.partner !== undefined) {
    return pairLayout(input, input.partner, viewport);
  }
  return singleLayout(input, viewport);
}

function singleLayout<Picture extends Size>(
  input: LayoutInput<Picture>,
  viewport: Size,
): SlideLayout {
  if (input.fit === "cover" || hiddenShare(input.picture, viewport) <= BLURRED_FILL_HIDDEN_SHARE) {
    return { kind: "cover", crop: cropAt(input.motion, input.picture, viewport) };
  }
  return {
    kind: "blurred-fill",
    frontRect: containedRect(input.picture, viewport),
    // The viewport for this crop is the picture's own shape, so it frames within the whole
    // picture rather than within the screen's aspect ratio.
    frontCrop: cropAt(input.motion, input.picture, input.picture),
    backdropCrop: cropRect(STILL_AT_CENTRE, input.picture, viewport),
  };
}

/** The share of `picture` a cover crop for `viewport` would hide. */
function hiddenShare(picture: Size, viewport: Size): number {
  const pictureAspect = picture.width / picture.height;
  const viewportAspect = viewport.width / viewport.height;
  return 1 - Math.min(pictureAspect / viewportAspect, viewportAspect / pictureAspect);
}

/** The screen-space rect the whole picture fits in, centred, without cropping it. */
function containedRect(picture: Size, viewport: Size): Rect {
  const pictureAspect = picture.width / picture.height;
  const viewportAspect = viewport.width / viewport.height;
  const width = pictureAspect < viewportAspect ? pictureAspect / viewportAspect : 1;
  const height = pictureAspect < viewportAspect ? 1 : viewportAspect / pictureAspect;
  return { x: (1 - width) / 2, y: (1 - height) / 2, width, height };
}

function pairLayout<Picture extends Size>(
  first: LayoutPicture<Picture>,
  second: LayoutPicture<Picture>,
  viewport: Size,
): SlideLayout {
  const halfShare = (1 - PAIR_GAP_SHARE) / 2;
  if (viewport.width >= viewport.height) {
    const halfViewport = { width: viewport.width * halfShare, height: viewport.height };
    return {
      kind: "pair-across",
      firstRect: { x: 0, y: 0, width: halfShare, height: 1 },
      firstCrop: cropAt(first.motion, first.picture, halfViewport),
      secondRect: { x: halfShare + PAIR_GAP_SHARE, y: 0, width: halfShare, height: 1 },
      secondCrop: cropAt(second.motion, second.picture, halfViewport),
    };
  }
  const halfViewport = { width: viewport.width, height: viewport.height * halfShare };
  return {
    kind: "pair-stacked",
    firstRect: { x: 0, y: 0, width: 1, height: halfShare },
    firstCrop: cropAt(first.motion, first.picture, halfViewport),
    secondRect: { x: 0, y: halfShare + PAIR_GAP_SHARE, width: 1, height: halfShare },
    secondCrop: cropAt(second.motion, second.picture, halfViewport),
  };
}
