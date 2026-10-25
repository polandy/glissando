import type { Scheduler } from "../../ui-kit/scheduler";
import type { ScreenAwakePorts } from "../video-export/screen-awake";
import { CONTROLS_VISIBLE_MS } from "../../frame/tap-controls";
import { frameDeepLinkUrl } from "./frame-deep-link";

/** What the running frame and its set-up screen need of the browser, beyond Immich and storage. */
export interface FrameDevice {
  readonly scheduler: Scheduler;
  /** How long the tap controls stay up after a tap. */
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
    controlsVisibleMs: CONTROLS_VISIBLE_MS,
    clipboard:
      "clipboard" in navigator
        ? { writeText: (text) => navigator.clipboard.writeText(text) }
        : null,
    screenAwake,
    linkFor: (albumId) => frameDeepLinkUrl(location.origin, location.pathname, albumId),
  };
}
