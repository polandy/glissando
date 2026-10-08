import {
  CAPTION_GRADIENT,
  CAPTION_LINE_HEIGHT_EM,
  CAPTION_MAX_LINES,
  CAPTION_MIN_FONT_SIZE_CSS_PX,
  CAPTION_SHADOW,
  CAPTION_TEXT_COLOR,
  captionMetrics,
  CAPTION_FONT_FAMILY,
  CAPTION_FONT_WEIGHT,
} from "./caption-layout";
import type { Size } from "./ken-burns";

/** CSS declarations, by their `CSSStyleDeclaration` property names. */
export type CaptionDeclarations = Readonly<Record<string, string>>;

const PERCENT = 100;

/**
 * The caption as two elements, a band holding the text, styled from the numbers the drawn
 * caption uses: for the DOM fallback and the picture editor's preview. `viewport` and
 * `insetCssPixels` are in CSS pixels.
 */
export function captionStyles(
  viewport: Size,
  insetCssPixels: number,
  minFontSizeCssPx = CAPTION_MIN_FONT_SIZE_CSS_PX,
): { readonly band: CaptionDeclarations; readonly text: CaptionDeclarations } {
  const metrics = captionMetrics(viewport, 1, minFontSizeCssPx);
  const stops = CAPTION_GRADIENT.stops
    .map(({ at, alpha }) => `rgba(0, 0, 0, ${alpha}) ${Math.round(at * PERCENT)}%`)
    .join(", ");
  const { radiusXShare, radiusYShare } = CAPTION_GRADIENT;
  return {
    band: {
      position: "absolute",
      left: "0",
      right: "0",
      bottom: "0",
      height: `${metrics.bandHeight}px`,
      display: "flex",
      alignItems: "flex-end",
      boxSizing: "border-box",
      paddingLeft: `${metrics.left}px`,
      paddingBottom: `${metrics.bottom}px`,
      background: `radial-gradient(${radiusXShare * PERCENT}% ${radiusYShare * PERCENT}% at 0% 100%, ${stops})`,
      transform: `translateY(-${insetCssPixels}px)`,
      pointerEvents: "none",
    },
    text: {
      color: CAPTION_TEXT_COLOR,
      font: `${CAPTION_FONT_WEIGHT} ${metrics.fontSize}px / ${CAPTION_LINE_HEIGHT_EM} ${CAPTION_FONT_FAMILY}`,
      maxWidth: `${metrics.maxWidth}px`,
      textShadow: `0 ${CAPTION_SHADOW.offsetYCssPx}px ${CAPTION_SHADOW.blurCssPx}px ${CAPTION_SHADOW.color}`,
      overflowWrap: "anywhere",
      display: "-webkit-box",
      webkitBoxOrient: "vertical",
      webkitLineClamp: String(CAPTION_MAX_LINES),
      overflow: "hidden",
    },
  };
}
