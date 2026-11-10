/**
 * Whether the demo slideshow button shows (dev-docs/app/INSTALLING_AND_OFFLINE.md), and where it
 * downloads from.
 */
export interface DemoSlideshowConfig {
  /** True only on the build GitHub Pages serves; never on the self-hosted Docker image. */
  readonly publicInstall: boolean;
  readonly url: string;
}
