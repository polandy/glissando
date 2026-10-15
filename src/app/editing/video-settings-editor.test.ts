import { describe, expect, it } from "vitest";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { VideoSettingsEditor } from "./video-settings-editor";

const START: StoredSlideshow = {
  id: "show",
  title: "July 2025",
  createdAt: "2025-07-02T00:00:00Z",
  pictures: [
    {
      id: "clip",
      capturedAt: "2025-07-01T10:00:00Z",
      width: 1,
      height: 1,
      fileName: "c.mp4",
      colours: { veil: "#404040", accent: "#C0C0C0" },
      video: { mediaId: "video-1", sourceMs: 60_000, startMs: 0, endMs: 10_000 },
    },
  ],
  songs: [],
  secondsPerPicture: 5,
};

function setUp() {
  let current = START;
  const editor = new VideoSettingsEditor(
    () => current,
    (next) => void (current = next),
  );
  return { editor, video: () => current.pictures[0]?.video };
}

describe("VideoSettingsEditor", () => {
  it("applies the excerpt, the volume and the ducking one after the other", () => {
    const { editor, video } = setUp();

    editor.setExcerpt("clip", 2000, 9000);
    editor.setVolume("clip", 40);
    editor.setDuckMusic("clip", false);

    expect(video()).toEqual({
      mediaId: "video-1",
      sourceMs: 60_000,
      startMs: 2000,
      endMs: 9000,
      volume: 40,
      duckMusic: false,
    });
  });

  it("resets the clip to what import made", () => {
    const { editor, video } = setUp();
    editor.setExcerpt("clip", 2000, 9000);
    editor.setVolume("clip", 0);

    editor.reset("clip");

    expect(video()).toEqual({ mediaId: "video-1", sourceMs: 60_000, startMs: 0, endMs: 60_000 });
  });

  it("refuses an invalid excerpt loudly and leaves the clip as it was", () => {
    const { editor, video } = setUp();

    expect(() => editor.setExcerpt("clip", 2000, 2100)).toThrow(/endMs/);
    expect(video()?.startMs).toBe(0);
  });
});
