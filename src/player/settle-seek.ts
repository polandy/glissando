import type { PlayerEvent } from "./player-events";

const SEEK_EVENTS: readonly PlayerEvent[] = ["seeked", "timeupdate"];

/** What a seek needs from the player to show its new frame. */
export interface SeekSettling {
  readonly paused: boolean;
  readonly target: EventTarget;
  readonly whenDrawable: (action: () => void) => void;
  readonly draw: () => void;
  readonly startAdvancing: (onFirstFrame: () => void) => void;
}

/** Shows the frame a seek landed on, then tells listeners: drawn at once paused, else by playing on. */
export function settleSeek(settling: SeekSettling): void {
  const announceSeeked = (): void => {
    for (const type of SEEK_EVENTS) settling.target.dispatchEvent(new Event(type));
  };
  if (settling.paused) {
    settling.whenDrawable(() => {
      settling.draw();
      announceSeeked();
    });
  } else {
    settling.startAdvancing(announceSeeked);
  }
}
