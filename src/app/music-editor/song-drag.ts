/**
 * Reordering the playlist by a song's grip, for mouse and touch alike (ADR-0019's pattern): pure
 * and driven with plain pointer data; the rows' places come in as a port. The grip takes the
 * pointer at once (`touch-action: none`), so no hold is needed.
 */

/** A row's vertical extent in viewport px. */
export interface RowBand {
  readonly top: number;
  readonly bottom: number;
}

export interface SongDragPorts {
  /** The playlist's rows in order, read fresh on every move (the page can scroll). */
  rows(): readonly RowBand[];
  onMove(songId: string, toIndex: number): void;
}

/** The song dragged and the place it would drop on. */
export interface SongDragState {
  readonly songId: string;
  readonly overIndex: number;
}

export const MOVE_UP_KEY = "ArrowUp";
export const MOVE_DOWN_KEY = "ArrowDown";

/** The place a focused grip's key moves its song to; null for any other key or at an end. */
export function songIndexAfterKey(key: string, index: number, count: number): number | null {
  const step = key === MOVE_UP_KEY ? -1 : key === MOVE_DOWN_KEY ? 1 : 0;
  const to = index + step;
  return step === 0 || to < 0 || to >= count ? null : to;
}

/** The row under `y`; above the first or below the last, that end. */
function indexAt(y: number, rows: readonly RowBand[]): number {
  const under = rows.findIndex((row) => y < row.bottom);
  return under === -1 ? rows.length - 1 : under;
}

export class SongDrag {
  readonly #ports: SongDragPorts;
  #pointerId: number | null = null;
  #fromIndex = 0;
  #state: SongDragState | null = null;

  constructor(ports: SongDragPorts) {
    this.#ports = ports;
  }

  /** Null while no song is dragged. */
  get state(): SongDragState | null {
    return this.#state;
  }

  down(input: { songId: string; index: number; pointerId: number; y: number }): void {
    if (this.#pointerId !== null) return;
    this.#pointerId = input.pointerId;
    this.#fromIndex = input.index;
    this.#state = { songId: input.songId, overIndex: input.index };
  }

  move(input: { pointerId: number; y: number }): void {
    if (this.#state === null || input.pointerId !== this.#pointerId) return;
    this.#state = { ...this.#state, overIndex: indexAt(input.y, this.#ports.rows()) };
  }

  up(input: { pointerId: number }): void {
    if (this.#state === null || input.pointerId !== this.#pointerId) return;
    const { songId, overIndex } = this.#state;
    this.cancel();
    if (overIndex !== this.#fromIndex) this.#ports.onMove(songId, overIndex);
  }

  cancel(): void {
    this.#pointerId = null;
    this.#state = null;
  }
}
