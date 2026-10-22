/**
 * The slideshow's colour grade (ADR-0044): a 3×3 matrix and offset, clamped, then each channel's
 * own 5-knot tone curve — the same two steps `gradeColour` runs in JS (`grade-colour.ts`), so a
 * picture or video layer reads back identically in WebGL and the DOM fallback's SVG filter.
 * Shared by every transition's fragment shader (`transition-shaders.ts`).
 */
export const LOOK_GLSL = `
uniform int lookOn;
uniform mat3 lookMatrix;
uniform vec3 lookOffset;
uniform vec3 lookCurve[5];
/** The curve's value at \`c\` (0..1): 5 knots over 4 equal segments, linear between a pair. */
float lookCurveAt(int channel, float c) {
  float position = clamp(c, 0.0, 1.0) * 4.0;
  int segment = int(min(floor(position), 3.0));
  float t = position - float(segment);
  float from = lookCurve[segment][channel];
  float to = lookCurve[segment + 1][channel];
  return from + t * (to - from);
}
/** Unchanged when the show has no look: the caller never calls this with \`lookOn == 0\`. */
vec3 gradedLook(vec3 rgb) {
  vec3 matrixed = clamp(lookMatrix * rgb + lookOffset, 0.0, 1.0);
  return vec3(lookCurveAt(0, matrixed.r), lookCurveAt(1, matrixed.g), lookCurveAt(2, matrixed.b));
}
/** A layer's colour, graded when the show has one; a ground card is never passed through this. */
vec4 withLook(vec4 colour) {
  return lookOn == 1 ? vec4(gradedLook(colour.rgb), colour.a) : colour;
}
`;
