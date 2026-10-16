/**
 * The demo slideshow's URL for e2e: every e2e build turns on `GLISSANDO_PUBLIC_INSTALL` and
 * points `GLISSANDO_DEMO_URL` here (playwright.config.ts), so the start screen's demo card shows
 * on an empty library. A case intercepts this exact URL with `page.route` and fulfils it with
 * its own fixture; nothing is ever fetched from the network.
 */
export const DEMO_URL = "https://e2e-demo.invalid/glissando-demo.glissando";
