import { flushSync } from "svelte";
import type { ControlsVisibility } from "../../ui-kit/controls-visibility";

const FOCUSABLE = "button:not(:disabled), input:not(:disabled)";

/**
 * Handlers that show the player's controls on a mouse move or Tab, and hold them while keyboard
 * focus (`:focus-visible`, not a mouse click on a button) is inside the player.
 */
export function playerRevealHandlers(controls: ControlsVisibility, root: () => HTMLElement) {
  // Hidden controls are inert, and the page behind would take a Tab from outside: show the
  // controls and put focus on their first (Shift+Tab: last) one.
  const onTab = (event: KeyboardEvent): void => {
    if (event.key !== "Tab") {
      return;
    }
    controls.reveal();
    if (root().contains(document.activeElement)) {
      return;
    }
    flushSync();
    const focusable = root().querySelectorAll<HTMLElement>(FOCUSABLE);
    const target = event.shiftKey ? focusable[focusable.length - 1] : focusable[0];
    if (target !== undefined) {
      event.preventDefault();
      target.focus();
    }
  };
  const handlers = {
    onpointermove: () => controls.reveal(),
    onfocusin: (event: FocusEvent) => {
      controls.hold(event.target instanceof Element && event.target.matches(":focus-visible"));
    },
    onfocusout: (event: FocusEvent) => {
      if (!(event.relatedTarget instanceof Node && root().contains(event.relatedTarget))) {
        controls.hold(false);
      }
    },
  };
  return { handlers, onTab };
}
