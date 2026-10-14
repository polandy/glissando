import type { Scheduler } from "../../ui-kit/scheduler";
import type { ScreenAwakePorts } from "../video-export/screen-awake";
import { CONTROLS_VISIBLE_MS } from "../../frame/tap-controls";
import { frameDeepLinkUrl } from "./frame-deep-link";

/** A `?controlsVisibleMs=` override's query parameter name (below). */
const CONTROLS_VISIBLE_MS_PARAM = "controlsVisibleMs";

/** What the running frame and its set-up screen need of the browser, beyond Immich and storage. */
export interface FrameDevice {
  readonly scheduler: Scheduler;
  /** How long the tap controls stay up after a tap; `CONTROLS_VISIBLE_MS` outside of e2e. */
  readonly controlsVisibleMs: number;
  /** Null where the browser offers none, e.g. over plain http. */
  readonly clipboard: { writeText(text: string): Promise<void> } | null;
  readonly screenAwake: ScreenAwakePorts;
  /** The link "Copy frame link" puts on the clipboard, for this album. */
  linkFor(albumId: string): string;
}

export function browserFrameDevice(
  window: Window,
  scheduler: Scheduler,
  screenAwake: ScreenAwakePorts,
): FrameDevice {
  const { navigator, location } = window;
  return {
    scheduler,
    controlsVisibleMs: controlsVisibleMsOverride(location.search) ?? CONTROLS_VISIBLE_MS,
    clipboard:
      "clipboard" in navigator
        ? { writeText: (text) => navigator.clipboard.writeText(text) }
        : null,
    screenAwake,
    linkFor: (albumId) => frameDeepLinkUrl(location.origin, location.pathname, albumId),
  };
}

/**
 * An e2e case's longer stand-in for `CONTROLS_VISIBLE_MS`, read once at startup like the
 * `#frame=` deep link (`frame-deep-link.ts`), so a multi-step spec can click through the tap
 * controls without racing their real auto-hide timer. Null for every normal visit.
 */
function controlsVisibleMsOverride(search: string): number | null {
  const value = new URLSearchParams(search).get(CONTROLS_VISIBLE_MS_PARAM);
  return value === null ? null : Number(value);
}
