import { svelte } from "@sveltejs/vite-plugin-svelte";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const BROWSER_TESTS = "src/**/*.browser.test.ts";

export default defineConfig({
  plugins: [svelte()],
  test: {
    // e2e/ belongs to Playwright.
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["src/**/*.test.ts"], exclude: [BROWSER_TESTS] },
      },
      {
        // WebGL and the DOM only exist in a browser; these run in each engine CI supports.
        extends: true,
        test: {
          name: "browser",
          include: [BROWSER_TESTS],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [
              { browser: "chromium" },
              // Headless Firefox in the CI image has no WebGL at all, whatever its prefs; it
              // tests the DOM fallback, Chromium and WebKit test the WebGL renderer.
              { browser: "firefox", exclude: ["src/player/webgl/**"] },
              { browser: "webkit" },
            ],
          },
        },
      },
    ],
  },
});
