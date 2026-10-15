import type { BitmapPicture } from "../browser/bitmap-loader";
import type { Size } from "../ken-burns";
import type { PictureSlideLayer, SlideLayer } from "../ports";
import type { CaptionTextures } from "./caption-textures";

/** A layer without a caption, so its band draws nothing regardless of this opacity. */
const OPAQUE_CAPTION = 1;

/** A picture layer's own caption, composited in screen space; a ground layer never has one. */
export function bindCaption(
  gl: WebGL2RenderingContext,
  captions: CaptionTextures,
  unit: number,
  layer: SlideLayer<BitmapPicture>,
  sampler: WebGLUniformLocation | null,
  opacityUniform: WebGLUniformLocation | null,
  viewport: Size,
): void {
  const { owner, caption, opacity } = captionTarget(layer);
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, captions.texture(owner, caption, viewport));
  gl.uniform1i(sampler, unit);
  gl.uniform1f(opacityUniform, opacity);
}

/** A picture layer's caption, keyed by its own picture, opaque unless shared with a card; a
 * ground layer has none (ports.ts). */
function captionTarget(layer: SlideLayer<BitmapPicture>): {
  readonly owner: object;
  readonly caption: string | undefined;
  readonly opacity: number;
} {
  if (layer.kind === "ground") {
    return { owner: layer.card.card, caption: undefined, opacity: OPAQUE_CAPTION };
  }
  const { picture, caption }: PictureSlideLayer<BitmapPicture> = layer;
  return { owner: picture, caption, opacity: layer.captionOpacity ?? OPAQUE_CAPTION };
}
