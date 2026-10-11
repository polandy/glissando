/* global process, console, window, atob -- Node runs this file; its page.evaluate callbacks run in the browser. */
// Measures which audio files each Playwright engine decodes with decodeAudioData, and checks
// WebCodecs AudioDecoder.isConfigSupported for a set of codec strings (ADR-0020). Run through
// scripts/audio-decode-probe.sh, which uses the pinned CI image.
import { chromium, firefox, webkit } from "playwright";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import http from "node:http";

// The sample directory comes first on the command line, e.g. a folder of generated sine tones.
const filesDir = path.resolve(process.argv[2] ?? "src/import/testing/audio");
const files = readdirSync(filesDir).sort();

// AudioDecoder (WebCodecs) requires a secure context; about:blank / setContent() pages are
// opaque origins and report isSecureContext === false in Chromium, hiding AudioDecoder.
// http://localhost is treated as secure, so serve the probe page from a local HTTP server.
const server = http.createServer((_req, res) => res.end("<!doctype html><title>probe</title>"));
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const pageUrl = `http://localhost:${port}/`;

const codecs = ["mp4a.40.2", "mp3", "opus", "vorbis", "flac", "alac", "ac-3", "ec-3", "pcm-s16"];

const pageScript = async ({ base64, codecs }) => {
  const results = { decode: null, webCodecs: {} };

  // decodeAudioData via OfflineAudioContext (no user gesture required).
  try {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const ctx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 1, 44100);
    const buf = await ctx.decodeAudioData(bytes.buffer);
    results.decode = {
      ok: true,
      duration: buf.duration,
      channels: buf.numberOfChannels,
      sampleRate: buf.sampleRate,
    };
  } catch (e) {
    results.decode = { ok: false, name: e && e.name, message: e && e.message };
  }

  // WebCodecs AudioDecoder.isConfigSupported per codec string.
  results.webCodecsAvailable = typeof window.AudioDecoder !== "undefined";
  if (results.webCodecsAvailable) {
    for (const codec of codecs) {
      try {
        const support = await window.AudioDecoder.isConfigSupported({
          codec,
          sampleRate: 44100,
          numberOfChannels: 2,
        });
        results.webCodecs[codec] = { supported: !!support.supported };
      } catch (e) {
        results.webCodecs[codec] = { error: e && e.name, message: e && e.message };
      }
    }
  }

  return results;
};

const engines = { chromium, firefox, webkit };
const report = {};

for (const [name, launcher] of Object.entries(engines)) {
  report[name] = {};
  let browser;
  try {
    browser = await launcher.launch();
  } catch (e) {
    report[name].launchError = String(e);
    continue;
  }
  const page = await browser.newPage();
  await page.goto(pageUrl);

  for (const file of files) {
    const bytes = readFileSync(path.join(filesDir, file));
    const base64 = bytes.toString("base64");
    try {
      const result = await page.evaluate(pageScript, { base64, codecs });
      report[name][file] = result;
    } catch (e) {
      report[name][file] = { decode: { ok: false, name: "EvalThrew", message: String(e) } };
    }
  }

  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
server.close();
