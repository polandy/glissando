import { vi } from "vitest";

/** The sheet's button with exactly this label, once it is there. */
export async function buttonLabelled(root: HTMLElement, label: string): Promise<HTMLButtonElement> {
  return vi.waitFor(() => {
    const found = [...root.querySelectorAll("button")].find(
      (candidate) => candidate.textContent?.trim() === label,
    );
    if (found === undefined) throw new Error(`no button "${label}" in the sheet`);
    return found;
  });
}

/** Resolves once the sheet's text contains `text`. */
export async function sheetShows(root: HTMLElement, text: string): Promise<void> {
  await vi.waitFor(() => {
    if (!(root.textContent ?? "").includes(text)) throw new Error(`the sheet lacks "${text}"`);
  });
}

export function sizeChoiceIsShown(root: HTMLElement): boolean {
  return root.querySelector('[role="radiogroup"]') !== null;
}
