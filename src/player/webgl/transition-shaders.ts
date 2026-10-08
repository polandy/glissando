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
 * picture coordinates from the top left, which is also the texture's row order.
 */
const FRAGMENT_PRELUDE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 fragColor;
uniform sampler2D fromPicture;
uniform sampler2D toPicture;
uniform vec4 fromCrop;
uniform vec4 toCrop;
uniform float progress;
uniform float aspect;
/** Width of the blend between both pictures at a moving edge, in screen heights. */
const float SOFT_EDGE = 0.04;
const float DISSOLVE_CELL_PIXELS = 4.0;
/** A per-cell pseudo-random value in 0..1 (the well-known sin-hash). */
float cellNoise(vec2 cell) {
  return fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
}
vec4 pictureColor(sampler2D picture, vec4 crop, vec2 p) {
  return texture(picture, crop.xy + vec2(p.x, 1.0 - p.y) * crop.zw);
}
vec4 fromColor(vec2 p) { return pictureColor(fromPicture, fromCrop, p); }
vec4 toColor(vec2 p) { return pictureColor(toPicture, toCrop, p); }
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
