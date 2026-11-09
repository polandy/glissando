import { flushSync } from "svelte";
import { element } from "./picture-editor-harness";

export const section = (label: string) => element(`section[aria-labelledby="${label}"]`);
export const timingSection = () => section("timing-label");
export const lengthSlider = () => element(".slider");
export const transitionSection = () => element(".transition");
export const lengthInput = () => element<HTMLInputElement>('input[type="range"]');
/** The slider's value shown beside its sub-heading. */
export const lengthValue = () => element(".slider output").textContent;
/** Moves the slider's thumb to `seconds`, as a finger or a key does, without releasing it. */
export function dragLength(seconds: number): void {
  lengthInput().value = String(seconds);
  lengthInput().dispatchEvent(new Event("input", { bubbles: true }));
  flushSync();
}
/** Releases the thumb (or ends a key's step): the browser's `change`. */
export function releaseLength(): void {
  lengthInput().dispatchEvent(new Event("change", { bubbles: true }));
  flushSync();
}
/** The text as read, whitespace between elements collapsed. */
export const text = (within: Element) => within.textContent?.replace(/\s+/g, " ").trim() ?? "";
export const chip = (within: HTMLElement) => within.querySelector(".state")?.textContent?.trim();
export const tile = (choice: string) =>
  element<HTMLButtonElement>(`[role="radio"][data-choice="${choice}"]`);
export const resetIn = (within: HTMLElement) =>
  [...within.querySelectorAll("button")].find((candidate) =>
    candidate.textContent?.includes("Zurück auf automatisch"),
  ) as HTMLButtonElement;
