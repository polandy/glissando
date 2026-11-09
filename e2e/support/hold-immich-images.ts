import type { Page } from "@playwright/test";

/** The Immich image requests a hold can catch: a thumbnail or an original. */
export type ImmichImage = "thumbnail" | "original";

export interface ImmichImageHold {
  /** Resolves once a request made after `arm()` is waiting. */
  firstHeld: Promise<void>;
  arm: () => void;
  /** Lets every held and every later request through to the fake server. */
  release: () => void;
}

/**
 * Holds the Immich `image` requests that arrive between `arm()` and `release()`. Register it
 * after `fakeGlissandoServer`: Playwright asks the newest route first, and a held request
 * continues to the fake server's answer once released.
 */
export async function holdImmichImages(page: Page, image: ImmichImage): Promise<ImmichImageHold> {
  let armed = false;
  let announceFirst: () => void = () => undefined;
  let release: () => void = () => undefined;
  const firstHeld = new Promise<void>((resolve) => (announceFirst = resolve));
  const released = new Promise<void>((resolve) => (release = resolve));
  await page.route(new RegExp(`/immich/api/assets/[^/]+/${image}`), async (route) => {
    if (!armed) return route.fallback();
    announceFirst();
    await released;
    return route.fallback();
  });
  return { firstHeld, arm: () => (armed = true), release };
}
