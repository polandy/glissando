#!/usr/bin/env node
// Measures the video export in Chromium: a generated slideshow of 24 pictures (3000 × 2000
// JPEGs, so decoding and uploading cost what a camera's pictures cost) with 60 s of generated
// music, exported at each preset on the desktop as it is and on a throttled phone profile
// (4x CPU slowdown, 390 × 844 viewport). Prints one markdown table: wall time, frames encoded
// per second, realtime factor (video seconds per wall second) and file size.
//
//   scripts/ci-image.sh node scripts/measure-video-export.mjs [--no-build] [--presets 720p,1080p,4k]
//
// Run in the pinned Playwright image, it builds the app and serves it with `vite preview`.
// That image has no GPU: Chromium encodes in software, so the numbers are a lower bound.
// Every picture and the music are generated here; no real photo is used.
/* global process, console, document, window, Window, Navigator, StorageManager, Buffer, performance, fetch, setTimeout, btoa */
import { chromium } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const build = !args.includes("--no-build");
const presetsIndex = args.indexOf("--presets");
const presetIds = presetsIndex >= 0 ? args[presetsIndex + 1].split(",") : ["720p", "1080p", "4k"];

const PORT = 4174;
const HOST = "127.0.0.1";
const URL = `http://${HOST}:${PORT}`;
const PICTURE_COUNT = 24;
const PICTURE_SIZE = { width: 3000, height: 2000 };
const JPEG_QUALITY = 0.9;
const MUSIC_SECONDS = 60;
const SAMPLE_RATE = 44_100;
const FRAMES_PER_SECOND = 30;
const PHONE_CPU_SLOWDOWN = 4;
const PHONE_VIEWPORT = { width: 390, height: 844 };
/** The preset radios' German names (the browser runs in German, as the e2e cases do). */
const PRESET_NAMES = { "720p": "Klein", "1080p": "Standard", "4k": "Groß" };
const EXPORT_TIMEOUT_MS = 60 * 60 * 1000;

/** A 16-bit stereo WAV of a slowly changing chord, so the audio encoder has real signal. */
function musicWav(seconds) {
  const channels = 2;
  const bytesPerSample = 2;
  const frames = seconds * SAMPLE_RATE;
  const dataLength = frames * channels * bytesPerSample;
  const wav = Buffer.alloc(44 + dataLength);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataLength, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(channels, 22);
  wav.writeUInt32LE(SAMPLE_RATE, 24);
  wav.writeUInt32LE(SAMPLE_RATE * channels * bytesPerSample, 28);
  wav.writeUInt16LE(channels * bytesPerSample, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataLength, 40);
  const chords = [
    [220, 277.18, 329.63],
    [196, 246.94, 293.66],
    [174.61, 220, 261.63],
    [196, 246.94, 329.63],
  ];
  for (let frame = 0; frame < frames; frame += 1) {
    const time = frame / SAMPLE_RATE;
    const chord = chords[Math.floor(time / 4) % chords.length];
    const value = chord.reduce((sum, hz) => sum + Math.sin(2 * Math.PI * hz * time), 0) / 4;
    for (let channel = 0; channel < channels; channel += 1) {
      const pan = channel === 0 ? 1 : 0.8;
      wav.writeInt16LE(Math.round(value * pan * 0x5fff), 44 + (frame * channels + channel) * 2);
    }
  }
  return { name: "Generated chords.wav", mimeType: "audio/wav", buffer: wav };
}

/** Busy generated pictures: gradients, circles and noise from a seeded generator. */
async function pictures(page) {
  const encoded = await page.evaluate(
    async ({ count, width, height, quality }) => {
      let seed = 1;
      const random = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      const result = [];
      for (let index = 0; index < count; index += 1) {
        const gradient = context.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, `hsl(${random() * 360} 70% 50%)`);
        gradient.addColorStop(1, `hsl(${random() * 360} 70% 30%)`);
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
        for (let shape = 0; shape < 400; shape += 1) {
          context.fillStyle = `hsl(${random() * 360} 80% ${30 + random() * 50}% / 0.5)`;
          context.beginPath();
          context.arc(random() * width, random() * height, 10 + random() * 200, 0, 2 * Math.PI);
          context.fill();
        }
        const noise = context.getImageData(0, 0, width, height);
        for (let at = 0; at < noise.data.length; at += 4) {
          const grain = (random() - 0.5) * 40;
          noise.data[at] += grain;
          noise.data[at + 1] += grain;
          noise.data[at + 2] += grain;
        }
        context.putImageData(noise, 0, 0);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = "";
        for (let at = 0; at < bytes.length; at += 0x8000) {
          binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
        }
        result.push(btoa(binary));
      }
      return result;
    },
    { count: PICTURE_COUNT, ...PICTURE_SIZE, quality: JPEG_QUALITY },
  );
  return encoded.map((base64, index) => ({
    name: `generated-${String(index + 1).padStart(2, "0")}.jpg`,
    mimeType: "image/jpeg",
    buffer: Buffer.from(base64, "base64"),
  }));
}

/** Writes `files` into `folder` (file choosers take at most 50 MB in memory) and returns their paths. */
function written(folder, files) {
  return files.map(({ name, buffer }) => {
    const path = join(folder, name);
    writeFileSync(path, buffer);
    return path;
  });
}

async function chooseFiles(page, buttonName, files) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: buttonName }).click();
  await (await chooser).setFiles(files);
}

async function createSlideshow(page, folder) {
  await page.getByRole("button", { name: "Neue Diashow" }).first().click();
  await chooseFiles(page, "Bilder auswählen", written(folder, await pictures(page)));
  await page.getByText(`${PICTURE_COUNT} Bilder`, { exact: true }).waitFor();
  await page.getByRole("button", { name: "Weiter" }).click();
  await chooseFiles(page, "Musik auswählen", written(folder, [musicWav(MUSIC_SECONDS)]));
  await page.getByRole("button", { name: "Diashow erstellen" }).click();
  await page.getByRole("status").filter({ hasText: "Diashow erstellt" }).waitFor();
}

async function exportOnce(page, presetId, workDir) {
  await page.getByRole("button", { name: "Als Video sichern" }).click();
  const sheet = page.getByRole("dialog", { name: "Als Video sichern" });
  const radio = sheet.getByRole("radio", { name: new RegExp(`^${PRESET_NAMES[presetId]}`) });
  await radio.waitFor();
  if ((await radio.getAttribute("aria-disabled")) === "true") {
    await sheet.getByRole("button", { name: "Schließen" }).first().click();
    return null;
  }
  await radio.click();
  const started = performance.now();
  await sheet.getByRole("button", { name: "Video erstellen" }).click();
  const done = page.getByRole("dialog", { name: "Video ist fertig" });
  const failed = page.getByRole("dialog", { name: "Video nicht erstellt" });
  await done.or(failed).waitFor({ timeout: EXPORT_TIMEOUT_MS });
  const wallSeconds = (performance.now() - started) / 1000;
  if (await failed.isVisible()) {
    const reason = await failed.getByRole("alert").textContent();
    await failed.getByRole("button", { name: "Schließen" }).first().click();
    return { failed: reason };
  }
  const download = page.waitForEvent("download");
  await done.getByRole("button", { name: "Herunterladen" }).click();
  const file = await download;
  const path = join(workDir, file.suggestedFilename());
  await file.saveAs(path);
  await done.getByRole("button", { name: "Schließen" }).first().click();
  await done.waitFor({ state: "hidden" });
  return { wallSeconds, bytes: statSync(path).size };
}

async function measureProfile(browser, profile, workDir) {
  const context = await browser.newContext({
    locale: "de-DE",
    acceptDownloads: true,
    ...(profile === "phone"
      ? { viewport: PHONE_VIEWPORT, isMobile: true, hasTouch: true }
      : { viewport: { width: 1440, height: 900 } }),
  });
  // The download path in every engine, as in E2E-030: no save picker, no share sheet.
  // Storage counts as persistent, so no dialog asks for it (as `openApp` in the e2e cases).
  await context.addInitScript(() => {
    StorageManager.prototype.persisted = () => Promise.resolve(true);
    Reflect.deleteProperty(Window.prototype, "showSaveFilePicker");
    Reflect.deleteProperty(window, "showSaveFilePicker");
    Navigator.prototype.canShare = () => false;
  });
  const page = await context.newPage();
  await page.goto(URL);
  await createSlideshow(page, workDir);
  if (profile === "phone") {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: PHONE_CPU_SLOWDOWN });
  }
  const rows = [];
  for (const presetId of presetIds) {
    const result = await exportOnce(page, presetId, workDir);
    rows.push({ profile, presetId, result });
    console.error(`${profile} ${presetId}: ${JSON.stringify(result)}`);
  }
  await context.close();
  return rows;
}

function formatRow({ profile, presetId, result }) {
  if (result === null) return `| ${profile} | ${presetId} | not encodable here | | | |`;
  if ("failed" in result) return `| ${profile} | ${presetId} | failed: ${result.failed} | | | |`;
  const frames = Math.ceil(MUSIC_SECONDS * FRAMES_PER_SECOND);
  const cells = [
    profile,
    presetId,
    `${result.wallSeconds.toFixed(1)} s`,
    (frames / result.wallSeconds).toFixed(1),
    `${(MUSIC_SECONDS / result.wallSeconds).toFixed(2)}×`,
    `${(result.bytes / 1e6).toFixed(1)} MB`,
  ];
  return `| ${cells.join(" | ")} |`;
}

if (build) execFileSync("npx", ["vite", "build"], { stdio: ["ignore", "ignore", "inherit"] });
const server = spawn(
  "npx",
  ["vite", "preview", "--host", HOST, "--port", String(PORT), "--strictPort"],
  {
    stdio: "ignore",
    detached: true,
  },
);
const workDir = mkdtempSync(join(tmpdir(), "video-export-"));
try {
  const browser = await chromium.launch();
  for (let attempt = 0; ; attempt += 1) {
    try {
      await fetch(URL);
      break;
    } catch (error) {
      if (attempt > 300) throw error;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  const rows = [
    ...(await measureProfile(browser, "desktop", workDir)),
    ...(await measureProfile(browser, "phone", workDir)),
  ];
  const version = browser.version();
  await browser.close();
  console.log(
    `${PICTURE_COUNT} generated ${PICTURE_SIZE.width} × ${PICTURE_SIZE.height} JPEGs, ` +
      `${MUSIC_SECONDS} s of generated music, ${FRAMES_PER_SECOND} frames/s; ` +
      `Chromium ${version} without a GPU (software encode: a lower bound).\n`,
  );
  console.log("| Profile | Preset | Wall time | Frames/s | Realtime | File |");
  console.log("| --- | --- | --- | --- | --- | --- |");
  for (const row of rows) console.log(formatRow(row));
} finally {
  process.kill(-server.pid);
  rmSync(workDir, { recursive: true, force: true });
}
