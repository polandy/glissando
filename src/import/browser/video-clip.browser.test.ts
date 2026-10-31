import { describe, expect, it } from "vitest";
import { openClipInVideoElement } from "./video-clip";
// 1 s of ffmpeg's test pattern with 2.5 s of a 440 Hz tone (VP8 + Opus):
// ffmpeg -f lavfi -i testsrc=size=64x48:rate=10:duration=1 -f lavfi -i sine=frequency=440:duration=2.5
//   -c:v libvpx -b:v 50k -c:a libopus -b:a 16k -map_metadata -1 -bitexact audio-outlasts-picture.webm
import audioOutlastsPictureUrl from "../testing/video/audio-outlasts-picture.webm?url";

const PICTURE_END_MS = 1000;
/** Container durations round to the track's last frame; one frame at 10 fps is 100 ms. */
const FRAME_MS = 100;

async function fixture(url: string, name: string): Promise<File> {
  const blob = await (await fetch(url)).blob();
  return new File([blob], name, { type: "video/webm" });
}

describe("openClipInVideoElement", () => {
  it("measures a clip whose sound outlasts its picture by its picture's end", async () => {
    const file = await fixture(audioOutlastsPictureUrl, "audio-outlasts-picture.webm");

    const clip = await openClipInVideoElement(file);

    expect(clip).not.toBeNull();
    expect(clip?.durationMs).toBeGreaterThan(PICTURE_END_MS - FRAME_MS);
    expect(clip?.durationMs).toBeLessThanOrEqual(PICTURE_END_MS);
    clip?.close();
  });
});
