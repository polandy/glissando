import { defineConfig, devices } from "@playwright/test";
import { E2E_TV_STREAM_ENV } from "./e2e/support/tv-stream-plugin.ts";
import { BELOW_PATH, BELOW_PATH_PORT, BELOW_PATH_URL } from "./e2e/support/below-path.ts";
import { DEMO_URL } from "./e2e/support/demo-slideshow.ts";
import {
  E2E_NEXT_BUILD_ENV,
  NEXT_BUILD_COMMIT,
  NEXT_BUILD_COMMIT_DATE,
} from "./e2e/support/next-build-plugin.ts";
import { NEXT_BUILD_DIR, NEXT_BUILD_PORT, NEXT_BUILD_URL } from "./e2e/support/next-build.ts";

const PREVIEW_PORT = 4173;
const WITH_TV_STREAM = `${E2E_TV_STREAM_ENV}=1`;
const BASE_URL = `http://localhost:${PREVIEW_PORT}`;
const PREVIEW_ENV = { GLISSANDO_PUBLIC_INSTALL: "true", GLISSANDO_DEMO_URL: DEMO_URL };

export default defineConfig({
  testDir: "e2e",
  forbidOnly: true,
  // A flaky case is a bug in the case or the product, never retried away.
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    // Motion is waited on, never timed: cases see reduced motion unless they opt out.
    reducedMotion: "reduce",
    // A cached app would hide a change; a case about offline use opts in (ADR-0005).
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: devices["Desktop Chrome"] },
    { name: "firefox", use: devices["Desktop Firefox"] },
    { name: "webkit", use: devices["Desktop Safari"] },
  ],
  // Started in order, so the second preview serves the build the first one made.
  webServer: [
    {
      command: `npx vite build && ${WITH_TV_STREAM} npx vite preview --port ${PREVIEW_PORT} --strictPort`,
      url: BASE_URL,
      // So the start screen's demo card shows on every empty library; a case that needs it
      // intercepts DEMO_URL, and no other case clicks the card or asserts an empty library's
      // layout exhaustively.
      env: PREVIEW_ENV,
    },
    {
      command: `${WITH_TV_STREAM} npx vite preview --port ${String(BELOW_PATH_PORT)} --strictPort --base ${BELOW_PATH}`,
      url: BELOW_PATH_URL,
    },
    {
      // The same sources built again as another commit: the version an installed app updates to.
      command:
        `npx vite build --outDir ${NEXT_BUILD_DIR} --emptyOutDir && ` +
        `${E2E_NEXT_BUILD_ENV}=${NEXT_BUILD_DIR} npx vite preview --port ${String(NEXT_BUILD_PORT)} --strictPort`,
      url: NEXT_BUILD_URL,
      env: {
        ...PREVIEW_ENV,
        GLISSANDO_COMMIT: NEXT_BUILD_COMMIT,
        GLISSANDO_COMMIT_DATE: NEXT_BUILD_COMMIT_DATE,
      },
    },
  ],
});
