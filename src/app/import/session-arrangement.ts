/**
 * The pictures strip's order for a new slideshow, kept in step with the ready pictures
 * (`dev-docs/app/IMPORT_ARRANGING.md`, Order); a thin, stateful wrapper around the pure functions
 * of `import-arrangement.ts`, kept out of `ImportSession` to leave it short. A move or a shift
 * exempts the moved pictures from culling through `exempt`.
 */

import type { PictureImport } from "../../import/picture-import";
import {
  EMPTY_ARRANGEMENT,
  moveGroup as orderWithGroupMoved,
  reconcile,
  shiftGroup as orderWithGroupShifted,
  shuffle as orderShuffled,
  type ArrangementState,
} from "./import-arrangement";

export interface SessionArrangementPorts {
  readonly pictures: Pick<PictureImport, "state" | "subscribe">;
  /** Spares the moved pictures from every cull from now on. */
  exempt(ids: readonly string[]): void;
  /** Uniform in [0, 1); what Shuffle draws its order from. */
  readonly random: () => number;
}

export class SessionArrangement {
  readonly #ports: SessionArrangementPorts;
  readonly #listeners = new Set<(state: ArrangementState) => void>();
  #state = EMPTY_ARRANGEMENT;

  constructor(ports: SessionArrangementPorts) {
    this.#ports = ports;
    ports.pictures.subscribe((importState) => {
      this.#set(
        reconcile(
          this.#state,
          importState.pictures.map((picture) => picture.id),
        ),
      );
    });
  }

  get state(): ArrangementState {
    return this.#state;
  }

  /** The Svelte store contract: called now with the current state, then on every change. */
  subscribe(listener: (state: ArrangementState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  /** Moves `group` to sit before the tile at `insertion` (drag, a drop). */
  moveGroup(group: ReadonlySet<string>, insertion: number): void {
    this.#set(orderWithGroupMoved(this.#state, group, insertion));
    this.#ports.exempt([...group]);
  }

  /** Shifts `group` by `offset` steps (Earlier/Later, Shift+arrows). */
  shiftGroup(group: ReadonlySet<string>, offset: number): void {
    this.#set(orderWithGroupShifted(this.#state, group, offset));
    this.#ports.exempt([...group]);
  }

  /** A new random order of the ready pictures, the user's own. */
  shuffle(): void {
    this.#set(orderShuffled(this.#state, this.#ports.random));
  }

  /** Starts over, such as when the import is discarded. */
  reset(): void {
    this.#set(EMPTY_ARRANGEMENT);
  }

  #set(next: ArrangementState): void {
    this.#state = next;
    for (const listener of this.#listeners) listener(this.#state);
  }
}
