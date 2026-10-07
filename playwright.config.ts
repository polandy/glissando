import { defineConfig, devices } from "@playwright/test";

const PREVIEW_PORT = 4173;
const BASE_URL = `http://localhost:${PREVIEW_PORT}`;

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
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: devices["Desktop Chrome"] },
    { name: "firefox", use: devices["Desktop Firefox"] },
    { name: "webkit", use: devices["Desktop Safari"] },
  ],
  webServer: {
    command: `npx vite build && npx vite preview --port ${PREVIEW_PORT} --strictPort`,
    url: BASE_URL,
  },
});
