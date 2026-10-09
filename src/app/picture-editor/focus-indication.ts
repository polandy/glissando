import type { FocusBox } from "../../library/picture-focus";
import type { PictureFocusStatus } from "../focus/pictures-focus";

/** Where the marker's "Focus" chip sits, so it stays on the picture. */
export interface ChipPlacement {
  readonly below: boolean;
  readonly alignRight: boolean;
}

/**
 * What the picture editor shows of the focus its automatic motion aims at: a marker on the
 * subject box, a quiet note that there is none or that it is being searched for, or nothing.
 */
export type FocusIndication =
  | { readonly kind: "marker"; readonly box: FocusBox; readonly chip: ChipPlacement }
  | { readonly kind: "no-subject" }
  | { readonly kind: "searching" }
  | { readonly kind: "nothing" };

/** A box starting this close to the picture's top leaves no room for the chip above it. */
const CHIP_ROOM_ABOVE = 0.14;
/** A box ending this far right leaves no room for the chip to run on from its left. */
const CHIP_ROOM_RIGHT = 0.82;

/** An own motion aims where its frames say: the focus is not shown then. */
export function focusIndication(focus: PictureFocusStatus, ownMotion: boolean): FocusIndication {
  if (ownMotion) {
    return { kind: "nothing" };
  }
  switch (focus.kind) {
    case "subject":
      return {
        kind: "marker",
        box: focus.box,
        chip: {
          below: focus.box.y < CHIP_ROOM_ABOVE,
          alignRight: focus.box.x + focus.box.width > CHIP_ROOM_RIGHT,
        },
      };
    case "none":
      return { kind: "no-subject" };
    case "searching":
      return { kind: "searching" };
    case "not-looked-at":
      return { kind: "nothing" };
  }
}
