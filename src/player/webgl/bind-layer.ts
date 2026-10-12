import type { BitmapPicture } from "../browser/bitmap-loader";
import type { Rect, Size } from "../ken-burns";
import type { SlideLayer } from "../ports";
import { slideLayout } from "../slide-layout";
import { glScreenRect, LAYOUT_CODE, layerUniformRects } from "./layer-uniforms";
import type { PictureTextures } from "./picture-textures";

/** The uniform locations a layer's layout binds (see `layer-uniforms.ts`). */
export interface LayerUniforms {
  readonly picture: WebGLUniformLocation | null;
  readonly partner: WebGLUniformLocation | null;
  readonly layout: WebGLUniformLocation | null;
  readonly crop: WebGLUniformLocation | null;
  readonly secondCrop: WebGLUniformLocation | null;
  readonly rect: WebGLUniformLocation | null;
  readonly rect2: WebGLUniformLocation | null;
}

/** The `from`/`to`-prefixed uniform locations `fromUniforms`/`toUniforms` group into one side. */
export interface PairedLayerUniforms {
  readonly fromPicture: WebGLUniformLocation | null;
  readonly toPicture: WebGLUniformLocation | null;
  readonly fromPartner: WebGLUniformLocation | null;
  readonly toPartner: WebGLUniformLocation | null;
  readonly fromLayout: WebGLUniformLocation | null;
  readonly toLayout: WebGLUniformLocation | null;
  readonly fromCrop: WebGLUniformLocation | null;
  readonly toCrop: WebGLUniformLocation | null;
  readonly fromSecondCrop: WebGLUniformLocation | null;
  readonly toSecondCrop: WebGLUniformLocation | null;
  readonly fromRect: WebGLUniformLocation | null;
  readonly toRect: WebGLUniformLocation | null;
  readonly fromRect2: WebGLUniformLocation | null;
  readonly toRect2: WebGLUniformLocation | null;
}

export function fromUniforms(uniforms: PairedLayerUniforms): LayerUniforms {
  return {
    picture: uniforms.fromPicture,
    partner: uniforms.fromPartner,
    layout: uniforms.fromLayout,
    crop: uniforms.fromCrop,
    secondCrop: uniforms.fromSecondCrop,
    rect: uniforms.fromRect,
    rect2: uniforms.fromRect2,
  };
}

export function toUniforms(uniforms: PairedLayerUniforms): LayerUniforms {
  return {
    picture: uniforms.toPicture,
    partner: uniforms.toPartner,
    layout: uniforms.toLayout,
    crop: uniforms.toCrop,
    secondCrop: uniforms.toSecondCrop,
    rect: uniforms.toRect,
    rect2: uniforms.toRect2,
  };
}

/**
 * Binds a layer's picture, its layout (cover, blurred fill or pair) and the partner picture its
 * pair layout needs, to the texture units and uniforms `uniforms` names (ADR-0028).
 */
export function bindLayer(
  gl: WebGL2RenderingContext,
  pictures: PictureTextures,
  unit: number,
  partnerUnit: number,
  layer: SlideLayer<BitmapPicture>,
  uniforms: LayerUniforms,
  viewport: Size,
): void {
  gl.activeTexture(gl.TEXTURE0 + unit);
  pictures.texture(layer.picture);
  gl.uniform1i(uniforms.picture, unit);
  // A cover or blurred-fill layer never reads the partner sampler; bind the front picture so the
  // unit still holds a complete texture.
  gl.activeTexture(gl.TEXTURE0 + partnerUnit);
  pictures.texture(layer.partner?.picture ?? layer.picture);
  gl.uniform1i(uniforms.partner, partnerUnit);
  const layout = slideLayout(layer, viewport);
  gl.uniform1i(uniforms.layout, LAYOUT_CODE[layout.kind]);
  const rects = layerUniformRects(layout);
  setRect(gl, uniforms.crop, rects.crop);
  setRect(gl, uniforms.secondCrop, rects.secondCrop);
  setRect(gl, uniforms.rect, glScreenRect(rects.rect));
  setRect(gl, uniforms.rect2, glScreenRect(rects.rect2));
}

function setRect(
  gl: WebGL2RenderingContext,
  uniform: WebGLUniformLocation | null,
  rect: Rect,
): void {
  gl.uniform4f(uniform, rect.x, rect.y, rect.width, rect.height);
}
