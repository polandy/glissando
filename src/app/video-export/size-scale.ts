import type { PresetId } from "../../video-export";
import type { MessageKey } from "../i18n/messages";

/** The shared Small / Standard / Large names, one scale in every export sheet. */
export const PRESET_NAME_KEY: Readonly<Record<PresetId, MessageKey>> = {
  "720p": "sizeScale.small",
  "1080p": "sizeScale.standard",
  "4k": "sizeScale.large",
};
