// A stand-in for Immich, in one of three modes (the first argument):
//   echo (default)   for deploy/test-image.sh: answers every request with what arrived —
//                    method, path and the credential headers — plus a sign-in cookie of its own,
//                    as Immich sets on a login, and logs one line per request.
//   gallery          for scripts/serve-server-library.sh: the reads Glissando makes, answered
//                    like Immich 3.3.1 over a generated library — albums, photos over several
//                    days, faces, and PNG images drawn at startup (never real photos). One asset
//                    answers 404 everywhere, as a photo deleted in Immich does.
//   seed-documents   prints server slideshow documents over the gallery's photos, one per line.
// Node's globals; the lint config does not know them for .mjs.
/* global console, process, Buffer, URL */
import { createServer } from "node:http";
import { crc32, deflateSync } from "node:zlib";

const PORT = 2283;
const JSON_TYPE = { "content-type": "application/json" };
const mode = process.argv[2] ?? "echo";

// ---- echo -------------------------------------------------------------------------------------

const SIGN_IN_COOKIE = "immich_access_token=upstream-cookie; Path=/; HttpOnly";
const ECHOED_HEADERS = ["x-api-key", "cookie", "authorization", "x-immich-share-key"];

function echo(request, response) {
  const received = {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(
      ECHOED_HEADERS.map((name) => [name, request.headers[name] ?? null]),
    ),
  };
  const body = JSON.stringify(received);
  console.log(`request ${body}`);
  response.writeHead(200, { ...JSON_TYPE, "set-cookie": SIGN_IN_COOKIE });
  response.end(body);
}

// ---- the gallery's library --------------------------------------------------------------------

const SERVER_VERSION = { major: 3, minor: 3, patch: 1 };
const PHOTO_COUNT = 42;
const PHOTOS_PER_DAY = 7;
const FIRST_DAY = Date.UTC(2025, 5, 14, 9, 0);
const DAY_MS = 86_400_000;
const PHOTO_SPACING_MS = 77 * 60_000;
const DEFAULT_SEARCH_SIZE = 250;
const THUMBNAIL_LONG_SIDE = 250;
const PREVIEW_LONG_SIDE = 1440;
const ORIGINAL_SIZES = {
  landscape: [2048, 1365],
  portrait: [1365, 2048],
  square: [1800, 1800],
};
const ALBUMS = [
  { number: 1, name: "Lake days", days: [0, 1] },
  { number: 2, name: "Old town", days: [2, 3] },
  { number: 3, name: "Mountains", days: [4] },
];
const GONE_ID = "00000000-0000-4000-8000-00000000dead";

const hex12 = (n) => n.toString(16).padStart(12, "0");
const iso = (ms) => new Date(ms).toISOString();

const photos = Array.from({ length: PHOTO_COUNT }, (_, index) => {
  const number = index + 1;
  const day = Math.floor(index / PHOTOS_PER_DAY);
  const shape = number % 5 === 0 ? "portrait" : number % 7 === 0 ? "square" : "landscape";
  const [width, height] = ORIGINAL_SIZES[shape];
  // Every third photo has no face, every fourth has two; centres in fractions of the image.
  const faceCount = number % 3 === 0 ? 0 : number % 4 === 1 ? 2 : 1;
  const faces = Array.from({ length: faceCount }, (_, k) => ({
    cx: 0.22 + 0.5 * k + 0.12 * ((number * 0.37) % 1),
    cy: 0.3 + 0.06 * k,
  }));
  return {
    id: `00000000-0000-4000-8000-${hex12(number)}`,
    number,
    day,
    width,
    height,
    faces,
    fileName: `GLS_${String(number).padStart(4, "0")}.png`,
    takenAt: iso(FIRST_DAY + day * DAY_MS + (index % PHOTOS_PER_DAY) * PHOTO_SPACING_MS),
  };
});

const albums = ALBUMS.map((album) => {
  const members = photos.filter((photo) => album.days.includes(photo.day));
  return {
    id: `a1b00000-0000-4000-8000-${hex12(album.number)}`,
    albumName: album.name,
    assetCount: members.length,
    albumThumbnailAssetId: members[0].id,
    startDate: members[0].takenAt,
    endDate: members.at(-1).takenAt,
    members: new Set(members.map((photo) => photo.id)),
  };
});

/** An album as Immich answers it: without the members this fake keeps for searching. */
function albumAnswer(album) {
  const answer = { ...album };
  delete answer.members;
  return answer;
}

// ---- generated images: pixels drawn here, deflated into a PNG ---------------------------------

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

function faceRadius(width, height) {
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

/** A diagonal gradient with the photo's faces as discs and its number large near the bottom. */
function drawPhoto(photo, width, height) {
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

function scaled(photo, longSide) {
  const scale = longSide / Math.max(photo.width, photo.height);
  return [Math.round(photo.width * scale), Math.round(photo.height * scale)];
}

// ---- gallery: the HTTP reads ------------------------------------------------------------------

function searchMetadata(query) {
  const size = query.size ?? DEFAULT_SEARCH_SIZE;
  const page = query.page ?? 1;
  const albumIds = query.albumIds ?? [];
  const inAlbums = albums.filter((album) => albumIds.includes(album.id));
  const matching = photos
    .filter((photo) => albumIds.length === 0 || inAlbums.some((a) => a.members.has(photo.id)))
    .sort((a, b) => a.takenAt.localeCompare(b.takenAt) * (query.order === "asc" ? 1 : -1));
  const items = matching.slice((page - 1) * size, page * size).map((photo) => ({
    id: photo.id,
    type: "IMAGE",
    originalFileName: photo.fileName,
    originalMimeType: "image/png",
    localDateTime: photo.takenAt,
    fileCreatedAt: photo.takenAt,
    width: photo.width,
    height: photo.height,
    isFavorite: false,
    isTrashed: false,
  }));
  const nextPage = page * size < matching.length ? String(page + 1) : null;
  const noAlbums = { total: 0, count: 0, items: [], facets: [], nextPage: null };
  return {
    albums: noAlbums,
    assets: { total: matching.length, count: items.length, items, facets: [], nextPage },
  };
}

/** Faces as Immich reports them: boxes in the pixels of the preview it detected them on. */
function facesOf(photo) {
  const [imageWidth, imageHeight] = scaled(photo, PREVIEW_LONG_SIDE);
  const radius = faceRadius(imageWidth, imageHeight);
  return photo.faces.map(({ cx, cy }, k) => ({
    id: `f0000000-0000-4000-8000-${hex12(photo.number * 10 + k)}`,
    imageWidth,
    imageHeight,
    boundingBoxX1: Math.round(cx * imageWidth - radius),
    boundingBoxY1: Math.round(cy * imageHeight - radius),
    boundingBoxX2: Math.round(cx * imageWidth + radius),
    boundingBoxY2: Math.round(cy * imageHeight + radius),
    person: null,
    sourceType: "machine-learning",
  }));
}

function serveGallery(images, apiKey) {
  const send = (response, status, body, headers = JSON_TYPE) => {
    response.writeHead(status, headers);
    response.end(Buffer.isBuffer(body) ? body : JSON.stringify(body));
  };
  const notFound = { message: "Not found or no asset.read access", statusCode: 404 };
  return async (request, response) => {
    const url = new URL(request.url, "http://immich");
    console.log(`${request.method} ${url.pathname}${url.search}`);
    if (request.headers["x-api-key"] !== apiKey) {
      return send(response, 401, { message: "Invalid API key", statusCode: 401 });
    }
    const route = `${request.method} ${url.pathname}`;
    if (route === "GET /api/server/version") return send(response, 200, SERVER_VERSION);
    if (route === "GET /api/albums") {
      return send(response, 200, albums.map(albumAnswer));
    }
    if (route === "POST /api/search/metadata") {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      return send(response, 200, searchMetadata(JSON.parse(Buffer.concat(chunks).toString())));
    }
    if (route === "GET /api/faces") {
      const photo = photos.find((candidate) => candidate.id === url.searchParams.get("id"));
      return photo ? send(response, 200, facesOf(photo)) : send(response, 404, notFound);
    }
    const asset = /^\/api\/assets\/([0-9a-f-]{36})\/(thumbnail|original)$/.exec(url.pathname);
    const image = asset && images.get(asset[1]);
    if (request.method !== "GET" || !image) return send(response, 404, notFound);
    const size = asset[2] === "original" ? "original" : url.searchParams.get("size");
    const bytes = image[size ?? "thumbnail"] ?? image.original;
    return send(response, 200, bytes, {
      "content-type": "image/png",
      "content-length": bytes.length,
    });
  };
}

// ---- seed documents ---------------------------------------------------------------------------

const SEED_SECONDS_PER_PICTURE = 4;
const CAPTIONS = new Map([
  [1, "Morning at the lake"],
  [4, "The long jetty"],
  [16, "Market square"],
]);

function seedDocument(title, createdAt, members, extraPictures = []) {
  const pictures = members.map((photo) => ({
    capturedAt: photo.takenAt,
    width: photo.width,
    height: photo.height,
    fileName: photo.fileName,
    immichAssetId: photo.id,
    ...(CAPTIONS.has(photo.number) ? { caption: CAPTIONS.get(photo.number) } : {}),
  }));
  return {
    format: "glissando-server",
    formatVersion: 1,
    slideshow: {
      title,
      createdAt,
      secondsPerPicture: SEED_SECONDS_PER_PICTURE,
      pictures: [...pictures, ...extraPictures],
    },
  };
}

function seedDocuments() {
  const [width, height] = ORIGINAL_SIZES.landscape;
  const gone = {
    capturedAt: iso(FIRST_DAY + 5 * DAY_MS),
    width,
    height,
    fileName: "GLS_GONE.png",
    immichAssetId: GONE_ID,
  };
  return [
    seedDocument("Lake days", "2025-06-20T18:00:00Z", photos.slice(0, 14)),
    seedDocument("Old town walk", "2025-06-21T18:00:00Z", photos.slice(14, 22)),
    seedDocument("Gone from Immich", "2025-06-22T18:00:00Z", photos.slice(35, 39), [gone]),
  ];
}

// ---- start ------------------------------------------------------------------------------------

if (mode === "echo") {
  createServer(echo).listen(PORT, () => console.log(`listening on ${PORT}`));
} else if (mode === "gallery") {
  const apiKey = process.env.FAKE_IMMICH_API_KEY;
  if (!apiKey) throw new Error("gallery mode needs FAKE_IMMICH_API_KEY, the key Glissando sends");
  console.log(`drawing ${PHOTO_COUNT} photos in three sizes`);
  const images = new Map(
    photos.map((photo) => [
      photo.id,
      {
        thumbnail: drawPhoto(photo, ...scaled(photo, THUMBNAIL_LONG_SIDE)),
        preview: drawPhoto(photo, ...scaled(photo, PREVIEW_LONG_SIDE)),
        original: drawPhoto(photo, photo.width, photo.height),
      },
    ]),
  );
  createServer(serveGallery(images, apiKey)).listen(PORT, () =>
    console.log(`listening on ${PORT}`),
  );
} else if (mode === "seed-documents") {
  for (const seed of seedDocuments()) console.log(JSON.stringify(seed));
} else {
  throw new Error(`unknown mode "${mode}"; the modes are: echo, gallery, seed-documents`);
}
