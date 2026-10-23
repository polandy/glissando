import { svelte } from "@sveltejs/vite-plugin-svelte";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import { buildInfoPlugin } from "./build/build-info.ts";
import { committedLicensesPlugin } from "./build/committed-licenses.ts";
import { exportPlayerPlugin } from "./build/export-player-plugin.ts";
import { filePagePlugin } from "./build/file-page-plugin.ts";
import { pinnedThemePlugin } from "./build/pinned-theme-script.ts";
import { remotePagePlugin } from "./build/remote-page-plugin.ts";
import { sampleMusicConfigPlugin } from "./build/sample-music-config.ts";
import { serviceWorkerPlugin } from "./build/service-worker-plugin.ts";
import { sharePagePlugin } from "./build/share-page-plugin.ts";
import { tvStreamPlugin } from "./e2e/support/tv-stream-plugin.ts";
// Every module this config loads imports with explicit file extensions (ADR-0026).
import {
  fakeRemoteStreamPlugin,
  nextFakeRemoteCommand,
  sendFakeRemoteEvent,
  serveFakeRemoteApi,
  stopFakeRemoteApi,
} from "./src/remote-page/testing/fake-remote-api-command.ts";
import {
  releaseFakeSharePicture,
  serveFakeShareApi,
  stopFakeShareApi,
} from "./src/share-page/testing/fake-share-api-command.ts";
import {
  nextFakeTvReport,
  sendFakeTvEvent,
  serveFakeTvApi,
  stopFakeTvApi,
} from "./src/share-page/testing/fake-tv-api-command.ts";
import { THIRD_PARTY_LICENSES_FILE } from "./src/app/settings/third-party-licenses.ts";

const BROWSER_TESTS = "src/**/*.browser.test.ts";

export default defineConfig({
  // Relative, so the same build runs from any static host path (ADR-0005).
  base: "./",
  // Ships the licence of every bundled dependency, among them mediabunny's MPL-2.0 (ADR-0015).
  build: { license: { fileName: THIRD_PARTY_LICENSES_FILE } },
  plugins: [
    svelte(),
    buildInfoPlugin(),
    pinnedThemePlugin(),
    exportPlayerPlugin(),
    filePagePlugin(),
    sharePagePlugin(),
    remotePagePlugin(),
    sampleMusicConfigPlugin(),
    committedLicensesPlugin(),
    serviceWorkerPlugin(),
    // Only its configurePreviewServer hook does anything; e2e/support/fake-tv-api.ts needs it.
    tvStreamPlugin(),
  ],
  test: {
    // e2e/ belongs to Playwright.
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts", "build/**/*.test.ts", "server/**/*.test.ts"],
          exclude: [BROWSER_TESTS],
        },
      },
      {
        // WebGL and the DOM only exist in a browser; these run in each engine CI supports.
        extends: true,
        plugins: [fakeRemoteStreamPlugin()],
        test: {
          name: "browser",
          include: [BROWSER_TESTS],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            commands: {
              serveFakeShareApi,
              stopFakeShareApi,
              releaseFakeSharePicture,
              serveFakeTvApi,
              sendFakeTvEvent,
              nextFakeTvReport,
              stopFakeTvApi,
              serveFakeRemoteApi,
              sendFakeRemoteEvent,
              nextFakeRemoteCommand,
              stopFakeRemoteApi,
            },
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
                  "src/video-export/browser/clip-decode.browser.test.ts",
                  "src/video-export/browser/decode-clip-sound.browser.test.ts",
                  "src/app/clip-editor/clip-scrub.browser.test.ts",
                  "src/app/clip-editor/read-clip-peaks.browser.test.ts",
                  "src/player/create-frame-player.browser.test.ts",
                  "src/player/create-frame-player-video.browser.test.ts",
                  "src/compose/compose-chapters.browser.test.ts",
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
