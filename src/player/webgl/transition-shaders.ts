import { VEIL_CONTRAST_SHARE, VEIL_SATURATION_SHARE, VEIL_TINT_OPACITY_SHARE } from "../card-veil";
import { BACKDROP_BRIGHTNESS } from "../slide-layout";
import type { TransitionEffect } from "../slideshow";
import { LAYOUT_CODE } from "./layer-uniforms";

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
uniform sampler2D fromBackdrop;
uniform sampler2D toBackdrop;
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
uniform float fromCaptionOpacity;
uniform float toCaptionOpacity;
uniform int fromIsGround;
uniform int toIsGround;
uniform vec3 fromGroundColor;
uniform vec3 toGroundColor;
uniform float fromVeilAmount;
uniform float toVeilAmount;
uniform vec3 fromVeilTint;
uniform vec3 toVeilTint;
uniform sampler2D fromCard;
uniform sampler2D toCard;
uniform float fromCardOpacity;
uniform float toCardOpacity;
/** The card's drift, as a fraction of the screen height (positive: down). */
uniform float fromCardDrift;
uniform float toCardDrift;
uniform float progress;
uniform float aspect;
/** The caption band's height and its lift from the bottom, as shares of the screen height. */
uniform float captionBand;
uniform float captionInset;
/** 0 clear .. 1 black, mixed over the whole frame at the show's end (ADR-0032). */
uniform float endFade;
/** Width of the blend between both pictures at a moving edge, in screen heights. */
const float SOFT_EDGE = 0.04;
const float DISSOLVE_CELL_PIXELS = 4.0;
const int LAYOUT_COVER = ${LAYOUT_CODE.cover};
const int LAYOUT_BLURRED_FILL = ${LAYOUT_CODE["blurred-fill"]};
const int LAYOUT_PAIR = ${LAYOUT_CODE["pair-across"]};
/** The blurred fill's backdrop is darkened to this fraction of its brightness (ADR-0028). */
const float BACKDROP_BRIGHTNESS = ${glslFloat(BACKDROP_BRIGHTNESS)};
/** The veil's three shares (ADR-0032, \`dev-docs/player/TITLE_CARDS.md\` § Look). */
const float VEIL_SATURATION_SHARE = ${glslFloat(VEIL_SATURATION_SHARE)};
const float VEIL_CONTRAST_SHARE = ${glslFloat(VEIL_CONTRAST_SHARE)};
const float VEIL_TINT_OPACITY_SHARE = ${glslFloat(VEIL_TINT_OPACITY_SHARE)};
/** A per-cell pseudo-random value in 0..1 (the well-known sin-hash). */
float cellNoise(vec2 cell) {
  return fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
}
vec4 pictureColor(sampler2D picture, vec4 crop, vec2 p) {
  return texture(picture, crop.xy + vec2(p.x, 1.0 - p.y) * crop.zw);
}
/** The layer's backdrop, its picture blurred once when prepared, darkened (ADR-0028). */
vec4 blurredDarkened(sampler2D backdrop, vec4 crop, vec2 p) {
  return vec4(pictureColor(backdrop, crop, p).rgb * BACKDROP_BRIGHTNESS, 1.0);
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
  sampler2D backdrop,
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
    return blurredDarkened(backdrop, crop, p);
  }
  return pictureColor(picture, crop, p);
}
vec4 withCaption(vec4 picture, sampler2D caption, float captionOpacity, vec2 p) {
  float bandY = (p.y - captionInset) / captionBand;
  if (bandY < 0.0 || bandY > 1.0) {
    return picture;
  }
  vec4 band = texture(caption, vec2(p.x, 1.0 - bandY)) * captionOpacity;
  return vec4(band.rgb + picture.rgb * (1.0 - band.a), 1.0);
}
/**
 * The veil's look at \`amount\` (ADR-0032, \`dev-docs/player/TITLE_CARDS.md\` § Look): mix toward
 * the layer's own blurred backdrop, desaturate, pull contrast toward mid-grey, then mix toward
 * the card's tint, each step scaled by its share times \`amount\`. Unchanged at amount 0.
 */
vec4 applyVeil(vec4 colour, sampler2D backdrop, vec4 crop, vec2 p, float amount, vec3 tint) {
  if (amount <= 0.0) {
    return colour;
  }
  vec3 blurred = blurredDarkened(backdrop, crop, p).rgb;
  vec3 mixed = mix(colour.rgb, blurred, amount);
  float grey = dot(mixed, vec3(0.299, 0.587, 0.114));
  vec3 desaturated = mix(mixed, vec3(grey), VEIL_SATURATION_SHARE * amount);
  vec3 contrasted = mix(desaturated, vec3(0.5), VEIL_CONTRAST_SHARE * amount);
  vec3 tinted = mix(contrasted, tint, VEIL_TINT_OPACITY_SHARE * amount);
  return vec4(tinted, colour.a);
}
/** The card's title/subtitle texture (premultiplied), composited like \`withCaption\` but over the
 * whole screen and lifted by \`drift\` (ADR-0032). */
vec4 withCard(vec4 picture, sampler2D card, float opacity, float drift, vec2 p) {
  float v = 1.0 - p.y - drift;
  if (v < 0.0 || v > 1.0) {
    return picture;
  }
  vec4 text = texture(card, vec2(p.x, v)) * opacity;
  return vec4(text.rgb + picture.rgb * (1.0 - text.a), 1.0);
}
vec4 fromColor(vec2 p) {
  vec4 colour = fromIsGround == 1
    ? vec4(fromGroundColor, 1.0)
    : layerColor(fromLayout, fromPicture, fromPartner, fromBackdrop, fromCrop, fromSecondCrop, fromRect, fromRect2, p);
  vec4 veiled = applyVeil(colour, fromBackdrop, fromCrop, p, fromVeilAmount, fromVeilTint);
  vec4 captioned = withCaption(veiled, fromCaption, fromCaptionOpacity, p);
  return withCard(captioned, fromCard, fromCardOpacity, fromCardDrift, p);
}
vec4 toColor(vec2 p) {
  vec4 colour = toIsGround == 1
    ? vec4(toGroundColor, 1.0)
    : layerColor(toLayout, toPicture, toPartner, toBackdrop, toCrop, toSecondCrop, toRect, toRect2, p);
  vec4 veiled = applyVeil(colour, toBackdrop, toCrop, p, toVeilAmount, toVeilTint);
  vec4 captioned = withCaption(veiled, toCaption, toCaptionOpacity, p);
  return withCard(captioned, toCard, toCardOpacity, toCardDrift, p);
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
  return `${FRAGMENT_PRELUDE}\nvoid main() {${EFFECT_BODIES[effect]}
  fragColor = mix(fragColor, vec4(0.0, 0.0, 0.0, 1.0), endFade);\n}`;
}

/** `value` as a GLSL float literal, which needs a decimal point even when whole. */
function glslFloat(value: number): string {
  return Number.isInteger(value) ? value.toFixed(1) : String(value);
}
