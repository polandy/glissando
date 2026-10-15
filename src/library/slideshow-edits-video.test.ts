import { describe, expect, it } from "vitest";
import { InvalidVideoError, type StoredVideo } from "./own-video";
import { setVideoDuckMusic, setVideoExcerpt, setVideoVolume } from "./slideshow-edits-video";
import type { StoredSlideshow } from "./stored-slideshow";

const VIDEO: StoredVideo = { mediaId: "video-1", sourceMs: 60_000, startMs: 0, endMs: 10_000 };

function slideshow(video: StoredVideo = VIDEO): StoredSlideshow {
  const colours = { veil: "#404040", accent: "#C0C0C0" };
  return {
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
        colours,
        video,
      },
      {
        id: "still",
        capturedAt: "2025-07-01T11:00:00Z",
        width: 1,
        height: 1,
        fileName: "s.jpg",
        colours,
      },
    ],
    songs: [],
    secondsPerPicture: 5,
  };
}

const videoOf = (show: StoredSlideshow): StoredVideo | undefined => show.pictures[0]?.video;

describe("setVideoExcerpt", () => {
  it("moves the excerpt and keeps the rest of the video", () => {
    const edited = setVideoExcerpt(slideshow({ ...VIDEO, volume: 50 }), "clip", 2000, 9000);

    expect(videoOf(edited)).toEqual({ ...VIDEO, startMs: 2000, endMs: 9000, volume: 50 });
  });

  it("fails loud with the field and value for an excerpt past the clip", () => {
    const bad = (): unknown => setVideoExcerpt(slideshow(), "clip", 0, 60_001);

    expect(bad).toThrow(InvalidVideoError);
    expect(bad).toThrow('picture "clip" endMs');
  });

  it("refuses a picture without a video and an unknown picture", () => {
    expect(() => setVideoExcerpt(slideshow(), "still", 0, 5000)).toThrow('picture "still"');
    expect(() => setVideoExcerpt(slideshow(), "nope", 0, 5000)).toThrow('picture "nope"');
  });
});

describe("setVideoVolume", () => {
  it("sets the volume, 0 being sound off", () => {
    expect(videoOf(setVideoVolume(slideshow(), "clip", 0))?.volume).toBe(0);
    expect(videoOf(setVideoVolume(slideshow(), "clip", 75))?.volume).toBe(75);
  });

  it("deletes the field for undefined, making it full volume again", () => {
    const edited = setVideoVolume(slideshow({ ...VIDEO, volume: 50 }), "clip", undefined);

    expect(videoOf(edited)).toEqual(VIDEO);
    expect(videoOf(edited)).not.toHaveProperty("volume");
  });

  it("fails loud for a volume off the step", () => {
    expect(() => setVideoVolume(slideshow(), "clip", 52)).toThrow(InvalidVideoError);
  });
});

describe("setVideoDuckMusic", () => {
  it("stores false to let the music keep its volume", () => {
    expect(videoOf(setVideoDuckMusic(slideshow(), "clip", false))?.duckMusic).toBe(false);
  });

  it("deletes the field for true: ducking is the default", () => {
    const edited = setVideoDuckMusic(slideshow({ ...VIDEO, duckMusic: false }), "clip", true);

    expect(videoOf(edited)).toEqual(VIDEO);
    expect(videoOf(edited)).not.toHaveProperty("duckMusic");
  });
});
