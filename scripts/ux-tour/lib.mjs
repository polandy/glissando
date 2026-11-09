import { chromium } from "@playwright/test";
import { syntheticJpeg } from "./exif.mjs";
export const OUT = process.env.UX_TOUR_OUT ?? new URL("./shots/", import.meta.url).pathname;
export const VP = {
  phone: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
};
export async function launch(kind) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    ...VP[kind],
    colorScheme: "light",
    locale: "en-US",
    ignoreHTTPSErrors: true,
    serviceWorkers: "block",
    acceptDownloads: true,
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    StorageManager.prototype.persisted = () => Promise.resolve(true);
    Element.prototype.requestFullscreen = () => Promise.reject(new TypeError("no fs"));
  });
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  return { browser, ctx, page };
}
export function wav(seconds) {
  const rate = 8000,
    n = rate * seconds,
    b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + n * 2, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++)
    b.writeInt16LE(
      Math.round(
        Math.sin((i / 8) * 2 * Math.PI * (1 + (i % 4000 < 100 ? 4 : 0))) *
          6000 *
          (i % 4000 < 800 ? 1 : 0.15),
      ),
      44 + i * 2,
    );
  return b;
}
const COLS = [
  ["#ff8a65", "#4527a0"],
  ["#4db6ac", "#ffd54f"],
  ["#9575cd", "#26a69a"],
  ["#f06292", "#fff176"],
  ["#4fc3f7", "#aed581"],
  ["#ffb74d", "#7e57c2"],
  ["#81c784", "#e57373"],
  ["#64b5f6", "#ba68c8"],
];
export async function pictures(page, n, dayStart = 10, size = [640, 480]) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const b64 = await page.evaluate(
      ([[a, c], [w, h], i]) => {
        const cv = document.createElement("canvas");
        cv.width = w;
        cv.height = h;
        const x = cv.getContext("2d");
        const g = x.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, a);
        g.addColorStop(1, c);
        x.fillStyle = g;
        x.fillRect(0, 0, w, h);
        x.fillStyle = "rgba(255,255,255,.85)";
        x.beginPath();
        x.arc(w * (0.15 + 0.12 * i), h * (0.2 + 0.07 * (i % 4)), h * (0.08 + 0.02 * i), 0, 7);
        x.fill();
        for (let k = 0; k < 3 + i; k++) {
          x.fillStyle = `hsla(${i * 40 + k * 70},70%,${30 + k * 8}%,.7)`;
          x.fillRect(
            w * ((k * 0.29 + i * 0.13) % 0.9),
            h * (0.5 + 0.1 * ((k + i) % 4)),
            w * 0.1,
            h * 0.35,
          );
        }
        x.fillStyle = "rgba(0,0,0,.3)";
        x.beginPath();
        x.moveTo(0, h);
        x.lineTo(w * (0.2 + 0.08 * i), h * (0.4 + 0.04 * i));
        x.lineTo(w, h);
        x.fill();
        x.fillStyle = "#fff";
        x.font = `bold ${h / 6}px sans-serif`;
        x.fillText(String(i + 1), w * 0.8, h * 0.3);
        return cv.toDataURL("image/jpeg", 0.9).split(",")[1];
      },
      [COLS[i % COLS.length], size, i],
    );
    const jpg = Buffer.from(b64, "base64");
    const exifSource = syntheticJpeg({
      byteOrder: "little",
      dateTimeOriginal:
        new Date(Date.UTC(2025, 6, dayStart + i * 2))
          .toISOString()
          .slice(0, 10)
          .replaceAll("-", ":") + " 12:00:00",
    }).bytes;
    const app1Len = 2 + (exifSource[4] << 8) + exifSource[5];
    const jpg2 = Buffer.concat([
      jpg.subarray(0, 2),
      Buffer.from(exifSource.subarray(2, 2 + app1Len)),
      jpg.subarray(2),
    ]);
    out.push({ name: `pic-${i + 1}.jpg`, mimeType: "image/jpeg", buffer: jpg2 });
  }
  return out;
}
let counter = 0;
export function shotter(page, kind, startAt = 0) {
  counter = startAt;
  return async (name) => {
    counter++;
    const f = `${OUT}${String(counter).padStart(2, "0")}-${name}-${kind}.png`;
    await page.waitForTimeout(500);
    await page.screenshot({ path: f });
    console.log("shot", f.split("/").pop());
  };
}
export async function dump(page) {
  const items = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        "button,a,[role=radio],[role=tab],input,[role=switch],[role=checkbox]",
      ),
    ]
      .filter((e) => e.getBoundingClientRect().width > 0)
      .map(
        (e) =>
          `${e.tagName}|${e.getAttribute("role") ?? ""}|${(e.getAttribute("aria-label") || e.innerText || e.value || "").replace(/\s+/g, " ").slice(0, 60)}`,
      ),
  );
  console.log(items.join("\n"));
}
