import { describe, expect, it } from "vitest";
import { browserFrameDevice } from "./browser-frame-device";
import type { ScreenAwakePorts } from "../video-export/screen-awake";

const noopScheduler = { after: () => () => {} };
const noopScreenAwake: ScreenAwakePorts = {
  request: () => Promise.reject(new Error("not used in this test")),
  isVisible: () => true,
  onVisibilityChange: () => () => {},
  log: () => {},
};

function fakeWindow(options: { hasClipboard: boolean }): Window {
  return {
    navigator: options.hasClipboard
      ? { clipboard: { writeText: (text: string) => Promise.resolve(text).then(() => undefined) } }
      : {},
    location: {
      origin: "https://frame.example",
      pathname: "/app/",
    },
  } as unknown as Window;
}

describe("browserFrameDevice", () => {
  it("builds a frame link from the window's own origin and path", () => {
    const device = browserFrameDevice(
      fakeWindow({ hasClipboard: true }),
      noopScheduler,
      noopScreenAwake,
    );

    expect(device.linkFor("album-1")).toBe("https://frame.example/app/#frame=album-1");
  });

  it("exposes a clipboard port when the browser has the Clipboard API", () => {
    const device = browserFrameDevice(
      fakeWindow({ hasClipboard: true }),
      noopScheduler,
      noopScreenAwake,
    );

    expect(device.clipboard).not.toBeNull();
  });

  it("has no clipboard port when the browser lacks the Clipboard API", () => {
    const device = browserFrameDevice(
      fakeWindow({ hasClipboard: false }),
      noopScheduler,
      noopScreenAwake,
    );

    expect(device.clipboard).toBeNull();
  });

  it("passes the scheduler and screen-awake ports through unchanged", () => {
    const device = browserFrameDevice(
      fakeWindow({ hasClipboard: true }),
      noopScheduler,
      noopScreenAwake,
    );

    expect(device.scheduler).toBe(noopScheduler);
    expect(device.screenAwake).toBe(noopScreenAwake);
  });
});
