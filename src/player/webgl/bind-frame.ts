import type { PixelPicture } from "../browser/pixel-loader";
import type { Size } from "../ken-burns";
import type { RenderFrame, SlideLayer } from "../ports";
import { bindCaption } from "./bind-overlays";
import { bindLayer, fromUniforms, toUniforms } from "./bind-layer";
import { bindLook } from "./bind-look";
import type { CaptionTextures } from "./caption-textures";
import type { CardRenderTarget } from "./card-render-target";
import type { PictureTextures } from "./picture-textures";
import type { EffectProgram } from "./shader-programs";
import { TEXTURE_UNITS } from "./texture-units";

/** What a frame's two layers are drawn from. */
export interface FrameTextures {
  readonly pictures: PictureTextures;
  readonly captions: CaptionTextures;
  readonly fromCard: CardRenderTarget;
  readonly toCard: CardRenderTarget;
}

/** The frame's own values, apart from its layers. */
export interface FrameParameters {
  readonly frame: RenderFrame<PixelPicture>;
  readonly progress: number;
  readonly viewport: Size;
  readonly captionInsetCssPixels: number;
  readonly pixelRatio: number;
}

/** Binds both layers' textures and every uniform of the transition `program` and uses it. */
export function bindFrame(
  gl: WebGL2RenderingContext,
  { program, uniforms }: EffectProgram,
  textures: FrameTextures,
  layers: { readonly from: SlideLayer<PixelPicture>; readonly to: SlideLayer<PixelPicture> },
  { frame, progress, viewport, captionInsetCssPixels, pixelRatio }: FrameParameters,
): void {
  const { from, to } = layers;
  gl.useProgram(program);
  bindLayer(gl, textures.pictures, TEXTURE_UNITS.from, from, fromUniforms(uniforms), viewport);
  bindLayer(gl, textures.pictures, TEXTURE_UNITS.to, to, toUniforms(uniforms), viewport);
  bindCaption(
    gl,
    textures.captions,
    TEXTURE_UNITS.from.caption,
    from,
    uniforms.fromCaption,
    uniforms.fromCaptionOpacity,
    viewport,
  );
  bindCaption(
    gl,
    textures.captions,
    TEXTURE_UNITS.to.caption,
    to,
    uniforms.toCaption,
    uniforms.toCaptionOpacity,
    viewport,
  );
  bindCardTexture(gl, TEXTURE_UNITS.from.card, textures.fromCard, uniforms.fromCard);
  bindCardTexture(gl, TEXTURE_UNITS.to.card, textures.toCard, uniforms.toCard);
  gl.uniform1f(uniforms.progress, progress);
  gl.uniform1f(uniforms.aspect, viewport.width / viewport.height);
  gl.uniform1f(uniforms.captionBand, textures.captions.bandShare(viewport));
  gl.uniform1f(uniforms.captionInset, (captionInsetCssPixels * pixelRatio) / viewport.height);
  gl.uniform1f(uniforms.endFade, frame.endFade);
  bindLook(gl, uniforms, frame.look);
}

/** Binds a layer's rendered card texture (or none, drawn transparent by `renderCardLayer`) to
 * the main program's `sampler` uniform. */
function bindCardTexture(
  gl: WebGL2RenderingContext,
  unit: number,
  target: CardRenderTarget,
  sampler: WebGLUniformLocation | null,
): void {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, target.texture);
  gl.uniform1i(sampler, unit);
}
