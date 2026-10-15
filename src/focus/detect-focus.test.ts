import { beforeAll, describe, expect, it } from "vitest";
import type { RgbaImage } from "./animal-focus";
import cascadeDataUrl from "./facefinder.bin?url&inline";
import { detectFocus, type FocusModels } from "./detect-focus";
import { item } from "./onnx/item";
import { parseOnnx } from "./onnx/onnx-model";
import { unpackCascade } from "./pico";
import astronautPgmDataUrl from "./testing/astronaut-128.pgm?url&inline";
import chelseaPpmDataUrl from "./testing/chelsea-160.ppm?url&inline";
import modelDataUrl from "./yolox-nano.bin?url&inline";

/** astronaut-128.pgm (a face, no animal) and chelsea-160.ppm (a cat, no face): see their tests. */
let models: FocusModels;
let astronaut: RgbaImage;
let chelsea: RgbaImage;

async function bytesOf(dataUrl: string): Promise<Uint8Array> {
  return new Uint8Array(await (await fetch(dataUrl)).arrayBuffer());
}

// The binary headers are `P5\n128 128\n255\n` and `P6\n160 106\n255\n`.
function rgbaFrom(bytes: Uint8Array, width: number, height: number, channels: 1 | 3): RgbaImage {
  const header = new TextEncoder().encode(`P${channels === 1 ? 5 : 6}\n${width} ${height}\n255\n`);
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let pixel = 0; pixel < width * height; pixel++) {
    for (let channel = 0; channel < 3; channel++) {
      data[pixel * 4 + channel] = item(
        bytes,
        header.length + pixel * channels + (channels === 1 ? 0 : channel),
      );
    }
  }
  return { width, height, data };
}

beforeAll(async () => {
  models = {
    cascade: unpackCascade(new Int8Array((await bytesOf(cascadeDataUrl)).buffer)),
    animals: parseOnnx(await bytesOf(modelDataUrl)),
  };
  astronaut = rgbaFrom(await bytesOf(astronautPgmDataUrl), 128, 128, 1);
  chelsea = rgbaFrom(await bytesOf(chelseaPpmDataUrl), 160, 106, 3);
});

describe("detectFocus", () => {
  it("aims at the face of a portrait", () => {
    const focus = detectFocus(astronaut, models);

    if (focus.kind !== "subject") throw new Error("expected the face to be found");
    expect(focus.box.height).toBeLessThan(0.5);
  });

  it("aims at the animal of a picture without a face", () => {
    const focus = detectFocus(chelsea, models);

    if (focus.kind !== "subject") throw new Error("expected the cat to be found");
    expect(focus.box.height).toBeGreaterThan(0.5);
  });

  it("finds nothing in a blank picture", () => {
    const blank = { width: 160, height: 120, data: new Uint8ClampedArray(160 * 120 * 4).fill(128) };

    expect(detectFocus(blank, models)).toEqual({ kind: "none" });
  });
});
