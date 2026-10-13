import { createFrameDeck, ROUND_SIZE, type FrameDeck, type FrameOrder } from "./frame-deck";
import type { RoundPicture } from "./round-composition";

export interface FrameAlbumDeckPorts {
  readonly order: FrameOrder;
  readonly random: () => number;
  /** Reads the whole album again; a frame plays on even while this is slow or fails. */
  readonly refresh: () => Promise<readonly RoundPicture[]>;
  readonly onRefreshFailed: (error: unknown) => void;
}

export interface FrameAlbumRound {
  readonly pictureIds: readonly string[];
  readonly picturesById: ReadonlyMap<string, RoundPicture>;
}

/**
 * Deals a picture frame's rounds from a whole Immich album (`dev-docs/app/FRAME.md`), re-reading
 * the album once each full pass is dealt so a picture added or removed on Immich shows up on the
 * next pass; the re-read runs in the background, never blocking `nextRound()`.
 */
export class FrameAlbumDeck {
  readonly #ports: FrameAlbumDeckPorts;
  #picturesById: ReadonlyMap<string, RoundPicture>;
  #deck: FrameDeck;
  #roundsPerPass: number;
  #roundsDealt = 0;
  #refreshing = false;

  constructor(pictures: readonly RoundPicture[], ports: FrameAlbumDeckPorts) {
    this.#ports = ports;
    this.#picturesById = indexById(pictures);
    this.#deck = createFrameDeck(pictures, ports.order, ports.random);
    this.#roundsPerPass = roundsPerPass(pictures.length);
  }

  nextRound(): FrameAlbumRound {
    const pictureIds = this.#deck.nextRound();
    const round: FrameAlbumRound = { pictureIds, picturesById: this.#picturesById };
    this.#roundsDealt += 1;
    if (this.#roundsDealt >= this.#roundsPerPass) {
      this.#roundsDealt = 0;
      this.#startRefresh();
    }
    return round;
  }

  #startRefresh(): void {
    if (this.#refreshing) {
      return;
    }
    this.#refreshing = true;
    this.#ports
      .refresh()
      .then((pictures) => {
        this.#picturesById = indexById(pictures);
        this.#deck = createFrameDeck(pictures, this.#ports.order, this.#ports.random);
        this.#roundsPerPass = roundsPerPass(pictures.length);
      })
      .catch(this.#ports.onRefreshFailed)
      .finally(() => {
        this.#refreshing = false;
      });
  }
}

function roundsPerPass(pictureCount: number): number {
  return Math.max(1, Math.ceil(pictureCount / ROUND_SIZE));
}

function indexById(pictures: readonly RoundPicture[]): ReadonlyMap<string, RoundPicture> {
  return new Map(pictures.map((picture) => [picture.id, picture]));
}
