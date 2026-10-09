import { beforeAll, describe, expect, it } from "vitest";
import cascadeDataUrl from "./facefinder.bin?url&inline";
import { findFocus } from "./find-focus";
import type { GreyImage } from "./grey-image";
import { unpackCascade, type Cascade } from "./pico";
import astronautPgmDataUrl from "./testing/astronaut-128.pgm?url&inline";

/**
 * astronaut-128.pgm: NASA's public-domain portrait of Eileen Collins as shipped by scikit-image
 * (skimage/data/astronaut.png, sha256 88431cd9…a6cb5), scaled to 128 × 128 and stored as 8-bit
 * grey. Her face sits a little left of centre, in the upper third.
 */
const FIXTURE_SIZE = 128;

let cascade: Cascade;
let astronaut: GreyImage;

async function bytesOf(dataUrl: string): Promise<Uint8Array> {
  return new Uint8Array(await (await fetch(dataUrl)).arrayBuffer());
}

/** Reads a binary PGM ("P5") whose header is exactly `P5\n<w> <h>\n255\n`. */
function greyFromPgm(bytes: Uint8Array, width: number, height: number): GreyImage {
  const header = new TextEncoder().encode(`P5\n${width} ${height}\n255\n`);
  return { width, height, pixels: bytes.subarray(header.length) };
}

function blank(width: number, height: number, grey: number): GreyImage {
  return { width, height, pixels: new Uint8Array(width * height).fill(grey) };
}

beforeAll(async () => {
  cascade = unpackCascade(new Int8Array((await bytesOf(cascadeDataUrl)).buffer));
  astronaut = greyFromPgm(await bytesOf(astronautPgmDataUrl), FIXTURE_SIZE, FIXTURE_SIZE);
});

describe("findFocus", () => {
  it("finds nothing to aim at in a blank picture", () => {
    expect(findFocus(blank(160, 120, 128), cascade)).toEqual({ kind: "none" });
  });

  it("finds nothing in a picture too small for the smallest face it looks for", () => {
    expect(findFocus(astronautCrop(16), cascade)).toEqual({ kind: "none" });
  });

  it("finds nothing when the only face is too faint to trust", () => {
    const faint = withContrast(astronaut, 0.05);

    expect(findFocus(faint, cascade)).toEqual({ kind: "none" });
  });

  it("still aims at a low-contrast face it is sure of", () => {
    const dim = withContrast(astronaut, 0.1);

    expect(findFocus(dim, cascade).kind).toBe("subject");
  });

  it("aims at the face of a portrait", () => {
    const focus = findFocus(astronaut, cascade);

    expect(focus.kind).toBe("subject");
    if (focus.kind !== "subject") return;
    const centreX = focus.box.x + focus.box.width / 2;
    const centreY = focus.box.y + focus.box.height / 2;
    expect(centreX).toBeGreaterThan(0.35);
    expect(centreX).toBeLessThan(0.5);
    expect(centreY).toBeGreaterThan(0.15);
    expect(centreY).toBeLessThan(0.3);
    expect(focus.box.width).toBeGreaterThan(0.15);
    expect(focus.box.width).toBeLessThan(0.35);
  });

  it("aims at the larger of two faces", () => {
    const enlarged = doubled(astronaut);
    const focus = findFocus(sideBySide(enlarged, astronaut), cascade);

    expect(focus.kind).toBe("subject");
    if (focus.kind !== "subject") return;
    const centreX = focus.box.x + focus.box.width / 2;
    expect(centreX).toBeLessThan(enlarged.width / (enlarged.width + astronaut.width));
  });

  it("keeps the box inside the picture for a face near its edge", () => {
    const focus = findFocus(astronautShiftedLeft(30), cascade);

    expect(focus.kind).toBe("subject");
    if (focus.kind !== "subject") return;
    const { x, y, width, height } = focus.box;
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(x + width).toBeLessThanOrEqual(1);
    expect(y + height).toBeLessThanOrEqual(1);
  });
});

/** The top-left `size` × `size` pixels of the astronaut. */
function astronautCrop(size: number): GreyImage {
  const pixels = new Uint8Array(size * size);
  for (let row = 0; row < size; row++) {
    pixels.set(
      astronaut.pixels.subarray(row * FIXTURE_SIZE, row * FIXTURE_SIZE + size),
      row * size,
    );
  }
  return { width: size, height: size, pixels };
}

/** The astronaut moved `columns` pixels left, so her face meets the left edge. */
function astronautShiftedLeft(columns: number): GreyImage {
  const width = FIXTURE_SIZE - columns;
  const pixels = new Uint8Array(width * FIXTURE_SIZE);
  for (let row = 0; row < FIXTURE_SIZE; row++) {
    const start = row * FIXTURE_SIZE + columns;
    pixels.set(astronaut.pixels.subarray(start, start + width), row * width);
  }
  return { width, height: FIXTURE_SIZE, pixels };
}

/** The picture at twice its size, each pixel repeated. */
function doubled(image: GreyImage): GreyImage {
  const width = image.width * 2;
  const height = image.height * 2;
  const pixels = new Uint8Array(width * height);
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      pixels[row * width + column] = image.pixels[(row >> 1) * image.width + (column >> 1)] ?? 0;
    }
  }
  return { width, height, pixels };
}

/** Two pictures next to each other, top-aligned on a black ground. */
function sideBySide(left: GreyImage, right: GreyImage): GreyImage {
  const width = left.width + right.width;
  const height = Math.max(left.height, right.height);
  const pixels = new Uint8Array(width * height);
  for (let row = 0; row < height; row++) {
    if (row < left.height) {
      pixels.set(left.pixels.subarray(row * left.width, (row + 1) * left.width), row * width);
    }
    if (row < right.height) {
      pixels.set(
        right.pixels.subarray(row * right.width, (row + 1) * right.width),
        row * width + left.width,
      );
    }
  }
  return { width, height, pixels };
}

/** The picture with its contrast around mid grey scaled by `factor`. */
function withContrast(image: GreyImage, factor: number): GreyImage {
  const midGrey = 128;
  return { ...image, pixels: image.pixels.map((grey) => midGrey + (grey - midGrey) * factor) };
}
