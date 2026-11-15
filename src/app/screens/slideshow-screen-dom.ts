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

/**
 * The phone bar's actions, wider than the screen in one line, take a second line instead of
 * scrolling: the row never scrolls sideways and every action, Remove last, is inside the bar.
 */
export function expectActionsWrapInsideBar(bar: HTMLElement): void {
  const row = bar.querySelector<HTMLElement>(".actions");
  if (row === null) throw new Error("the bar has no action row");
  if (row.scrollWidth > row.clientWidth) throw new Error("the action row scrolls sideways");
  const actions = [...row.querySelectorAll<HTMLButtonElement>("button")];
  const lines = new Set(actions.map((action) => Math.round(action.getBoundingClientRect().top)));
  if (lines.size < 2) throw new Error("the actions do not wrap onto a second line");
  const barBox = bar.getBoundingClientRect();
  for (const action of actions) {
    const box = action.getBoundingClientRect();
    if (box.left < barBox.left || box.right > barBox.right || box.bottom > barBox.bottom) {
      throw new Error(`${action.innerText.trim()} is outside the bar`);
    }
  }
  if (actions.at(-1)?.innerText.trim() !== "Entfernen") throw new Error("Remove is not last");
}
