import type { BitmapPicture } from "../browser/bitmap-loader";
import { CARD_DEFAULT_TINT } from "../card-palette";
import type { Rect, Size } from "../ken-burns";
import type { GroundSlideLayer, PictureSlideLayer, SlideLayer } from "../ports";
import { slideLayout } from "../slide-layout";
import { hexToRgb01 } from "./hex-color";
import { glScreenRect, LAYOUT_CODE, layerUniformRects } from "./layer-uniforms";
import type { PictureTextures } from "./picture-textures";

/** A layer with no further crop: the whole screen, the whole source. */
const FULL_RECT: Rect = { x: 0, y: 0, width: 1, height: 1 };

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
  readonly isGround: WebGLUniformLocation | null;
  readonly groundColor: WebGLUniformLocation | null;
  readonly veilAmount: WebGLUniformLocation | null;
  readonly veilTint: WebGLUniformLocation | null;
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
  readonly fromIsGround: WebGLUniformLocation | null;
  readonly toIsGround: WebGLUniformLocation | null;
  readonly fromGroundColor: WebGLUniformLocation | null;
  readonly toGroundColor: WebGLUniformLocation | null;
  readonly fromVeilAmount: WebGLUniformLocation | null;
  readonly toVeilAmount: WebGLUniformLocation | null;
  readonly fromVeilTint: WebGLUniformLocation | null;
  readonly toVeilTint: WebGLUniformLocation | null;
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
    isGround: uniforms.fromIsGround,
    groundColor: uniforms.fromGroundColor,
    veilAmount: uniforms.fromVeilAmount,
    veilTint: uniforms.fromVeilTint,
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
    isGround: uniforms.toIsGround,
    groundColor: uniforms.toGroundColor,
    veilAmount: uniforms.toVeilAmount,
    veilTint: uniforms.toVeilTint,
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
  if (layer.kind === "ground") {
    bindGroundLayer(gl, pictures, units, layer, uniforms);
    return;
  }
  bindPictureLayer(gl, pictures, units, layer, uniforms, viewport);
}

/** A picture layer: its own picture, its pair's partner, and the backdrop the veil needs even
 * outside a blurred fill, now that the veil can reuse it for any layout (ADR-0028, ADR-0032). */
function bindPictureLayer(
  gl: WebGL2RenderingContext,
  pictures: PictureTextures,
  units: LayerTextureUnits,
  layer: PictureSlideLayer<BitmapPicture>,
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
  gl.activeTexture(gl.TEXTURE0 + units.backdrop);
  pictures.backdrop(layer.picture);
  gl.uniform1i(uniforms.backdrop, units.backdrop);
  const layout = slideLayout(layer, viewport);
  gl.uniform1i(uniforms.layout, LAYOUT_CODE[layout.kind]);
  const rects = layerUniformRects(layout);
  setRect(gl, uniforms.crop, rects.crop);
  setRect(gl, uniforms.secondCrop, rects.secondCrop);
  setRect(gl, uniforms.rect, glScreenRect(rects.rect));
  setRect(gl, uniforms.rect2, glScreenRect(rects.rect2));
  gl.uniform1i(uniforms.isGround, 0);
  setColor(gl, uniforms.groundColor, hexToRgb01(CARD_DEFAULT_TINT));
  gl.uniform1f(uniforms.veilAmount, layer.card?.veilAmount ?? 0);
  setColor(gl, uniforms.veilTint, hexToRgb01(layer.card?.card.veil?.tint ?? CARD_DEFAULT_TINT));
}

/** A ground layer: no picture at all, just a flat colour behind its card (ADR-0032). Every
 * sampler still gets a complete texture, a 1x1 placeholder the shader never actually reads from. */
function bindGroundLayer(
  gl: WebGL2RenderingContext,
  pictures: PictureTextures,
  units: LayerTextureUnits,
  layer: GroundSlideLayer,
  uniforms: LayerUniforms,
): void {
  for (const unit of [units.picture, units.partner, units.backdrop]) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    pictures.placeholder();
  }
  gl.uniform1i(uniforms.picture, units.picture);
  gl.uniform1i(uniforms.partner, units.partner);
  gl.uniform1i(uniforms.backdrop, units.backdrop);
  gl.uniform1i(uniforms.layout, LAYOUT_CODE.cover);
  setRect(gl, uniforms.crop, FULL_RECT);
  setRect(gl, uniforms.secondCrop, FULL_RECT);
  setRect(gl, uniforms.rect, FULL_RECT);
  setRect(gl, uniforms.rect2, FULL_RECT);
  gl.uniform1i(uniforms.isGround, 1);
  setColor(gl, uniforms.groundColor, hexToRgb01(layer.ground));
  // A ground slide never carries a veil (ports.ts, ADR-0032).
  gl.uniform1f(uniforms.veilAmount, 0);
  setColor(gl, uniforms.veilTint, hexToRgb01(CARD_DEFAULT_TINT));
}

function setColor(
  gl: WebGL2RenderingContext,
  uniform: WebGLUniformLocation | null,
  [red, green, blue]: readonly [number, number, number],
): void {
  gl.uniform3f(uniform, red, green, blue);
}

function setRect(
  gl: WebGL2RenderingContext,
  uniform: WebGLUniformLocation | null,
  rect: Rect,
): void {
  gl.uniform4f(uniform, rect.x, rect.y, rect.width, rect.height);
}
