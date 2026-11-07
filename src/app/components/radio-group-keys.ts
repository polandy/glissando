import { radioIndexForKey } from "./radio-keys";

/**
 * Svelte action for a `role="radiogroup"` of buttons: arrows, Home and End move to an enabled
 * radio, select it (by clicking it, as selection follows focus) and focus it. The group's own
 * radios carry the roving tabindex.
 */
export function radioGroupKeys(group: HTMLElement): { destroy: () => void } {
  function onkeydown(event: KeyboardEvent): void {
    const radios = [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)')];
    const current = radios.findIndex((radio) => radio === event.target);
    const next = current < 0 ? null : radioIndexForKey(event.key, current, radios.length);
    const radio = next === null ? undefined : radios[next];
    if (radio === undefined) {
      return;
    }
    event.preventDefault();
    radio.click();
    radio.focus();
  }

  group.addEventListener("keydown", onkeydown);
  return { destroy: () => group.removeEventListener("keydown", onkeydown) };
}
