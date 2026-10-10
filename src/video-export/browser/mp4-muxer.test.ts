import { describe, expect, it } from "vitest";
import { createMp4Muxer } from "./mp4-muxer";

/** A file's writable that records how it ended. */
function recordingWritable(): { readonly writable: WritableStream; ended(): string } {
  let end = "open";
  const writable = new WritableStream({
    close: () => {
      end = "closed";
    },
    abort: () => {
      end = "aborted";
    },
  });
  return { writable, ended: () => end };
}

const MAX_PACKETS = { video: 10, audio: 0 };

describe("createMp4Muxer", () => {
  it("aborts the file's writable on cancel, so a picked file commits nothing", async () => {
    const file = recordingWritable();
    const muxer = await createMp4Muxer({
      writable: file.writable,
      audioCodec: null,
      maxPackets: MAX_PACKETS,
    });

    await muxer.port.cancel();

    expect(file.ended()).toBe("aborted");
  });
});
