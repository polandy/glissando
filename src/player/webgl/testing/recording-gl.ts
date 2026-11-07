type GlMethod = {
  [K in keyof WebGL2RenderingContext]: WebGL2RenderingContext[K] extends (
    ...args: never[]
  ) => unknown
    ? K
    : never;
}[keyof WebGL2RenderingContext];

/** One call `recordingGl` saw: its arguments and what the real context answered. */
export interface GlCall<M extends GlMethod> {
  readonly args: Parameters<WebGL2RenderingContext[M]>;
  readonly result: ReturnType<WebGL2RenderingContext[M]>;
}

/**
 * `gl` as it is, but every call of `method` is also pushed to `calls`. Everything else goes to
 * `gl` itself, bound to it: WebGL's methods and getters refuse any other `this`.
 */
export function recordingGl<M extends GlMethod>(
  gl: WebGL2RenderingContext,
  method: M,
  calls: GlCall<M>[],
): WebGL2RenderingContext {
  const recorded = (...args: Parameters<WebGL2RenderingContext[M]>) => {
    const real = gl[method] as (...args: Parameters<WebGL2RenderingContext[M]>) => unknown;
    const result = real.apply(gl, args) as ReturnType<WebGL2RenderingContext[M]>;
    calls.push({ args, result });
    return result;
  };
  return new Proxy(gl, {
    get(target, property) {
      if (property === method) {
        return recorded;
      }
      const value: unknown = Reflect.get(target, property);
      return typeof value === "function" ? (value as () => unknown).bind(target) : value;
    },
  });
}
