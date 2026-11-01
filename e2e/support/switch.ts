import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Clicks a `Switch.svelte` switch: its input is drawn over by the visible track (pointer-events
 * none, Switch.svelte), so the click goes to the `<label>` wrapping both, same as a tap on it.
 */
export function clickSwitch(switchInput: Locator): Promise<void> {
  return switchInput.locator("xpath=..").click();
}

/** Turns the music editor's "Details" on (it opens with only the essentials) and waits for it. */
export async function showMusicDetails(page: Page): Promise<void> {
  const details = page.getByRole("switch", { name: "Details" });
  if (!(await details.isChecked())) {
    await clickSwitch(details);
  }
  await expect(details).toBeChecked();
}
