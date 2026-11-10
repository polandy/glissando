import type { DemoSlideshowConfig } from "./demo-slideshow-config";

declare global {
  /** Put in by build/demo-slideshow-config.ts; only the composition root (main.ts) reads it. */
  const __GLISSANDO_DEMO_SLIDESHOW__: DemoSlideshowConfig;
}
