import type { Scheduler } from "../../ui-kit/scheduler";
import { browserScreenAwakePorts } from "../video-export/screen-awake";
import { browserFrameDevice, type FrameDevice } from "./browser-frame-device";
import { createStorageFrameCardPreference, FrameCardPreference } from "./frame-card-preference";
import { createStorageFramePreferences, FramePreferences } from "./frame-preferences";

export interface FrameServices {
  readonly framePreferences: FramePreferences;
  readonly frameCardPreference: FrameCardPreference;
  readonly frameDevice: FrameDevice;
}

/** Builds the picture frame's composition-root services (`dev-docs/app/FRAME.md`). */
export function createFrameServices(
  window: Window,
  scheduler: Scheduler,
  log: (error: unknown) => void,
): FrameServices {
  return {
    framePreferences: new FramePreferences(createStorageFramePreferences(window.localStorage)),
    frameCardPreference: new FrameCardPreference(
      createStorageFrameCardPreference(window.localStorage),
    ),
    frameDevice: browserFrameDevice(
      window,
      scheduler,
      browserScreenAwakePorts(window.document, window.navigator, log),
    ),
  };
}
