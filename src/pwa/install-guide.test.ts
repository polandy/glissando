import { describe, expect, it } from "vitest";
import { installGuideFor, type InstallGuide } from "./install-guide";

const NO_TOUCH = 0;
const IPAD_TOUCH_POINTS = 5;

const cases: readonly {
  readonly browser: string;
  readonly userAgent: string;
  readonly maxTouchPoints: number;
  readonly guide: InstallGuide | null;
}[] = [
  {
    browser: "Safari on the iPhone",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    maxTouchPoints: IPAD_TOUCH_POINTS,
    guide: "ios",
  },
  {
    browser: "Chrome on the iPhone",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.7204.119 Mobile/15E148 Safari/604.1",
    maxTouchPoints: IPAD_TOUCH_POINTS,
    guide: "ios",
  },
  {
    browser: "Firefox on the iPhone",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/141.0 Mobile/15E148 Safari/605.1.15",
    maxTouchPoints: IPAD_TOUCH_POINTS,
    guide: "ios",
  },
  {
    browser: "Safari on an iPad reporting an iPad",
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 17_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.7 Mobile/15E148 Safari/604.1",
    maxTouchPoints: IPAD_TOUCH_POINTS,
    guide: "ios",
  },
  {
    browser: "Safari on an iPad reporting a Mac (iPadOS desktop mode)",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15",
    maxTouchPoints: IPAD_TOUCH_POINTS,
    guide: "ios",
  },
  {
    browser: "Safari on the Mac",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15",
    maxTouchPoints: NO_TOUCH,
    guide: "mac-safari",
  },
  {
    browser: "Chrome on the Mac",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    maxTouchPoints: NO_TOUCH,
    guide: null,
  },
  {
    browser: "Edge on the Mac",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0",
    maxTouchPoints: NO_TOUCH,
    guide: null,
  },
  {
    browser: "Firefox on the Mac",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0",
    maxTouchPoints: NO_TOUCH,
    guide: "firefox-desktop",
  },
  {
    browser: "Firefox on Windows",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0",
    maxTouchPoints: NO_TOUCH,
    guide: "firefox-desktop",
  },
  {
    browser: "Firefox on Linux",
    userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0",
    maxTouchPoints: NO_TOUCH,
    guide: "firefox-desktop",
  },
  {
    browser: "Firefox on an Android phone",
    userAgent: "Mozilla/5.0 (Android 15; Mobile; rv:141.0) Gecko/141.0 Firefox/141.0",
    maxTouchPoints: IPAD_TOUCH_POINTS,
    guide: "firefox-android",
  },
  {
    browser: "Firefox on an Android tablet",
    userAgent: "Mozilla/5.0 (Android 15; Tablet; rv:141.0) Gecko/141.0 Firefox/141.0",
    maxTouchPoints: IPAD_TOUCH_POINTS,
    guide: "firefox-android",
  },
  {
    browser: "Chrome on Android",
    userAgent:
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
    maxTouchPoints: IPAD_TOUCH_POINTS,
    guide: null,
  },
  {
    browser: "Samsung Internet",
    userAgent:
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36",
    maxTouchPoints: IPAD_TOUCH_POINTS,
    guide: null,
  },
  {
    browser: "Chrome on Windows",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    maxTouchPoints: NO_TOUCH,
    guide: null,
  },
];

describe("installGuideFor", () => {
  it.each(cases)("$browser gets the guide $guide", ({ userAgent, maxTouchPoints, guide }) => {
    expect(installGuideFor({ userAgent, maxTouchPoints })).toBe(guide);
  });
});
