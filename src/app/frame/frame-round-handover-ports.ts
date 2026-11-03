import { createPlayer, type OpenPicture } from "../../player";
import { composeRound, type RoundPicture } from "../../frame/round-composition";
import { followShownPicture } from "../../frame/round-position";
import type { FrameAlbumDeck } from "../../frame/frame-album-deck";
import type {
  FrameRoundPlayer,
  RoundHandoverPorts,
  RoundOutcome,
} from "../../frame/round-handover";

export interface FrameRoundHandoverDeps {
  readonly deck: FrameAlbumDeck;
  /** The slideshow title of each round; the album's own name. */
  readonly albumName: string;
  readonly intervalMs: number;
  readonly openPicture: OpenPicture;
  /** A fresh, unattached container for one round's player. */
  readonly createContainer: () => HTMLElement;
  /** A picture that failed to load; the round plays on without it. */
  readonly onPhotoFailed: (error: unknown) => void;
  /**
   * A round's player and its container, as soon as both exist: the preparing round renders into
   * its container hidden, ahead of the hand-over that reveals it (`dev-docs/app/FRAME.md`).
   */
  readonly onRoundReady: (player: FrameRoundPlayer, container: HTMLElement) => void;
  /**
   * The picture a round's player shows: once the round exists (its first picture) and again each
   * time its playback moves on to the next. Hidden rounds report too; the caller picks the shown one.
   */
  readonly onPictureShown: (player: FrameRoundPlayer, picture: RoundPicture) => void;
}

/**
 * Builds the `RoundHandover` ports that compose and play one round at a time
 * (`dev-docs/app/FRAME.md`, ADR-0030): each round gets its own DOM container, torn down with its
 * player once the hand-over moves past it.
 */
export function createFrameRoundHandoverPorts(deps: FrameRoundHandoverDeps): RoundHandoverPorts {
  return {
    createNextRound(): RoundOutcome {
      const round = deps.deck.nextRound();
      if (round.pictureIds.length === 0) {
        return { kind: "noPicturesLeft" };
      }
      const slideshow = composeRound(
        deps.albumName,
        round.pictureIds,
        round.picturesById,
        deps.intervalMs,
        (id) => id,
      );
      const container = deps.createContainer();
      const player = createPlayer(container, slideshow, { openPicture: deps.openPicture });
      player.addEventListener("error", () =>
        deps.onPhotoFailed(new Error("frame: a picture failed to load")),
      );
      const wrapped = wrapPlayer(player, container);
      const showPicture = (index: number) =>
        deps.onPictureShown(wrapped, requirePicture(round.picturesById, round.pictureIds[index]));
      showPicture(0);
      followShownPicture(player, deps.intervalMs, round.pictureIds.length, showPicture);
      deps.onRoundReady(wrapped, container);
      return { kind: "player", player: wrapped };
    },
  };
}

function requirePicture(
  picturesById: ReadonlyMap<string, RoundPicture>,
  id: string | undefined,
): RoundPicture {
  const picture = id === undefined ? undefined : picturesById.get(id);
  if (picture === undefined) {
    throw new Error(`frame: picture "${String(id)}" is not in the album's own list`);
  }
  return picture;
}

/** Ties a round's container to its player's lifetime: `destroy()` removes both. */
function wrapPlayer(
  player: { play(): void; pause(): void; destroy(): void } & EventTarget,
  container: HTMLElement,
): FrameRoundPlayer {
  return {
    play: () => player.play(),
    pause: () => player.pause(),
    destroy: () => {
      player.destroy();
      container.remove();
    },
    addEventListener: (type, listener) => player.addEventListener(type, listener),
    removeEventListener: (type, listener) => player.removeEventListener(type, listener),
  };
}
