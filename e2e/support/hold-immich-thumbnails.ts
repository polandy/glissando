import type { Page } from "@playwright/test";

const IMMICH_THUMBNAIL = /\/immich\/api\/assets\/[^/]+\/thumbnail/;

export interface ThumbnailHold {
  /** Resolves once a thumbnail request made after `arm()` is waiting. */
  firstHeld: Promise<void>;
  arm: () => void;
  /** Lets every held and every later thumbnail request through to the fake server. */
  release: () => void;
}

/**
 * Holds the Immich thumbnail requests that arrive between `arm()` and `release()`. Register it
 * after `fakeGlissandoServer`: Playwright asks the newest route first, and a held request
 * continues to the fake server's answer once released.
 */
export async function holdImmichThumbnails(page: Page): Promise<ThumbnailHold> {
  let armed = false;
  let announceFirst: () => void = () => undefined;
  let release: () => void = () => undefined;
  const firstHeld = new Promise<void>((resolve) => (announceFirst = resolve));
  const released = new Promise<void>((resolve) => (release = resolve));
  await page.route(IMMICH_THUMBNAIL, async (route) => {
    if (!armed) return route.fallback();
    announceFirst();
    await released;
    return route.fallback();
  });
  return { firstHeld, arm: () => (armed = true), release };
}
