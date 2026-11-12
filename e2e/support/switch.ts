import { expect, type Locator, type Page } from "@playwright/test";

/** Taps a `Switch.svelte` switch on its label, with Playwright's stable and hit-target checks. */
export async function clickSwitch(switchInput: Locator): Promise<void> {
  await expect(switchInput).toBeEnabled();
  await switchInput.locator("xpath=ancestor::label[1]").click();
}

/** Turns the music editor's "Details" on (it opens with only the essentials) and waits for it. */
export async function showMusicDetails(page: Page): Promise<void> {
  const details = page.getByRole("switch", { name: "Details" });
  if (!(await details.isChecked())) {
    await clickSwitch(details);
  }
  await expect(details).toBeChecked();
}
