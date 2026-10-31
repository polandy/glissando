import { describe, expect, it } from "vitest";
import { THUMBNAIL_BOUND } from "../../import/downscale";
import { browserMediaDecoders } from "./media-decoders";

/** A canvas filled with a flat colour, encoded as `type`; null where the browser cannot encode it. */
function canvasBlob(type: string, width: number, height: number): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("this browser offers no 2D canvas");
  }
  context.fillStyle = "#ff8800";
  context.fillRect(0, 0, width, height);
  return new Promise((resolve) => canvas.toBlob(resolve, type));
}

const WAV_HEADER_BYTES = 44;
const PCM_FORMAT = 1;
const BITS_PER_SAMPLE = 16;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;

/** A minimal one-channel PCM WAV: a RIFF/WAVE container holding `samples` silent frames. */
function tinyWav(sampleRate = 8000, samples = 16): Blob {
  const dataBytes = samples * BYTES_PER_SAMPLE;
  const buffer = new ArrayBuffer(WAV_HEADER_BYTES + dataBytes);
  const view = new DataView(buffer);
  const writeAscii = (offset: number, text: string): void => {
    for (let index = 0; index < text.length; index++) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };
  writeAscii(0, "RIFF");
  view.setUint32(4, WAV_HEADER_BYTES - 8 + dataBytes, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, PCM_FORMAT, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * BYTES_PER_SAMPLE, true);
  view.setUint16(32, BYTES_PER_SAMPLE, true);
  view.setUint16(34, BITS_PER_SAMPLE, true);
  writeAscii(36, "data");
  view.setUint32(40, dataBytes, true);
  return new Blob([buffer], { type: "audio/wav" });
}

describe("browserMediaDecoders", () => {
  // Nothing here should log, so a logged error fails the test.
  const decoders = browserMediaDecoders((error) => {
    throw error;
  });

  it.each(["image/png", "image/jpeg"])("accepts a canvas-generated %s picture", async (type) => {
    const blob = await canvasBlob(type, 5, 4);
    if (blob === null) {
      throw new Error(`this browser could not encode ${type}`);
    }
    expect(await decoders.picture(blob)).toEqual({ width: 5, height: 4 });
  });

  it("accepts a canvas-generated WebP picture, where the browser encodes one", async () => {
    const blob = await canvasBlob("image/webp", 5, 4);
    if (blob === null || blob.type !== "image/webp") {
      return;
    }
    expect(await decoders.picture(blob)).toEqual({ width: 5, height: 4 });
  });

  it("makes a JPEG thumbnail within the thumbnail bound, keeping the picture's aspect", async () => {
    const picture = await canvasBlob(
      "image/png",
      THUMBNAIL_BOUND.longEdge * 2,
      THUMBNAIL_BOUND.longEdge,
    );
    if (picture === null) {
      throw new Error("this browser could not encode image/png");
    }

    const thumbnail = await decoders.thumbnail(picture);

    expect(thumbnail.type).toBe("image/jpeg");
    expect(await decoders.picture(thumbnail)).toEqual({
      width: THUMBNAIL_BOUND.longEdge,
      height: THUMBNAIL_BOUND.longEdge / 2,
    });
  });

  it("refuses bytes that claim to be a JPEG but do not decode", async () => {
    const claimingJpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4])], {
      type: "image/jpeg",
    });

    expect(await decoders.picture(claimingJpeg)).toBeNull();
  });

  it("accepts a generated PCM WAV song", async () => {
    expect(await decoders.music(tinyWav())).toBe(true);
  });

  it("refuses a WAV that does not decode", async () => {
    const claimingWav = new Blob([new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0])], {
      type: "audio/wav",
    });

    expect(await decoders.music(claimingWav)).toBe(false);
  });

  it.each(["picture", "music"] as const)(
    "lets a failed read of a %s through instead of calling it undecodable",
    async (kind) => {
      const unreadable = new Blob(["bytes"]);
      const readError = new DOMException("the file went away", "NotReadableError");
      unreadable.arrayBuffer = () => Promise.reject(readError);

      await expect(decoders[kind](unreadable)).rejects.toBe(readError);
    },
  );
});
