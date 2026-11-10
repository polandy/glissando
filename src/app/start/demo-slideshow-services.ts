import { browserNetworkStatus } from "../../immich/immich-availability";
import { browserDemoDownload } from "./browser-demo-download";
import type { DemoSlideshowConfig } from "./demo-slideshow-config";
import type { DemoConnectivity, DemoDownloadPort } from "./demo-slideshow-flow";

export interface DemoSlideshowServices {
  readonly config: DemoSlideshowConfig;
  readonly download: DemoDownloadPort;
  readonly connectivity: DemoConnectivity;
}

/** Builds the "Load demo slideshow" button's composition-root services (dev-docs/app/INSTALLING_AND_OFFLINE.md). */
export function createDemoSlideshowServices(window: Window): DemoSlideshowServices {
  return {
    config: __GLISSANDO_DEMO_SLIDESHOW__,
    download: browserDemoDownload(window.fetch.bind(window)),
    connectivity: browserNetworkStatus(window),
  };
}
