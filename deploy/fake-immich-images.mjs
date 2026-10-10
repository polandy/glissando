// The fake Immich's generated images (deploy/fake-immich.mjs): pixels drawn here, deflated into
// a PNG — never real photos.
// Node's globals; the lint config does not know them for .mjs.
/* global Buffer */
import { crc32, deflateSync } from "node:zlib";

// A 5×7 bitmap font for the digits, one string of five bits per row.
const DIGITS = [
  "01110 10001 10011 10101 11001 10001 01110",
  "00100 01100 00100 00100 00100 00100 01110",
  "01110 10001 00001 00010 00100 01000 11111",
  "11111 00010 00100 00010 00001 10001 01110",
  "00010 00110 01010 10010 11111 00010 00010",
  "11111 10000 11110 00001 00001 10001 01110",
  "00110 01000 10000 11110 10001 10001 01110",
  "11111 00001 00010 00100 01000 01000 01000",
  "01110 10001 10001 01110 10001 10001 01110",
  "01110 10001 10001 01111 00001 00010 01100",
].map((glyph) => glyph.split(" "));
const GLYPH_ROWS = 7;
const GLYPH_ADVANCE = 6;

function hsl(hue, saturation, lightness) {
  const f = (n) => {
    const k = (n + hue / 30) % 12;
    const a = saturation * Math.min(lightness, 1 - lightness);
    return Math.round(255 * (lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}

export function faceRadius(width, height) {
  return 0.11 * Math.min(width, height);
}

/** Whether pixel (x, y) lies on the number's glyphs, the text's top-left at (left, top). */
function onNumber(text, x, y, left, top, cell) {
  const column = Math.floor((x - left) / cell);
  const row = Math.floor((y - top) / cell);
  if (row < 0 || row >= GLYPH_ROWS || column < 0) return false;
  const digit = Math.floor(column / GLYPH_ADVANCE);
  if (digit >= text.length || column % GLYPH_ADVANCE === GLYPH_ADVANCE - 1) return false;
  return DIGITS[Number(text[digit])][row][column % GLYPH_ADVANCE] === "1";
}

/** A PNG of a diagonal gradient with the photo's faces as discs and its number large near the bottom. */
export function drawPhoto(photo, width, height) {
  const from = hsl((photo.number * 47) % 360, 0.65, 0.6);
  const to = hsl((photo.number * 47 + 80) % 360, 0.6, 0.3);
  const text = String(photo.number);
  const cell = Math.max(1, Math.floor((0.3 * height) / GLYPH_ROWS));
  const left = Math.floor((width - (text.length * GLYPH_ADVANCE - 1) * cell) / 2);
  const top = Math.floor(0.62 * height);
  const shadow = Math.max(1, Math.floor(cell / 4));
  const radius = faceRadius(width, height);
  const faces = photo.faces.map(({ cx, cy }) => [cx * width, cy * height]);
  const stride = 1 + width * 3;
  const raw = Buffer.alloc(stride * height);
  const pixel = [0, 0, 0];
  const previous = [0, 0, 0];
  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    // PNG filter "Sub": each byte as the difference to the pixel on its left.
    raw[rowStart] = 1;
    previous.fill(0);
    for (let x = 0; x < width; x++) {
      const t = (x / width + y / height) / 2;
      for (let c = 0; c < 3; c++) pixel[c] = from[c] + (to[c] - from[c]) * t;
      for (const [fx, fy] of faces) {
        const dx = x - fx;
        const dy = y - fy;
        if (dx * dx + dy * dy < radius * radius) {
          const eye =
            (Math.abs(dx) - radius * 0.35) ** 2 + (dy + radius * 0.2) ** 2 < (radius * 0.12) ** 2;
          pixel[0] = eye ? 40 : 245;
          pixel[1] = eye ? 30 : 205;
          pixel[2] = eye ? 30 : 170;
        }
      }
      if (onNumber(text, x, y, left, top, cell)) pixel.fill(255);
      else if (onNumber(text, x - shadow, y - shadow, left, top, cell)) pixel.fill(20);
      for (let c = 0; c < 3; c++) {
        const value = Math.round(pixel[c]);
        raw[rowStart + 1 + x * 3 + c] = (value - previous[c]) & 0xff;
        previous[c] = value;
      }
    }
  }
  return png(width, height, raw);
}

function png(width, height, filteredRows) {
  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typed));
    return Buffer.concat([length, typed, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  // 8 bits per channel, colour type 2 (RGB), deflate, adaptive filtering, no interlace.
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(filteredRows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
