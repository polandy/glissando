/** A WebGL2 context that counts every call made through it, by method name. */
export interface CountingGl {
  readonly gl: WebGL2RenderingContext;
  /** The calls since the last `reset`. */
  calls(): Readonly<Record<string, number>>;
  reset(): void;
}

/** `gl` as it is; each method call also bumps its counter. Methods run bound to `gl`: WebGL's
 * methods and getters refuse any other `this`. */
export function countingGl(gl: WebGL2RenderingContext): CountingGl {
  let counts: Record<string, number> = {};
  const gl2 = new Proxy(gl, {
    get(target, property) {
      const value: unknown = Reflect.get(target, property);
      if (typeof value !== "function") {
        return value;
      }
      return (...args: unknown[]) => {
        const name = String(property);
        counts[name] = (counts[name] ?? 0) + 1;
        return (value as (...args: unknown[]) => unknown).apply(target, args);
      };
    },
  });
  return {
    gl: gl2,
    calls: () => ({ ...counts }),
    reset: () => {
      counts = {};
    },
  };
}
