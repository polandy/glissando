import type { ControlsVisibility } from "../../ui-kit/controls-visibility";

/**
 * Handlers that show the player's controls on a mouse move or Tab, and hold them while keyboard
 * focus (`:focus-visible`, not a mouse click on a button) is inside the player.
 */
export function playerRevealHandlers(controls: ControlsVisibility, root: () => HTMLElement) {
  return {
    onpointermove: () => controls.reveal(),
    // Hidden controls are inert; showing them before the Tab's default action lets it land on one.
    onkeydowncapture: (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        controls.reveal();
      }
    },
    onfocusin: (event: FocusEvent) => {
      controls.hold(event.target instanceof Element && event.target.matches(":focus-visible"));
    },
    onfocusout: (event: FocusEvent) => {
      if (!(event.relatedTarget instanceof Node && root().contains(event.relatedTarget))) {
        controls.hold(false);
      }
    },
  };
}
