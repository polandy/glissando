import type { SlideshowLook } from "../looks/slideshow-look";
import { lookUniformValues } from "./look-uniforms";
import type { UniformName } from "./shader-programs";

/** Sets the show's colour grade (ADR-0044): the same for both layers of a transition. */
export function bindLook(
  gl: WebGL2RenderingContext,
  uniforms: Readonly<Record<UniformName, WebGLUniformLocation | null>>,
  look: SlideshowLook,
): void {
  const values = lookUniformValues(look);
  gl.uniform1i(uniforms.lookOn, values.on ? 1 : 0);
  gl.uniformMatrix3fv(uniforms.lookMatrix, false, values.matrix);
  gl.uniform3f(uniforms.lookOffset, ...values.offset);
  gl.uniform3fv(uniforms.lookCurve, values.curve);
}
