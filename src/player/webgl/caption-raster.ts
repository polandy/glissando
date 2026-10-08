import type { Size } from "../ken-burns";
import {
  breakCaption,
  CAPTION_GRADIENT,
  CAPTION_SHADOW,
  CAPTION_TEXT_COLOR,
  captionFont,
  captionMetrics,
} from "../caption-layout";

const BLACK_RGB = "0, 0, 0";

/**
 * Draws a caption's band, its gradient and its text, into `canvas`, sized to the band: as wide as
 * the viewport and `captionMetrics(…).bandHeight` tall, in the viewport's pixels.
 */
export function rasterizeCaption(
  canvas: HTMLCanvasElement,
  text: string,
  viewport: Size,
  pixelsPerCssPixel: number,
): void {
  const metrics = captionMetrics(viewport, pixelsPerCssPixel);
  canvas.width = viewport.width;
  canvas.height = metrics.bandHeight;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("this browser has no 2D canvas to draw captions with");
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawGradient(context, canvas.width, canvas.height);

  context.font = captionFont(metrics.fontSize);
  context.fillStyle = CAPTION_TEXT_COLOR;
  context.textBaseline = "middle";
  context.shadowColor = CAPTION_SHADOW.color;
  context.shadowOffsetY = CAPTION_SHADOW.offsetYCssPx * pixelsPerCssPixel;
  context.shadowBlur = CAPTION_SHADOW.blurCssPx * pixelsPerCssPixel;
  const lines = breakCaption(text, metrics.maxWidth, (line) => context.measureText(line).width);
  const lastLineMiddle = canvas.height - metrics.bottom - metrics.lineHeight / 2;
  lines.forEach((line, index) => {
    const linesBelow = lines.length - 1 - index;
    context.fillText(line, metrics.left, lastLineMiddle - linesBelow * metrics.lineHeight);
  });
}

/** An ellipse centred on the bottom-left corner, drawn as a unit circle scaled to its radii. */
function drawGradient(context: CanvasRenderingContext2D, width: number, height: number): void {
  const radiusX = width * CAPTION_GRADIENT.radiusXShare;
  const radiusY = height * CAPTION_GRADIENT.radiusYShare;
  context.save();
  context.translate(0, height);
  context.scale(radiusX, radiusY);
  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
  for (const { at, alpha } of CAPTION_GRADIENT.stops) {
    gradient.addColorStop(at, `rgba(${BLACK_RGB}, ${alpha})`);
  }
  context.fillStyle = gradient;
  context.fillRect(0, -1, width / radiusX, 1);
  context.restore();
}
