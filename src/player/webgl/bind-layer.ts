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
  readonly backdrop: WebGLUniformLocation | null;
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
  readonly fromBackdrop: WebGLUniformLocation | null;
  readonly toBackdrop: WebGLUniformLocation | null;
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
    backdrop: uniforms.fromBackdrop,
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
    backdrop: uniforms.toBackdrop,
    layout: uniforms.toLayout,
    crop: uniforms.toCrop,
    secondCrop: uniforms.toSecondCrop,
    rect: uniforms.toRect,
    rect2: uniforms.toRect2,
  };
}

/** The texture units one layer's picture, partner picture and backdrop are bound to. */
export interface LayerTextureUnits {
  readonly picture: number;
  readonly partner: number;
  readonly backdrop: number;
}

/**
 * Binds a layer's picture, its layout (cover, blurred fill or pair), the partner picture its
 * pair layout needs and the backdrop its blurred fill needs, to the texture units and uniforms
 * `units` and `uniforms` name (ADR-0028).
 */
export function bindLayer(
  gl: WebGL2RenderingContext,
  pictures: PictureTextures,
  units: LayerTextureUnits,
  layer: SlideLayer<BitmapPicture>,
  uniforms: LayerUniforms,
  viewport: Size,
): void {
  gl.activeTexture(gl.TEXTURE0 + units.picture);
  pictures.texture(layer.picture);
  gl.uniform1i(uniforms.picture, units.picture);
  // A layer reads only the samplers its layout needs; every other one gets the front picture, so
  // its unit still holds a complete texture.
  gl.activeTexture(gl.TEXTURE0 + units.partner);
  pictures.texture(layer.partner?.picture ?? layer.picture);
  gl.uniform1i(uniforms.partner, units.partner);
  const layout = slideLayout(layer, viewport);
  gl.activeTexture(gl.TEXTURE0 + units.backdrop);
  if (layout.kind === "blurred-fill") {
    pictures.backdrop(layer.picture);
  } else {
    pictures.texture(layer.picture);
  }
  gl.uniform1i(uniforms.backdrop, units.backdrop);
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
