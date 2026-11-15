import { describe, expect, it } from "vitest";
import { server } from "vitest/browser";
import { loadClipMetadata } from "./clip-metadata";
import { decodedFrameAt, seekedFrameAt } from "./clip-poster";
import { isBlack } from "../testing/black-frame";
// 1 s of ffmpeg's test pattern at 64×48 with a longer tone; see video-clip.browser.test.ts.
import testPatternUrl from "../testing/video/audio-outlasts-picture.webm?url";

const PATTERN_WIDTH = 64;
const PATTERN_HEIGHT = 48;

async function testPattern(): Promise<File> {
  const blob = await (await fetch(testPatternUrl)).blob();
  return new File([blob], "test-pattern.webm", { type: "video/webm" });
}

describe("decodedFrameAt", () => {
  it("decodes the first frame at 0 ms at the picture's size", async () => {
    const logged: unknown[] = [];

    const frame = await decodedFrameAt(await testPattern(), 0, (error) => logged.push(error));

    expect(logged).toEqual([]);
    expect(frame).toMatchObject({ width: PATTERN_WIDTH, height: PATTERN_HEIGHT });
    if (frame === null) throw new Error("no frame decoded");
    expect(isBlack(frame.source, frame.width, frame.height)).toBe(false);
  });

  it("gives null and logs why for a file that is no container it reads", async () => {
    const logged: unknown[] = [];
    const notAVideo = new File([new Uint8Array([1, 2, 3, 4])], "not-a-video.webm");

    const frame = await decodedFrameAt(notAVideo, 0, (error) => logged.push(error));

    expect(logged).toHaveLength(1);
    expect(frame).toBeNull();
  });
});

describe("seekedFrameAt", () => {
  // WebKit-GTK paints a <video> into a canvas black however long it is waited for.
  it.skipIf(server.browser === "webkit")(
    "draws a painted frame from an element that has only loaded its metadata",
    async () => {
      const url = URL.createObjectURL(await testPattern());
      const video = document.createElement("video");
      video.muted = true;
      await loadClipMetadata(video, url);

      const frame = await seekedFrameAt(video, 0);

      expect(frame).toMatchObject({ width: PATTERN_WIDTH, height: PATTERN_HEIGHT });
      expect(isBlack(frame.source, frame.width, frame.height)).toBe(false);
      URL.revokeObjectURL(url);
    },
  );
});
