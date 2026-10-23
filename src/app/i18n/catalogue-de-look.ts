import type { Message } from "./messages.ts";

/** German copy of the slideshow's colour grade (ADR-0044); part of the German catalogue. */
export const deLook = {
  "look.resetDone": "Look wieder auf Kein",
} as const satisfies Record<string, Message>;
