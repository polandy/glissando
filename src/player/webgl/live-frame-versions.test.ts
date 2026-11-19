import { describe, expect, it } from "vitest";
import { LiveFrameVersions, type VideoPictureState } from "./live-frame-versions";

const HAVE_ENOUGH_DATA = 4;

/** A `<video>` whose presented frames the test hands out itself. */
function fakeVideo(state: Partial<VideoPictureState> = {}) {
  const callbacks: (() => void)[] = [];
  const video = {
    paused: false,
    currentTime: 1,
    seeking: false,
    readyState: HAVE_ENOUGH_DATA,
    requestVideoFrameCallback: (callback: () => void) => callbacks.push(callback),
    ...state,
  };
  const present = () => callbacks.splice(0).forEach((callback) => callback());
  return { video, present };
}

/** A `<video>` in a browser without `requestVideoFrameCallback`. */
function videoWithoutFrameReports(state: Partial<VideoPictureState> = {}) {
  return { paused: false, currentTime: 1, seeking: false, readyState: HAVE_ENOUGH_DATA, ...state };
}

describe("LiveFrameVersions", () => {
  it("tells nothing of a source that is no video, so it is uploaded every frame", () => {
    const versions = new LiveFrameVersions();
    expect(versions.versionOf(new Uint8ClampedArray(4) as unknown as TexImageSource)).toBeNull();
  });

  it("keeps a playing clip's version until it presents a new frame", () => {
    const versions = new LiveFrameVersions();
    const { video, present } = fakeVideo();
    versions.versionOf(video);
    present();
    const shown = versions.versionOf(video);

    video.currentTime += 0.016;
    expect(versions.versionOf(video)).toBe(shown);

    present();
    expect(versions.versionOf(video)).not.toBe(shown);
  });

  it("tells nothing of a playing clip before it presented a frame", () => {
    const versions = new LiveFrameVersions();
    const { video } = fakeVideo();
    expect(versions.versionOf(video)).toBeNull();
  });

  it("tells nothing of a playing clip in a browser that reports no presented frames", () => {
    const versions = new LiveFrameVersions();
    const video = videoWithoutFrameReports();
    expect(versions.versionOf(video)).toBeNull();
  });

  it("keeps a paused clip's version until it seeks and again once the seek lands", () => {
    const versions = new LiveFrameVersions();
    const video = videoWithoutFrameReports({ paused: true });
    const shown = versions.versionOf(video);
    expect(versions.versionOf(video)).toBe(shown);

    video.currentTime = 2;
    video.seeking = true;
    const seeking = versions.versionOf(video);
    expect(seeking).not.toBe(shown);

    video.seeking = false;
    expect(versions.versionOf(video)).not.toBe(seeking);
  });
});
