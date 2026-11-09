import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Clicks a `Switch.svelte` switch: its input is drawn over by the visible track (pointer-events
 * none, Switch.svelte), so the click is forced onto the input's spot and lands on the track inside
 * the wrapping `<label>`, same as a tap on it. Forcing skips the enabled check, so it runs first.
 */
export async function clickSwitch(switchInput: Locator): Promise<void> {
  await expect(switchInput).toBeEnabled();
  await switchInput.click({ force: true });
}

/** Turns the music editor's "Details" on (it opens with only the essentials) and waits for it. */
export async function showMusicDetails(page: Page): Promise<void> {
  const details = page.getByRole("switch", { name: "Details" });
  if (!(await details.isChecked())) {
    await clickSwitch(details);
  }
  await expect(details).toBeChecked();
}
