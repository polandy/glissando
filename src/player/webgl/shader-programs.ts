import { TRANSITION_EFFECTS, type TransitionEffect } from "../slideshow";
import { fragmentShader, VERTEX_SHADER } from "./transition-shaders";
import { linkProgram } from "./link-program";
import { WebGlSetupError } from "./webgl-setup-error";

class ShaderCompileError extends WebGlSetupError {
  constructor(effect: TransitionEffect, log: string) {
    super(`the ${effect} shader does not compile or link: ${log}`);
    this.name = "ShaderCompileError";
  }
}

const UNIFORM_NAMES = [
  "fromPicture",
  "toPicture",
  "fromPartner",
  "toPartner",
  "fromBackdrop",
  "toBackdrop",
  "fromLayout",
  "toLayout",
  "fromCrop",
  "toCrop",
  "fromSecondCrop",
  "toSecondCrop",
  "fromRect",
  "toRect",
  "fromRect2",
  "toRect2",
  "fromCaption",
  "toCaption",
  "fromCaptionOpacity",
  "toCaptionOpacity",
  "fromIsGround",
  "toIsGround",
  "fromGroundColor",
  "toGroundColor",
  "fromVeilAmount",
  "toVeilAmount",
  "fromVeilTint",
  "toVeilTint",
  "fromCard",
  "toCard",
  "progress",
  "aspect",
  "captionBand",
  "captionInset",
  "endFade",
  "lookOn",
  "lookMatrix",
  "lookOffset",
  "lookCurve",
] as const;
export type UniformName = (typeof UNIFORM_NAMES)[number];

export interface EffectProgram {
  readonly program: WebGLProgram;
  readonly uniforms: Readonly<Record<UniformName, WebGLUniformLocation | null>>;
}

/** Compiles and links every transition's shader program, keyed by effect. */
export function compilePrograms(
  gl: WebGL2RenderingContext,
  positionAttribute: number,
): ReadonlyMap<TransitionEffect, EffectProgram> {
  return new Map(
    TRANSITION_EFFECTS.map((effect) => [effect, compile(gl, effect, positionAttribute)]),
  );
}

function compile(
  gl: WebGL2RenderingContext,
  effect: TransitionEffect,
  positionAttribute: number,
): EffectProgram {
  const program = linkProgram(
    gl,
    VERTEX_SHADER,
    fragmentShader(effect),
    new Map([["position", positionAttribute]]),
    (log) => new ShaderCompileError(effect, log),
  );
  const uniforms = Object.fromEntries(
    UNIFORM_NAMES.map((name) => [name, gl.getUniformLocation(program, name)]),
  ) as Record<UniformName, WebGLUniformLocation | null>;
  return { program, uniforms };
}
