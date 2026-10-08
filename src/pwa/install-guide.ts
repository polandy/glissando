/** Which hand-written install steps a browser without an install prompt gets. */
export type InstallGuide = "ios" | "mac-safari" | "firefox-android" | "firefox-desktop";

export interface BrowserIdentity {
  readonly userAgent: string;
  readonly maxTouchPoints: number;
}

const IOS_DEVICE = /iPhone|iPad|iPod/;
const MAC = /Macintosh/;
const ANDROID = /Android/;
const FIREFOX = /Firefox\//;
const SAFARI = /Version\/(\d+)[\d.]*.*Safari\//;
/** "Add to Dock…" exists from Safari 17 on. */
const FIRST_MAC_SAFARI_WITH_DOCK = 17;
const OTHER_BROWSER_ON_WEBKIT = /Chrome\/|Chromium\/|Edg\/|OPR\//;
// iPadOS presents itself as a Mac; only its touch screen tells it apart.
const IPAD_MIN_TOUCH_POINTS = 2;

/** Every iOS browser installs through Safari's share sheet, so they share one guide. */
export function installGuideFor({
  userAgent,
  maxTouchPoints,
}: BrowserIdentity): InstallGuide | null {
  const mac = MAC.test(userAgent);
  if (IOS_DEVICE.test(userAgent) || (mac && maxTouchPoints >= IPAD_MIN_TOUCH_POINTS)) {
    return "ios";
  }
  if (FIREFOX.test(userAgent)) {
    return ANDROID.test(userAgent) ? "firefox-android" : "firefox-desktop";
  }
  const safariMajor = SAFARI.exec(userAgent)?.[1];
  if (
    mac &&
    safariMajor !== undefined &&
    Number(safariMajor) >= FIRST_MAC_SAFARI_WITH_DOCK &&
    !OTHER_BROWSER_ON_WEBKIT.test(userAgent)
  ) {
    return "mac-safari";
  }
  return null;
}
