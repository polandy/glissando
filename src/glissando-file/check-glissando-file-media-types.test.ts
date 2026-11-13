import { describe, expect, it } from "vitest";
import { checkGlissandoFile } from "./check-glissando-file";
import { fakeMediaDecoders } from "./testing/fake-media-decoders";
import { exportedFile, exportedVideoFile } from "./testing/glissando-fixtures";

/**
 * The decoders see each medium as the type its manifest names, the type the medium is stored and
 * played with: a media element in WebKit plays a blob by its type.
 */
describe("checkGlissandoFile media types", () => {
  it("hands each clip to the decoder as a blob of the type its manifest names", async () => {
    const mediaDecoders = fakeMediaDecoders();

    const check = await checkGlissandoFile(await exportedVideoFile(), {
      freeBytes: () => Promise.resolve(null),
      mediaDecoders,
    });

    expect(check.kind).toBe("ok");
    expect(mediaDecoders.clipCalls.map((clip) => clip.type)).toEqual(["video/mp4", "video/webm"]);
  });

  it("hands a song and a picture to the decoders typed as their manifest names them", async () => {
    const mediaDecoders = fakeMediaDecoders();

    const check = await checkGlissandoFile(await exportedFile(), {
      freeBytes: () => Promise.resolve(null),
      mediaDecoders,
    });

    expect(check.kind).toBe("ok");
    expect(mediaDecoders.musicCalls.map((song) => song.type)).toEqual(["audio/mp4"]);
    expect(new Set(mediaDecoders.pictureCalls.map((picture) => picture.type))).toEqual(
      new Set(["image/png"]),
    );
  });
});
