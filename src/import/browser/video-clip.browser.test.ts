import { describe, expect, it } from "vitest";
import { openClipInVideoElement } from "./video-clip";
// 1 s of ffmpeg's test pattern with 2.5 s of a 440 Hz tone (VP8 + Opus):
// ffmpeg -f lavfi -i testsrc=size=64x48:rate=10:duration=1 -f lavfi -i sine=frequency=440:duration=2.5
//   -c:v libvpx -b:v 50k -c:a libopus -b:a 16k -map_metadata -1 -bitexact audio-outlasts-picture.webm
import audioOutlastsPictureUrl from "../testing/video/audio-outlasts-picture.webm?url";

const PICTURE_END_MS = 1000;
/** Container durations round to the track's last frame; one frame at 10 fps is 100 ms. */
const FRAME_MS = 100;
/** A channel above this is a drawn picture, not the black a transparent canvas encodes to. */
const BLACK_CHANNEL_CEILING = 16;

async function fixture(url: string, name: string): Promise<File> {
  const blob = await (await fetch(url)).blob();
  return new File([blob], name, { type: "video/webm" });
}

/** The brightest channel value of an image, alpha left out. */
async function brightestChannel(image: Blob): Promise<number> {
  const bitmap = await createImageBitmap(image);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("no 2D context to read the poster's pixels with");
  context.drawImage(bitmap, 0, 0);
  const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
  return Math.max(...data.filter((_, index) => index % 4 !== 3));
}

describe("openClipInVideoElement", () => {
  it("measures a clip whose sound outlasts its picture by its picture's end", async () => {
    const file = await fixture(audioOutlastsPictureUrl, "audio-outlasts-picture.webm");
    const logged: unknown[] = [];

    const clip = await openClipInVideoElement(file, (error) => logged.push(error));

    expect(clip).not.toBeNull();
    expect(clip?.durationMs).toBeGreaterThan(PICTURE_END_MS - FRAME_MS);
    expect(clip?.durationMs).toBeLessThanOrEqual(PICTURE_END_MS);
    expect(logged).toEqual([]);
    clip?.close();
  });

  it("makes the poster at 0 ms the clip's first picture, not a black canvas", async () => {
    const file = await fixture(audioOutlastsPictureUrl, "audio-outlasts-picture.webm");
    const clip = await openClipInVideoElement(file, () => undefined);
    if (clip === null) throw new Error("the fixture did not open");

    const poster = await clip.posterFrame(0);

    expect(poster.size).toBeGreaterThan(0);
    expect(await brightestChannel(poster)).toBeGreaterThan(BLACK_CHANNEL_CEILING);
    clip.close();
  });
});
