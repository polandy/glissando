import type { KeyValueStorage } from "./start/first-launch";
import { createStorageMusicEditorDetailsStore } from "./music-editor/music-editor-details";
import { createStorageFineSettingsFoldStore } from "./screens/slideshow/fine-settings-fold";

/** The stores of folds and switches a screen remembers per device, over one `storage`. */
export function createDeviceSettingsStores(storage: KeyValueStorage) {
  return {
    fineSettingsFold: createStorageFineSettingsFoldStore(storage),
    musicEditorDetails: createStorageMusicEditorDetailsStore(storage),
  };
}
