import type { TransitionEffect } from "../slideshow";

export const VERTEX_SHADER = `#version 300 es
in vec2 position;
out vec2 uv;
void main() {
  uv = (position + 1.0) / 2.0;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

/**
 * Shared by every effect. Screen coordinates `p` run 0..1 from the bottom left; crops are in
 * picture coordinates from the top left, which is also the texture's row order. Each slide's
 * caption band (premultiplied) lies over its picture in screen space, unmoved by the Ken Burns
 * crop, so every effect carries it with the slide (ADR-0007).
 *
 * A layer's layout (cover, whole picture over a blurred fill, or a pair) is one of
 * `LAYOUT_COVER`/`LAYOUT_BLURRED_FILL`/`LAYOUT_PAIR`; a stacked pair reuses `LAYOUT_PAIR`, since
 * `rect`/`rect2` already place the halves where they belong (`layer-uniforms.ts`, ADR-0028).
 */
const FRAGMENT_PRELUDE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 fragColor;
uniform sampler2D fromPicture;
uniform sampler2D toPicture;
uniform sampler2D fromPartner;
uniform sampler2D toPartner;
uniform int fromLayout;
uniform int toLayout;
uniform vec4 fromCrop;
uniform vec4 toCrop;
uniform vec4 fromSecondCrop;
uniform vec4 toSecondCrop;
uniform vec4 fromRect;
uniform vec4 toRect;
uniform vec4 fromRect2;
uniform vec4 toRect2;
uniform sampler2D fromCaption;
uniform sampler2D toCaption;
uniform float progress;
uniform float aspect;
/** The caption band's height and its lift from the bottom, as shares of the screen height. */
uniform float captionBand;
uniform float captionInset;
/** Width of the blend between both pictures at a moving edge, in screen heights. */
const float SOFT_EDGE = 0.04;
const float DISSOLVE_CELL_PIXELS = 4.0;
const int LAYOUT_COVER = 0;
const int LAYOUT_BLURRED_FILL = 1;
const int LAYOUT_PAIR = 2;
/** The blurred fill's backdrop is darkened to this fraction of its brightness (ADR-0028). */
const float BACKDROP_BRIGHTNESS = 0.55;
/** A coarse enough mip level to read as "strongly blurred" (ADR-0028); textures carry mipmaps. */
const float BACKDROP_BLUR_LOD = 4.0;
/** A per-cell pseudo-random value in 0..1 (the well-known sin-hash). */
float cellNoise(vec2 cell) {
  return fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
}
vec4 pictureColor(sampler2D picture, vec4 crop, vec2 p) {
  return texture(picture, crop.xy + vec2(p.x, 1.0 - p.y) * crop.zw);
}
vec4 blurredDarkened(sampler2D picture, vec4 crop, vec2 p) {
  vec2 uvInPicture = crop.xy + vec2(p.x, 1.0 - p.y) * crop.zw;
  vec4 colour = textureLod(picture, uvInPicture, BACKDROP_BLUR_LOD);
  return vec4(colour.rgb * BACKDROP_BRIGHTNESS, colour.a);
}
bool insideRect(vec2 p, vec4 rect) {
  return p.x >= rect.x && p.x <= rect.x + rect.z && p.y >= rect.y && p.y <= rect.y + rect.w;
}
vec2 intoRect(vec2 p, vec4 rect) {
  return (p - rect.xy) / rect.zw;
}
/**
 * A layer's colour at \`p\`: one picture covering the screen, a pair's two halves (and the gap
 * between them, black) side by side across \`rect\`/\`rect2\`, or the front picture over \`rect\`
 * with the same picture, blurred and darkened, behind it.
 */
vec4 layerColor(
  int layoutKind,
  sampler2D picture,
  sampler2D partner,
  vec4 crop,
  vec4 secondCrop,
  vec4 rect,
  vec4 rect2,
  vec2 p
) {
  if (layoutKind == LAYOUT_PAIR) {
    if (insideRect(p, rect)) {
      return pictureColor(picture, crop, intoRect(p, rect));
    }
    if (insideRect(p, rect2)) {
      return pictureColor(partner, secondCrop, intoRect(p, rect2));
    }
    return vec4(0.0, 0.0, 0.0, 1.0);
  }
  if (layoutKind == LAYOUT_BLURRED_FILL) {
    if (insideRect(p, rect)) {
      return pictureColor(picture, secondCrop, intoRect(p, rect));
    }
    return blurredDarkened(picture, crop, p);
  }
  return pictureColor(picture, crop, p);
}
vec4 withCaption(vec4 picture, sampler2D caption, vec2 p) {
  float bandY = (p.y - captionInset) / captionBand;
  if (bandY < 0.0 || bandY > 1.0) {
    return picture;
  }
  vec4 band = texture(caption, vec2(p.x, 1.0 - bandY));
  return vec4(band.rgb + picture.rgb * (1.0 - band.a), 1.0);
}
vec4 fromColor(vec2 p) {
  vec4 colour = layerColor(fromLayout, fromPicture, fromPartner, fromCrop, fromSecondCrop, fromRect, fromRect2, p);
  return withCaption(colour, fromCaption, p);
}
vec4 toColor(vec2 p) {
  vec4 colour = layerColor(toLayout, toPicture, toPartner, toCrop, toSecondCrop, toRect, toRect2, p);
  return withCaption(colour, toCaption, p);
}
/** 0 where the reveal has not reached \`position\` yet, 1 behind it, soft in between. */
float revealed(float position, float extent) {
  return clamp((progress * (extent + SOFT_EDGE) - position) / SOFT_EDGE, 0.0, 1.0);
}
`;

/** Each body computes the colour at \`uv\`: all \`from\` at progress 0, all \`to\` at 1. */
const EFFECT_BODIES: Readonly<Record<TransitionEffect, string>> = {
  crossfade: `
    fragColor = mix(fromColor(uv), toColor(uv), progress);`,
  "push-left": `
    fragColor = uv.x < 1.0 - progress
      ? fromColor(uv + vec2(progress, 0.0))
      : toColor(uv - vec2(1.0 - progress, 0.0));`,
  "wipe-right": `
    fragColor = mix(fromColor(uv), toColor(uv), revealed(uv.x, 1.0));`,
  "circle-open": `
    vec2 fromCentre = (uv - 0.5) * vec2(aspect, 1.0);
    float farthestCorner = length(vec2(aspect, 1.0) * 0.5);
    fragColor = mix(fromColor(uv), toColor(uv), revealed(length(fromCentre), farthestCorner));`,
  "zoom-in": `
    vec2 zoomed = 0.5 + (uv - 0.5) / (1.0 + progress);
    fragColor = mix(fromColor(zoomed), toColor(uv), smoothstep(0.0, 1.0, progress));`,
  dissolve: `
    float noise = cellNoise(floor(gl_FragCoord.xy / DISSOLVE_CELL_PIXELS));
    fragColor = mix(fromColor(uv), toColor(uv), revealed(noise, 1.0));`,
};

export function fragmentShader(effect: TransitionEffect): string {
  return `${FRAGMENT_PRELUDE}\nvoid main() {${EFFECT_BODIES[effect]}\n}`;
}
