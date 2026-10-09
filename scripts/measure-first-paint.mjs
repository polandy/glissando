#!/usr/bin/env node
// Measures where the time goes between navigation and the app's first screen, per step:
// bytes per resource kind, first paint, first contentful paint, IndexedDB open, service
// worker registration and the app's first render (the first child of #app).
//
//   node scripts/measure-first-paint.mjs <url> [--phone] [--runs N] [--warm]
//
// --phone emulates a mid-range phone on Wi-Fi: 4x CPU slowdown, 30 Mbit/s, 20 ms latency.
// --warm measures a repeat visit (HTTP cache and service worker in place) instead of a first.
// Prints the median of N runs (default 5) as one table.
// Node's and, inside page.evaluate, the page's globals; the lint config knows neither for .mjs.
/* global process, console, window, document, navigator, performance, IDBFactory, MutationObserver, PerformanceObserver */
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const url = args.find((arg) => !arg.startsWith("--"));
if (!url) {
  console.error("usage: measure-first-paint.mjs <url> [--phone] [--runs N] [--warm]");
  process.exit(2);
}
const phone = args.includes("--phone");
const warm = args.includes("--warm");
const runsIndex = args.indexOf("--runs");
const runs = runsIndex >= 0 ? Number(args[runsIndex + 1]) : 5;

const PHONE_CPU_SLOWDOWN = 4;
const PHONE_NETWORK = {
  offline: false,
  latency: 20,
  downloadThroughput: (30 * 1024 * 1024) / 8,
  uploadThroughput: (15 * 1024 * 1024) / 8,
};

// Runs in the page before any of its scripts; stamps the steps the app does not mark itself.
const instrument = () => {
  const marks = {};
  window.__firstPaintMarks = marks;
  const stamp = (name) => {
    if (!(name in marks)) marks[name] = performance.now();
  };
  const open = IDBFactory.prototype.open;
  IDBFactory.prototype.open = function (...openArgs) {
    stamp("idbOpenStart");
    const request = open.apply(this, openArgs);
    request.addEventListener("success", () => stamp("idbOpenEnd"));
    return request;
  };
  if (navigator.serviceWorker) {
    const register = navigator.serviceWorker.register.bind(navigator.serviceWorker);
    navigator.serviceWorker.register = (...registerArgs) => {
      stamp("swRegisterStart");
      return register(...registerArgs).then((registration) => {
        stamp("swRegisterEnd");
        return registration;
      });
    };
  }
  new MutationObserver(() => {
    const app = document.getElementById("app");
    if (app?.firstElementChild) stamp("appFirstRender");
  }).observe(document, { childList: true, subtree: true });
};

async function measureOnce(browser) {
  const context = await browser.newContext(
    phone ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {},
  );
  await context.addInitScript(instrument);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  if (phone) {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: PHONE_CPU_SLOWDOWN });
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", PHONE_NETWORK);
  }
  if (warm) {
    await page.goto(url, { waitUntil: "load" });
    await page.waitForFunction(() => window.__firstPaintMarks.appFirstRender !== undefined);
    await page.evaluate(() => navigator.serviceWorker?.ready);
  }
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => window.__firstPaintMarks.appFirstRender !== undefined);
  // The paint entries land a frame after the render they record.
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        new PerformanceObserver((list, observer) => {
          if (list.getEntriesByName("first-contentful-paint").length) {
            observer.disconnect();
            resolve();
          }
        }).observe({ type: "paint", buffered: true });
      }),
  );
  const result = await page.evaluate(() => {
    const paint = Object.fromEntries(
      performance.getEntriesByType("paint").map((entry) => [entry.name, entry.startTime]),
    );
    const [navigation] = performance.getEntriesByType("navigation");
    const bytes = { js: 0, css: 0, font: 0, other: 0 };
    let requests = 0;
    for (const entry of performance.getEntriesByType("resource")) {
      requests += 1;
      const kind = /\.(m?js|ts|svelte)(\?|$)/.test(entry.name)
        ? "js"
        : /\.css(\?|$)/.test(entry.name)
          ? "css"
          : /\.woff2(\?|$)/.test(entry.name)
            ? "font"
            : "other";
      bytes[kind] += entry.transferSize || entry.encodedBodySize;
    }
    return {
      ...window.__firstPaintMarks,
      firstPaint: paint["first-paint"],
      firstContentfulPaint: paint["first-contentful-paint"],
      htmlResponseEnd: navigation.responseEnd,
      domContentLoaded: navigation.domContentLoadedEventEnd,
      requests,
      jsKB: bytes.js / 1024,
      cssKB: bytes.css / 1024,
      fontKB: bytes.font / 1024,
    };
  });
  await context.close();
  return result;
}

const median = (values) => {
  const sorted = values.filter((value) => value !== undefined).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : undefined;
};

const browser = await chromium.launch({ args: ["--ignore-certificate-errors"] });
const samples = [];
for (let run = 0; run < runs; run += 1) samples.push(await measureOnce(browser));
await browser.close();

const keys = [
  "htmlResponseEnd",
  "firstPaint",
  "firstContentfulPaint",
  "domContentLoaded",
  "swRegisterStart",
  "swRegisterEnd",
  "idbOpenStart",
  "idbOpenEnd",
  "appFirstRender",
  "requests",
  "jsKB",
  "cssKB",
  "fontKB",
];
console.log(`${url}  ${phone ? "phone" : "desktop"}  ${warm ? "warm" : "cold"}  median of ${runs}`);
for (const key of keys) {
  const value = median(samples.map((sample) => sample[key]));
  const unit = key.endsWith("KB") || key === "requests" ? "" : " ms";
  console.log(`  ${key.padEnd(22)}${value === undefined ? "—" : value.toFixed(0) + unit}`);
}
