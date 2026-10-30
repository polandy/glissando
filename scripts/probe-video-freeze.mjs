#!/usr/bin/env node
// Probes whether a video slide's picture freezes before the slide ends while the sound runs on.
// Drives the built app (title slide, then one video slide) in host Chrome on a real GPU, records
// per animation frame the <video>'s state, the <video>'s presented frames (requestVideoFrameCallback),
// the time spent in texImage2D, and a CDP CPU profile of the video slide. Instrumentation is injected
// from outside; src/ is untouched. Uses only the clip you pass (generate one with ffmpeg).
//
//   npx vite build --minify false && npx vite preview --port 4211 &
//   node scripts/probe-video-freeze.mjs <url> <clip.mp4> [--cpu-slowdown N] [--gpu nvidia|amd|default]
//                                       [--headed] [--out file.json]
//
// Prints one JSON summary line (renderer, max rAF gap, texImage2D median/p95, dropped/total frames,
// freeze moment, seeks, clip lag) and the top self-time functions of the CPU profile.
/* global process, console, window, document, performance, requestAnimationFrame, HTMLMediaElement, HTMLVideoElement, WebGL2RenderingContext, StorageManager, Element */
import { chromium, devices } from "@playwright/test";
import { writeFileSync } from "node:fs";

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
const [url, clipPath] = positional;
if (!url || !clipPath) {
  console.error(
    "usage: probe-video-freeze.mjs <url> <clip.mp4> [--cpu-slowdown N] [--gpu nvidia|amd|default] [--headed] [--out f.json]",
  );
  process.exit(2);
}
const slowdown = Number(flag("--cpu-slowdown", "1"));
const gpu = flag("--gpu", "nvidia");
const headed = args.includes("--headed");
const outFile = flag("--out", "");
const MAX_WAIT_MS = 90_000;

const GPU_FLAGS = {
  nvidia: [
    "--use-angle=vulkan",
    "--enable-features=Vulkan",
    "--ignore-gpu-blocklist",
    "--disable-vulkan-surface",
  ],
  amd: ["--use-gl=angle", "--use-angle=gl-egl", "--ignore-gpu-blocklist"],
  default: [],
};

// Page side: runs before the app. Collects everything in window.__probe.
const instrument = () => {
  const probe = {
    frames: [],
    tex: [],
    presented: [],
    seeks: 0,
    plays: 0,
    events: [],
    video: null,
    t0: null,
    renderer: null,
  };
  window.__probe = probe;
  const texImage2D = WebGL2RenderingContext.prototype.texImage2D;
  WebGL2RenderingContext.prototype.texImage2D = function (...a) {
    const source = a[a.length - 1];
    const isVideo = source instanceof HTMLVideoElement;
    const start = performance.now();
    try {
      return texImage2D.apply(this, a);
    } finally {
      if (isVideo)
        probe.tex.push({
          t: start,
          ms: performance.now() - start,
          w: source.videoWidth,
          h: source.videoHeight,
        });
      if (!probe.renderer) {
        const info = this.getExtension("WEBGL_debug_renderer_info");
        probe.renderer = info ? this.getParameter(info.UNMASKED_RENDERER_WEBGL) : "unknown";
      }
    }
  };
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (
      this instanceof HTMLVideoElement &&
      !probe.video &&
      String(this.currentSrc || this.src).startsWith("blob:")
    )
      track(this);
    return play.apply(this, arguments);
  };
  function track(video) {
    probe.video = video;
    probe.t0 = performance.now();
    for (const type of ["seeking", "seeked", "waiting", "stalled", "ended", "error", "emptied"]) {
      video.addEventListener(type, () => {
        if (type === "seeking") probe.seeks += 1;
        probe.events.push({ t: performance.now(), type, ct: video.currentTime });
      });
    }
    const onFrame = (now, meta) => {
      probe.presented.push({
        t: now,
        mediaTime: meta.mediaTime,
        presentedFrames: meta.presentedFrames,
      });
      if (probe.video === video) video.requestVideoFrameCallback(onFrame);
    };
    video.requestVideoFrameCallback(onFrame);
    const tick = () => {
      const q = video.getVideoPlaybackQuality();
      probe.frames.push({
        t: performance.now(),
        ct: video.currentTime,
        rs: video.readyState,
        paused: video.paused,
        seeking: video.seeking,
        ended: video.ended,
        rate: video.playbackRate,
        dropped: q.droppedVideoFrames,
        total: q.totalVideoFrames,
        duration: video.duration,
      });
      if (
        (probe.frames.length < 20000 && document.contains(video)) ||
        (probe.frames.length < 20000 && !probe.gone)
      )
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
};

const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: false,
  args: [
    ...(headed ? [] : ["--headless=new"]),
    ...GPU_FLAGS[gpu],
    "--autoplay-policy=no-user-gesture-required",
  ],
});
const context = await browser.newContext({ ...devices["Pixel 7"], locale: "de-DE" });
await context.addInitScript(instrument);
await context.addInitScript(() => {
  StorageManager.prototype.persisted = () => Promise.resolve(true);
  Element.prototype.requestFullscreen = () => Promise.reject(new TypeError("fullscreen refused"));
});
const page = await context.newPage();
page.on("pageerror", (e) => console.error("pageerror", e.message));
const cdp = await context.newCDPSession(page);

// Build the show: import the clip, add a title slide, press play.
await page.goto(url);
await page.getByRole("button", { name: "Neue Diashow" }).first().click();
const chooser = page.waitForEvent("filechooser");
await page.getByRole("button", { name: "Medien auswählen" }).click();
await (await chooser).setFiles(clipPath);
await page.getByText("1 Bilder", { exact: true }).waitFor({ timeout: 120_000 });
await page.getByRole("button", { name: "Weiter" }).click();
await page.getByRole("button", { name: "Ohne Musik erstellen" }).click();
await page.getByRole("status").filter({ hasText: "Diashow erstellt" }).waitFor();
await page.getByRole("button", { name: "Titelbild", exact: true }).click();
await page.getByRole("textbox", { name: "Titel", exact: true }).fill("Probe");
await page.getByRole("dialog").getByRole("button", { name: "Fertig" }).click();
await page.getByRole("dialog").waitFor({ state: "hidden" });
await page.waitForTimeout(1000);

if (slowdown !== 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: slowdown });
await page.getByRole("button", { name: "Abspielen" }).last().click();

// Wait for the video slide to start, profile it, wait for the end card.
await page.waitForFunction(() => window.__probe.video, null, { timeout: MAX_WAIT_MS });
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 1000 });
await cdp.send("Profiler.start");
const endCard = page.getByRole("dialog").getByRole("heading", { name: "Ende" });
await endCard.waitFor({ timeout: MAX_WAIT_MS });
const endAt = await page.evaluate(() => performance.now());
const { profile } = await cdp.send("Profiler.stop");
const data = await page.evaluate(() => {
  const p = window.__probe;
  const canvas = document.createElement("canvas").getContext("webgl2");
  let renderer = p.renderer;
  if (!renderer && canvas) {
    const info = canvas.getExtension("WEBGL_debug_renderer_info");
    renderer = info ? canvas.getParameter(info.UNMASKED_RENDERER_WEBGL) : "unknown";
  }
  return {
    frames: p.frames,
    tex: p.tex,
    presented: p.presented,
    seeks: p.seeks,
    events: p.events,
    t0: p.t0,
    renderer,
  };
});
await browser.close();

const percentile = (values, q) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] : null;
};
const round = (n, d = 1) => (n === null || n === undefined ? null : Number(n.toFixed(d)));
const { frames, tex, presented } = data;
const gaps = frames.slice(1).map((f, i) => f.t - frames[i].t);
const last = frames[frames.length - 1];
// The video slide ends at the end card; presented frames are those the <video> handed over.
const lastPresented = presented[presented.length - 1];
const secondsBeforeEnd = lastPresented ? (endAt - lastPresented.t) / 1000 : null;
const lastNewFrame = presented.length ? presented[presented.length - 1] : null;
// Longest span between two presented frames, and when it started (seconds before the end).
let longestHold = { ms: 0, beforeEndS: null };
for (let i = 1; i < presented.length; i += 1) {
  const gap = presented[i].t - presented[i - 1].t;
  if (gap > longestHold.ms)
    longestHold = { ms: gap, beforeEndS: (endAt - presented[i - 1].t) / 1000 };
}
const final = frames.filter((f) => endAt - f.t < 1500).pop() ?? last;
const atFreeze = lastNewFrame ? frames.find((f) => f.t >= lastNewFrame.t) : null;
const wallS = (endAt - data.t0) / 1000;
const summary = {
  renderer: data.renderer,
  gpu,
  clip: clipPath.split("/").pop(),
  slowdown,
  videoSlideWallS: round(wallS),
  duration: round(last?.duration),
  maxRafGapMs: round(Math.max(...gaps)),
  medianRafGapMs: round(percentile(gaps, 0.5)),
  texSourceSize: tex.length ? `${tex[0].w}x${tex[0].h}` : null,
  texCalls: tex.length,
  texMedianMs: round(
    percentile(
      tex.map((t) => t.ms),
      0.5,
    ),
    2,
  ),
  texP95Ms: round(
    percentile(
      tex.map((t) => t.ms),
      0.95,
    ),
    2,
  ),
  texMaxMs: round(Math.max(...tex.map((t) => t.ms)), 2),
  dropped: last?.dropped,
  total: last?.total,
  presentedFrames: lastNewFrame?.presentedFrames,
  lastPresentedMediaTime: round(lastNewFrame?.mediaTime, 2),
  lastPresentedSecondsBeforeEnd: round(secondsBeforeEnd, 2),
  longestPresentedGapMs: round(longestHold.ms),
  longestGapStartsSecondsBeforeEnd: round(longestHold.beforeEndS, 2),
  readyStateAtLastPresented: atFreeze?.rs,
  endedAtLastPresented: atFreeze?.ended,
  readyStateAtEnd: final?.rs,
  endedAtEnd: final?.ended,
  currentTimeAtEnd: round(final?.ct, 2),
  seeks: data.seeks,
  minReadyState: Math.min(...frames.map((f) => f.rs)),
  framesWithReadyStateBelow3: frames.filter((f) => f.rs < 3).length,
  totalRafFrames: frames.length,
  clipLagVsClockAtEndS: round(((final?.t ?? endAt) - data.t0) / 1000 - (final?.ct ?? 0), 2),
};
console.log(JSON.stringify(summary));
if (outFile) writeFileSync(outFile, JSON.stringify({ summary, data }, null, 1));

// Top self-time functions from the CPU profile.
const self = new Map();
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
profile.samples.forEach((id, i) => {
  const dt = profile.timeDeltas[i] ?? 0;
  const { functionName, url: file, lineNumber } = byId.get(id).callFrame;
  const key = `${functionName || "(anonymous)"} ${file.split("/").pop()}:${lineNumber}`;
  self.set(key, (self.get(key) ?? 0) + dt);
});
const total = [...self.values()].reduce((a, b) => a + b, 0);
console.log("top self time (video slide):");
[...self.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 8)
  .forEach(([key, us]) =>
    console.log(
      `  ${((us / total) * 100).toFixed(1).padStart(5)}%  ${(us / 1000).toFixed(0).padStart(6)} ms  ${key}`,
    ),
  );
