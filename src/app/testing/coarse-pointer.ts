import { commands } from "vitest/browser";

declare module "vitest/browser" {
  interface BrowserCommands {
    /** Makes the page a touch device (Chromium only), so `(pointer: coarse)` matches. */
    setCoarsePointer: (coarse: boolean) => Promise<void>;
  }
}

/** True when the page's primary pointer is coarse, as the CSS sees it. */
export const pointerIsCoarse = () => matchMedia("(pointer: coarse)").matches;

/**
 * Turns touch emulation on for the test (the caller turns it off again in `afterEach`) and
 * returns once the page's media query matches: the renderer applies the change a moment after
 * the browser acknowledges, and the query's own `change` event says when.
 */
export async function emulateCoarsePointer(coarse: boolean): Promise<void> {
  const query = matchMedia("(pointer: coarse)");
  const followed = new Promise<void>((resolve) => {
    const settle = (): void => {
      if (query.matches === coarse) {
        query.removeEventListener("change", settle);
        resolve();
      }
    };
    query.addEventListener("change", settle);
    settle();
  });
  await commands.setCoarsePointer(coarse);
  await followed;
}
