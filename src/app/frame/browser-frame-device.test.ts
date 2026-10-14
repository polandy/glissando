import { describe, expect, it } from "vitest";
import { browserFrameDevice } from "./browser-frame-device";
import { CONTROLS_VISIBLE_MS } from "../../frame/tap-controls";
import type { ScreenAwakePorts } from "../video-export/screen-awake";

const noopScheduler = { after: () => () => {} };
const noopScreenAwake: ScreenAwakePorts = {
  request: () => Promise.reject(new Error("not used in this test")),
  isVisible: () => true,
  onVisibilityChange: () => () => {},
  log: () => {},
};

function fakeWindow(options: { hasClipboard: boolean; search?: string }): Window {
  return {
    navigator: options.hasClipboard
      ? { clipboard: { writeText: (text: string) => Promise.resolve(text).then(() => undefined) } }
      : {},
    location: {
      origin: "https://frame.example",
      pathname: "/app/",
      search: options.search ?? "",
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

  it("keeps the tap controls' default visible time outside of e2e", () => {
    const device = browserFrameDevice(
      fakeWindow({ hasClipboard: true }),
      noopScheduler,
      noopScreenAwake,
    );

    expect(device.controlsVisibleMs).toBe(CONTROLS_VISIBLE_MS);
  });

  it("reads a longer visible time from ?controlsVisibleMs, for an e2e case to click through", () => {
    const device = browserFrameDevice(
      fakeWindow({ hasClipboard: true, search: "?controlsVisibleMs=60000" }),
      noopScheduler,
      noopScreenAwake,
    );

    expect(device.controlsVisibleMs).toBe(60_000);
  });

  it.each(["abc", "", "-5", "0", "1.5"])("refuses ?controlsVisibleMs=%s by name", (value) => {
    const window = fakeWindow({ hasClipboard: true, search: `?controlsVisibleMs=${value}` });

    expect(() => browserFrameDevice(window, noopScheduler, noopScreenAwake)).toThrow(
      /controlsVisibleMs/,
    );
  });
});
