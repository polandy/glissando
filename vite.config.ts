import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [svelte()],
  // e2e/ belongs to Playwright.
  test: { include: ["src/**/*.test.ts"] },
});
