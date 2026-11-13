#!/usr/bin/env node
// Probes a .glissando file or a server slideshow for picture and music stutter while it plays.
// Drives the built app in a real browser, opens the file through "Datei öffnen" (or the server
// slideshow from the start screen), presses play and records for a while: long tasks and
// main-thread blocks, animation-frame gaps, the music element's clock (gaps where it stops
// advancing while playing), its pause/stall/seek events, every texture upload and
// createImageBitmap on the main thread with its size, and a CDP CPU profile.
// Instrumentation is injected from outside; src/ is untouched. Pass your own file; nothing of
// it is written anywhere. See dev-docs/player/TIMING.md (Measuring stutter).
//
//   npx vite build --minify false && npx vite preview --port 4211 &
//   node scripts/probe-playback-stutter/probe.mjs <url> <file.glissando> [--seconds 60] [--cpu-slowdown N]
//        [--gpu nvidia|amd|swiftshader|default] [--viewport phone|tv|4k|mac]
//        [--browser host|chromium|firefox|webkit] [--cpus 0-3] [--headed] [--out file.json]
//        [--server <title>]  plays the server slideshow of that title at <url> instead of a file
//        [--network-kbps N]  throttles the network once the show is on (Chromium)
//        [--picture-delay-ms N]  once the show is on, every Immich picture answers N ms later
//                                than the preparation measured, so pictures are late
// --browser host is the host's Chrome on its GPU; the others are Playwright's own builds (in the
// CI image: scripts/ci-image.sh). The CPU slowdown and the profile need a Chromium. --cpus pins
// the whole browser to those cores with taskset, so the workers are throttled too.
//
// Prints one JSON summary line and the top self-time functions of the CPU profile.
/* global process, console, window, setTimeout, StorageManager, Element */
import { chromium, devices, firefox, webkit } from "@playwright/test";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { instrument } from "./instrument.mjs";
import { printTopSelfTime, summarize } from "./summarize.mjs";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const BOOLEAN_FLAGS = new Set(["--headed"]);
const positional = args.filter(
  (arg, i) =>
    !arg.startsWith("--") && (!args[i - 1]?.startsWith("--") || BOOLEAN_FLAGS.has(args[i - 1])),
);
const [url, filePath = ""] = positional;
const serverTitle = flag("--server", null);
if (!url || (!filePath && !serverTitle)) {
  console.error(
    "usage: probe-playback-stutter.mjs <url> [file.glissando] [--server <title>] [--seconds 60] [--cpu-slowdown N] [--gpu nvidia|amd|swiftshader|default] [--viewport phone|tv|4k|mac] [--browser host|chromium|firefox|webkit] [--cpus 0-3] [--headed] [--out f.json]",
  );
  process.exit(2);
}
const seconds = Number(flag("--seconds", "60"));
const slowdown = Number(flag("--cpu-slowdown", "1"));
const gpu = flag("--gpu", "nvidia");
const viewport = flag("--viewport", "phone");
const headed = args.includes("--headed");
const outFile = flag("--out", "");
const browserKind = flag("--browser", "host");
const cpus = flag("--cpus", "");
const networkKbps = Number(flag("--network-kbps", "0"));
const pictureDelayMs = Number(flag("--picture-delay-ms", "0"));
const OPEN_TIMEOUT_MS = 180_000;

const GPU_FLAGS = {
  nvidia: [
    "--use-angle=vulkan",
    "--enable-features=Vulkan",
    "--ignore-gpu-blocklist",
    "--disable-vulkan-surface",
  ],
  amd: ["--use-gl=angle", "--use-angle=gl-egl", "--ignore-gpu-blocklist"],
  default: [],
  swiftshader: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
};

const ENGINES = { host: chromium, chromium, firefox, webkit };
const engine = ENGINES[browserKind];
const isChromium = browserKind === "host" || browserKind === "chromium";
let executablePath = browserKind === "host" ? "/usr/bin/google-chrome-stable" : undefined;
if (cpus) {
  const dir = mkdtempSync(join(tmpdir(), "probe-browser-"));
  const wrapper = join(dir, "browser");
  const target = executablePath ?? engine.executablePath();
  writeFileSync(wrapper, `#!/bin/sh\nexec taskset -c ${cpus} "${target}" "$@"\n`);
  chmodSync(wrapper, 0o755);
  executablePath = wrapper;
}
const browser = await engine.launch({
  ...(executablePath ? { executablePath } : {}),
  headless: browserKind !== "host",
  args: [
    ...(headed || browserKind !== "host" ? [] : ["--headless=new"]),
    ...(browserKind === "host" ? GPU_FLAGS[gpu] : []),
    ...(isChromium ? ["--autoplay-policy=no-user-gesture-required"] : []),
  ],
  ...(browserKind === "firefox"
    ? {
        firefoxUserPrefs: {
          "media.autoplay.default": 0,
          "media.autoplay.blocking_policy": 0,
          // Headless Firefox refuses WebGL without a GPU; forced, it renders in software.
          "webgl.force-enabled": true,
          "webgl.disabled": false,
          "gfx.webrender.software": true,
        },
      }
    : {}),
});
const VIEWPORTS = {
  phone: devices["Pixel 7"],
  tv: { viewport: { width: 1920, height: 1080 } },
  "4k": { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 },
  // A 13" MacBook Air: 2560x1664 device pixels, so the automatic quality picks 1440.
  mac: { viewport: { width: 1280, height: 832 }, deviceScaleFactor: 2 },
};
const contextOptions = { ...VIEWPORTS[viewport], locale: "de-DE" };
const context = await browser.newContext({
  ...contextOptions,
  // A service worker would fetch past the picture delay's route.
  ...(pictureDelayMs > 0 ? { serviceWorkers: "block" } : {}),
});
await context.addInitScript(instrument);
await context.addInitScript(() => {
  StorageManager.prototype.persisted = () => Promise.resolve(true);
  Element.prototype.requestFullscreen = () => Promise.reject(new TypeError("fullscreen refused"));
});
const page = await context.newPage();
page.on("pageerror", (e) => console.error("pageerror", e.message));
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") console.error("console", m.type(), m.text());
});
const cdp = isChromium ? await context.newCDPSession(page) : null;

// Once the show is on, every Immich picture (through the server's proxy) answers this much
// later than the ones the preparation measured: the pictures still to come are late.
let delayingPictures = false;
if (pictureDelayMs > 0) {
  await page.route("**/immich/**", async (route) => {
    const response = await route.fetch();
    if (delayingPictures) await new Promise((resolve) => setTimeout(resolve, pictureDelayMs));
    await route.fulfill({ response });
  });
}
await page.goto(url);
if (serverTitle) {
  await page
    .getByRole("region", { name: "Auf deinem Glissando-Server" })
    .getByRole("button", { name: serverTitle })
    .click({ timeout: OPEN_TIMEOUT_MS });
} else {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Datei öffnen" }).click();
  await (await chooser).setFiles(filePath);
}
const play = page.getByRole("button", { name: "Abspielen", exact: true }).last();
await play.waitFor({ timeout: OPEN_TIMEOUT_MS });
await page.waitForTimeout(2000);

if (slowdown !== 1 && cdp) await cdp.send("Emulation.setCPUThrottlingRate", { rate: slowdown });
if (cdp) {
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.setSamplingInterval", { interval: 1000 });
  await cdp.send("Profiler.start");
}
await play.click();
// A server slideshow prepares first; the show is on once its player dialog is there.
await page.getByRole("dialog").last().waitFor({ timeout: OPEN_TIMEOUT_MS });
// The dialog shows the preparation first; the show is on once its music plays.
await page.waitForFunction(() => window.__probe.started !== null, undefined, {
  timeout: OPEN_TIMEOUT_MS,
});
const playStart = await page.evaluate(() => window.__probe.started);
delayingPictures = true;
// Throttled only once the show is on: the pictures still to come arrive late, the song did not.
if (networkKbps > 0 && cdp) {
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 0,
    downloadThroughput: (networkKbps * 1000) / 8,
    uploadThroughput: (networkKbps * 1000) / 8,
  });
}
await page.waitForTimeout(seconds * 1000);
const profile = cdp ? (await cdp.send("Profiler.stop")).profile : null;
const data = await page.evaluate(() => {
  const p = window.__probe;
  return {
    longTasks: p.longTasks,
    blocks: p.blocks,
    slowGlCalls: p.slowGlCalls,
    imageDecodes: p.imageDecodes,
    frames: p.frames,
    tex: p.tex,
    bitmaps: p.bitmaps,
    audioEvents: p.audioEvents,
    audioTicks: p.audioTicks,
    renderer: p.renderer,
    started: p.started,
    mipmaps: p.mipmaps,
    pictureStarts: p.pictureStarts,
    workerMessages: p.workerMessages,
    audioDecodes: p.audioDecodes,
    outputTimestamps: p.outputTimestamps,
    renderCapacity: p.renderCapacity,
    hasRenderCapacity: Boolean(p.context?.renderCapacity),
  };
});
await browser.close();

const run = {
  browser: browserKind,
  gpu,
  viewport,
  slowdown,
  seconds,
  file: serverTitle ?? filePath.split("/").pop(),
};
const summary = summarize(data, playStart, run);
console.log(JSON.stringify(summary));
if (outFile) writeFileSync(outFile, JSON.stringify({ summary, data, playStart }, null, 1));
if (profile) printTopSelfTime(profile);
