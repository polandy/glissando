/** Generic DOM lookups and input simulation shared by the `SlideshowScreen` browser tests. */
import { flushSync } from "svelte";

export function byLabel<T extends HTMLElement = HTMLButtonElement>(label: string): T {
  const found = document.querySelector<T>(`[aria-label="${label}"]`);
  if (found === null) {
    throw new Error(`nothing labelled "${label}"`);
  }
  return found;
}

/** By its rendered text: a bar action holds a short and a long label, one of them hidden. */
export function buttonNamed(name: string): HTMLButtonElement {
  const found = [...document.querySelectorAll("button")].find(
    (button) => button.innerText.trim() === name,
  );
  if (found === undefined) {
    throw new Error(`no button named "${name}"`);
  }
  return found;
}

/** A tile's button, named by its picture's description. */
export function tile(number: number, date: string): HTMLButtonElement {
  const picture = document.querySelector(`img[alt="Bild ${number}, aufgenommen am ${date}"]`);
  const button = picture?.closest("button");
  if (button === null || button === undefined) {
    throw new Error(`no tile for picture ${number}`);
  }
  return button;
}
/** The selection bar, by its toolbar name: it holds one picture or several. */
export const selectionBar = () => document.querySelector('[role="toolbar"][aria-label="Auswahl"]');

export function press(target: HTMLElement, key: string, shiftKey = false): void {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey, bubbles: true }));
  flushSync();
}

export function click(
  target: HTMLElement,
  modifiers: { ctrlKey?: boolean; shiftKey?: boolean } = {},
): void {
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ...modifiers }));
  flushSync();
}

/** A tile's drag, by mouse or touch (ADR-0019): `pointerdown` bubbles from its `.pick` button. */
export function firePointer(
  target: EventTarget,
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
  { x = 0, y = 0, pointerType = "mouse" as "mouse" | "touch" } = {},
): void {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      pointerType,
    }),
  );
  flushSync();
}
