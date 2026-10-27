import type { KeyValueStorage } from "../../start/first-launch";
import { createStoredChoice, type StoredChoice } from "../../settings/stored-choice";

const FINE_SETTINGS_FOLD_CHOICES = ["open", "closed"] as const;
export type FineSettingsFold = (typeof FINE_SETTINGS_FOLD_CHOICES)[number];
export type FineSettingsFoldStore = StoredChoice<FineSettingsFold>;

const FINE_SETTINGS_FOLD_KEY = "glissando.fineSettingsFold";

/** Whether the info panel's "Fine settings" fold is open, remembered per device for every
 * slideshow (ADR-0048). Starts closed. */
export function createStorageFineSettingsFoldStore(
  storage: KeyValueStorage,
): FineSettingsFoldStore {
  return createStoredChoice(storage, FINE_SETTINGS_FOLD_KEY, FINE_SETTINGS_FOLD_CHOICES, "closed");
}
