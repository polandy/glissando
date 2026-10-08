import type { Scheduler } from "../scheduler";

export const CONTROLS_HIDE_DELAY_MS = 2500;

/**
 * Whether the player's controls show: a tap toggles them; during playback they hide themselves
 * after a moment without interaction, while paused or ended they stay.
 */
export class ControlsVisibility {
  readonly #scheduler: Scheduler;
  readonly #onChange: (visible: boolean) => void;
  #visible = true;
  #playing = false;
  #cancelHide: (() => void) | null = null;

  constructor(scheduler: Scheduler, onChange: (visible: boolean) => void) {
    this.#scheduler = scheduler;
    this.#onChange = onChange;
  }

  get visible(): boolean {
    return this.#visible;
  }

  /** Called on every playback tick, so only a change of state may touch the hide delay. */
  setPlaying(playing: boolean): void {
    if (playing === this.#playing) {
      return;
    }
    this.#playing = playing;
    if (playing) {
      this.#armHide();
    } else {
      this.reveal();
    }
  }

  toggle(): void {
    if (this.#visible) {
      this.#cancel();
      this.#set(false);
    } else {
      this.reveal();
    }
  }

  /** Shows the controls and restarts the hide delay, e.g. after a key press. */
  reveal(): void {
    this.#set(true);
    this.#armHide();
  }

  dispose(): void {
    this.#cancel();
  }

  #armHide(): void {
    this.#cancel();
    if (this.#playing && this.#visible) {
      this.#cancelHide = this.#scheduler.after(CONTROLS_HIDE_DELAY_MS, () => {
        this.#cancelHide = null;
        this.#set(false);
      });
    }
  }

  #cancel(): void {
    this.#cancelHide?.();
    this.#cancelHide = null;
  }

  #set(visible: boolean): void {
    if (visible !== this.#visible) {
      this.#visible = visible;
      this.#onChange(visible);
    }
  }
}
