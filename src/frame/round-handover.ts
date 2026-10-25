/**
 * Hands playback over from one round's player to the next without the player itself being
 * incremental (`dev-docs/app/FRAME.md`, ADR-0030): the next round is created and started, muted
 * from view, as soon as the current one starts, so by the time it ends the next is usually
 * already showing its first picture; only then is the old one torn down.
 */

/** The player API the hand-over needs; `BrowserPlayer` (src/player) satisfies it. */
export interface FrameRoundPlayer {
  play(): void;
  pause(): void;
  destroy(): void;
  addEventListener(type: "ended" | "playing" | "waiting", listener: () => void): void;
  removeEventListener(type: "ended" | "playing" | "waiting", listener: () => void): void;
}

export type RoundOutcome =
  | { readonly kind: "player"; readonly player: FrameRoundPlayer }
  /** The album has nothing left to compose a round from (`dev-docs/app/FRAME.md`). */
  | { readonly kind: "noPicturesLeft" };

export interface RoundHandoverPorts {
  /** Composes and creates the player for the next round in the deck's order. */
  createNextRound(): RoundOutcome;
}

export interface RoundHandoverState {
  readonly player: FrameRoundPlayer | null;
  readonly paused: boolean;
  /** True once the album has nothing left and no round is left playing. */
  readonly endOfPictures: boolean;
  /**
   * True while the frame waits for a picture: until the first round plays,
   * while the current round's player itself waits for a picture, and while an ended round waits
   * for the prepared one to take over.
   */
  readonly waiting: boolean;
}

/** Keeps exactly one round playing at a time, with the next one prepared ahead of its turn. */
export class RoundHandover {
  readonly #ports: RoundHandoverPorts;
  readonly #listeners = new Set<(state: RoundHandoverState) => void>();
  readonly #onEnded = (): void => this.#swapOrWait();
  readonly #onPreparingReady = (): void => {
    this.#preparingReady = true;
    if (this.#waitingToSwap) {
      this.#swapIn();
    }
  };
  readonly #onCurrentPlaying = (): void => {
    this.#currentPlaying = true;
    this.#notify();
  };
  readonly #onCurrentWaiting = (): void => {
    this.#currentPlaying = false;
    this.#notify();
  };
  #current: FrameRoundPlayer | null = null;
  #preparing: FrameRoundPlayer | null = null;
  #preparingReady = false;
  #waitingToSwap = false;
  #paused = false;
  #endOfPictures = false;
  /** Whether `#current` itself last reported "playing" rather than "waiting". */
  #currentPlaying = false;

  constructor(ports: RoundHandoverPorts) {
    this.#ports = ports;
  }

  get state(): RoundHandoverState {
    return {
      player: this.#current,
      paused: this.#paused,
      endOfPictures: this.#endOfPictures,
      waiting: this.#waiting(),
    };
  }

  /**
   * At end of pictures there is nothing left to wait for; before `start()` there is no current
   * round yet; an ended round waiting for the prepared one to take over has nothing on screen
   * either way, whatever the ended round's own player last reported.
   */
  #waiting(): boolean {
    if (this.#endOfPictures) {
      return false;
    }
    if (this.#current === null || this.#waitingToSwap) {
      return true;
    }
    return !this.#currentPlaying;
  }

  /** Called with the current state at once, then with every change; returns the unsubscribe. */
  subscribe(listener: (state: RoundHandoverState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.state);
    return () => this.#listeners.delete(listener);
  }

  /** Starts the first round; a picture frame calls this once, right after construction. */
  start(): void {
    const outcome = this.#ports.createNextRound();
    if (outcome.kind === "noPicturesLeft") {
      this.#endOfPictures = true;
      this.#notify();
      return;
    }
    this.#current = outcome.player;
    this.#current.addEventListener("ended", this.#onEnded);
    this.#current.addEventListener("playing", this.#onCurrentPlaying);
    this.#current.addEventListener("waiting", this.#onCurrentWaiting);
    this.#current.play();
    this.#notify();
    this.#prepareNext();
  }

  pause(): void {
    this.#current?.pause();
    this.#paused = true;
    this.#notify();
  }

  resume(): void {
    this.#current?.play();
    this.#paused = false;
    this.#notify();
  }

  /** "Next": ends the round early, the same hand-over as a natural end. */
  skip(): void {
    this.#swapOrWait();
  }

  /** Tears down whatever is playing or being prepared; called when the frame is left. */
  destroy(): void {
    this.#current?.removeEventListener("ended", this.#onEnded);
    this.#current?.removeEventListener("playing", this.#onCurrentPlaying);
    this.#current?.removeEventListener("waiting", this.#onCurrentWaiting);
    this.#current?.destroy();
    this.#current = null;
    this.#preparing?.removeEventListener("playing", this.#onPreparingReady);
    this.#preparing?.destroy();
    this.#preparing = null;
  }

  #prepareNext(): void {
    if (this.#preparing !== null) {
      return;
    }
    const outcome = this.#ports.createNextRound();
    if (outcome.kind === "noPicturesLeft") {
      return;
    }
    this.#preparing = outcome.player;
    this.#preparing.addEventListener("playing", this.#onPreparingReady);
    this.#preparing.play();
  }

  /** The round ended (naturally or via `skip`): swaps in the next round if it is ready, else waits. */
  #swapOrWait(): void {
    this.#current?.removeEventListener("ended", this.#onEnded);
    if (this.#preparing === null) {
      // The album had nothing left to prepare when this round started.
      this.#endOfPictures = true;
      this.#notify();
      return;
    }
    if (this.#preparingReady) {
      this.#swapIn();
    } else {
      this.#waitingToSwap = true;
    }
  }

  #swapIn(): void {
    const next = this.#preparing;
    if (next === null) {
      return;
    }
    next.removeEventListener("playing", this.#onPreparingReady);
    this.#current?.removeEventListener("playing", this.#onCurrentPlaying);
    this.#current?.removeEventListener("waiting", this.#onCurrentWaiting);
    this.#current?.destroy();
    this.#current = next;
    // The prepared round only ever got here because its own "playing" already fired.
    this.#currentPlaying = true;
    this.#current.addEventListener("ended", this.#onEnded);
    this.#current.addEventListener("playing", this.#onCurrentPlaying);
    this.#current.addEventListener("waiting", this.#onCurrentWaiting);
    this.#preparing = null;
    this.#preparingReady = false;
    this.#waitingToSwap = false;
    this.#notify();
    this.#prepareNext();
  }

  #notify(): void {
    const state = this.state;
    for (const listener of this.#listeners) {
      listener(state);
    }
  }
}
