/** Compiles both shaders and links them; on any failure the GL objects are deleted before `fail` throws. */
export function linkProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
  attributes: ReadonlyMap<string, number>,
  fail: (log: string) => Error,
): WebGLProgram {
  const program = gl.createProgram();
  const shaders: WebGLShader[] = [];
  const discard = (log: string): never => {
    for (const shader of shaders) gl.deleteShader(shader);
    gl.deleteProgram(program);
    throw fail(log);
  };
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertexSource],
    [gl.FRAGMENT_SHADER, fragmentSource],
  ] as const) {
    const shader = gl.createShader(type);
    if (shader === null) return discard("createShader returned null");
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      return discard(gl.getShaderInfoLog(shader) ?? "no log");
    }
    gl.attachShader(program, shader);
  }
  for (const [name, location] of attributes) gl.bindAttribLocation(program, location, name);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return discard(gl.getProgramInfoLog(program) ?? "no log");
  }
  for (const shader of shaders) gl.deleteShader(shader);
  return program;
}
