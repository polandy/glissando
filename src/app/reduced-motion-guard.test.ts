import { describe, expect, it } from "vitest";

const STYLED_SOURCES = import.meta.glob<string>("./**/*.{svelte,css}", {
  eager: true,
  query: "?raw",
  import: "default",
});

const RUNNING_ANIMATION = /animation:\s*(?!none)\S/;
const REDUCED_MOTION_GUARD = "@media (prefers-reduced-motion: reduce)";

describe("reduced motion", () => {
  it("is honoured by every file that runs a CSS animation", () => {
    const sources = Object.entries(STYLED_SOURCES);
    const animated = sources.filter(([, text]) => RUNNING_ANIMATION.test(text));
    expect(animated.length).toBeGreaterThan(0);

    const unguarded = animated
      .filter(([, text]) => !text.includes(REDUCED_MOTION_GUARD))
      .map(([path]) => path);

    expect(unguarded).toEqual([]);
  });
});
