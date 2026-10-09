import { svelte } from "@sveltejs/vite-plugin-svelte";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import { pinnedThemePlugin } from "./build/pinned-theme-script.ts";
import { serviceWorkerPlugin } from "./build/service-worker-plugin.ts";
import { THIRD_PARTY_LICENSES_FILE } from "./src/app/settings/third-party-licenses.ts";

const BROWSER_TESTS = "src/**/*.browser.test.ts";

export default defineConfig({
  // Relative, so the same build runs from any static host path (ADR-0005).
  base: "./",
  // Ships the licence of every bundled dependency, among them mediabunny's MPL-2.0 (ADR-0015).
  build: { license: { fileName: THIRD_PARTY_LICENSES_FILE } },
  plugins: [svelte(), pinnedThemePlugin(), serviceWorkerPlugin()],
  test: {
    // e2e/ belongs to Playwright.
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts", "build/**/*.test.ts"],
          exclude: [BROWSER_TESTS],
        },
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
              // tests the DOM fallback, Chromium and WebKit test the WebGL renderer. Nor has it
              // an audio output, so its AudioContext never runs. The video export needs WebGL2.
              {
                browser: "firefox",
                exclude: [
                  "src/player/webgl/**",
                  "src/player/browser/web-audio-unlock.browser.test.ts",
                  "src/video-export/browser/run-video-export.browser.test.ts",
                ],
              },
              { browser: "webkit" },
            ],
          },
        },
      },
    ],
  },
});
