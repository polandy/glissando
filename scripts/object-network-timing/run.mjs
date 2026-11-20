#!/usr/bin/env node
// Times the object network per picture (one 416 px run) in the host's Chrome at 1x and 4x CPU
// throttle and prints one markdown table (ADR-0060). Runs on the host, not in the CI image,
// so the numbers are the owner's machine; the input is a seeded tensor, no photo is used.
//
//   node scripts/object-network-timing/run.mjs [--runs N] [--js-runs N] [--chrome <path>]
//
// The Rust kernels run N times (default 30); --js-runs N (default 0) also times the TypeScript
// runner, which takes seconds per run.
/* global process, console, window */
import { chromium } from "@playwright/test";
import { createServer } from "vite";

const THROTTLES = [1, 4];
const DEFAULT_RUNS = 30;
const DEFAULT_CHROME = "/usr/bin/google-chrome-stable";
const PAGE_PATH = "/scripts/object-network-timing/index.html";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const wasmRuns = Number(flag("--runs", DEFAULT_RUNS));
const jsRuns = Number(flag("--js-runs", 0));
const chrome = flag("--chrome", DEFAULT_CHROME);

const { summarize, timingTable } = await import("./summarize.ts");

const server = await createServer({ server: { host: "127.0.0.1", port: 0 }, logLevel: "error" });
await server.listen();
const origin = server.resolvedUrls.local[0].replace(/\/$/, "");
const browser = await chromium.launch({ executablePath: chrome });
const rows = [];
try {
  const context = await browser.newContext();
  for (const [runner, runs] of [
    ["wasm", wasmRuns],
    ["js", jsRuns],
  ]) {
    if (runs <= 0) continue;
    for (const throttle of THROTTLES) {
      const page = await context.newPage();
      const session = await context.newCDPSession(page);
      await session.send("Emulation.setCPUThrottlingRate", { rate: throttle });
      await page.goto(origin + PAGE_PATH);
      await page.waitForFunction(() => "timeRuns" in window);
      const samples = await page.evaluate(([r, n]) => window.timeRuns(r, n), [runner, runs]);
      rows.push({ runner, throttle, summary: summarize(samples) });
      await page.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(`Chrome ${browser.version()}\n\n${timingTable(rows)}`);
