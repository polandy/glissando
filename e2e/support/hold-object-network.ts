import type { Page } from "@playwright/test";

/** The built object network; the focus worker downloads it before it searches any picture. */
const OBJECT_NETWORK = "**/assets/yolox-nano-*.bin";

/**
 * Holds the focus worker's object network until the returned release is called, so the
 * faces-and-subjects search stays running for as long as the test needs it to.
 */
export async function holdObjectNetwork(page: Page): Promise<() => void> {
  let release = (): void => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.context().route(OBJECT_NETWORK, async (route) => {
    await released;
    await route.continue();
  });
  return release;
}
