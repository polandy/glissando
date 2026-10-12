import type { BuildInfo } from "./build-info";

declare global {
  /** Put in by build/build-info.ts; only the composition root (main.ts) reads it. */
  const __GLISSANDO_BUILD_INFO__: BuildInfo;
}
