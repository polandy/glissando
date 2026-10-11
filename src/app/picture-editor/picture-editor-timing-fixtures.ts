import { element } from "./picture-editor-harness";

export const section = (label: string) => element(`section[aria-labelledby="${label}"]`);
export const durationSection = () => section("duration-label");
export const transitionSection = () => section("transition-label");
/** The text as read, whitespace between elements collapsed. */
export const text = (within: Element) => within.textContent?.replace(/\s+/g, " ").trim() ?? "";
export const chip = (within: HTMLElement) => within.querySelector(".state")?.textContent?.trim();
export const tile = (choice: string) =>
  element<HTMLButtonElement>(`[role="radio"][data-choice="${choice}"]`);
export const resetIn = (within: HTMLElement) =>
  [...within.querySelectorAll("button")].find((candidate) =>
    candidate.textContent?.includes("Zurück auf automatisch"),
  ) as HTMLButtonElement;
