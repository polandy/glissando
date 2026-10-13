import type { PageChange, PagePlayer } from "../export-player/page-player";
import type { PageView } from "../export-player/page-view";
import { TvGoneError, TvUnreachableError } from "../tv-remote/tv-api";
import { createTvParts, offerPhone } from "./tv-parts";
import type { TvPageWords } from "./tv-page-words";
import { openTvSession, type TvPorts, type TvSession } from "./tv-session";

/** Way B of the TV page (dev-docs/tv_remote/TV_PAGE.md): a share link's page, phone-driven. */
export interface TvOfferOptions {
  readonly document: Document;
  readonly words: TvPageWords;
  readonly view: PageView;
  readonly player: PagePlayer;
  readonly title: string;
  readonly token: string;
  /** The page's origin, which the remote's link starts with. */
  readonly origin: string;
  readonly ports: TvPorts;
  /** The link is gone, or the server isn't answering: the share page's own cards. */
  readonly failed: (state: "gone" | "unreachable") => void;
}

export interface TvOffer {
  /** The hook the page player's `changed` goes to. */
  playerChanged(change: PageChange): void;
}

const REMOTE_PATH = "/r/";

export function offerTvControl(options: TvOfferOptions): TvOffer {
  const { document, words, view, player, ports } = options;
  const offer = offerPhone(document, words, view.bigPlay);
  const parts = createTvParts(document, words, ports.scheduler);
  let session: TvSession | null = null;
  let link: string | null = null;
  let remotePresent = false;
  const showChip = () => parts.showChip(session !== null && !remotePresent ? link : null);
  const end = () => {
    session?.close();
    session = null;
    link = null;
    offer.reset();
    showChip();
  };

  offer.button.addEventListener("click", () => {
    offer.button.disabled = true;
    ports.api.createLinkedSession(options.token).then(
      ({ tvKey, remoteSecret }) => {
        offer.button.disabled = false;
        link = `${options.origin}${REMOTE_PATH}${encodeURIComponent(remoteSecret)}`;
        remotePresent = false;
        session = openTvSession(ports, {
          tvKey,
          note: (note) => parts.showNote(note),
          event(event) {
            switch (event.type) {
              case "snapshot":
                remotePresent = event.remotePresent;
                return showChip();
              case "remote":
                remotePresent = event.present;
                return showChip();
              case "end":
              case "lost":
                // The slideshow plays on as it is; only the phone lets go.
                return end();
              case "claimed":
              case "show":
                // Way A's events; a link's session has its slideshow from the start.
                return;
            }
          },
        });
        session.drive(player, options.title);
        offer.showLink(link);
        showChip();
      },
      (error: unknown) => {
        offer.button.disabled = false;
        if (error instanceof TvGoneError) options.failed("gone");
        else if (error instanceof TvUnreachableError) options.failed("unreachable");
        else console.error("the TV session could not be made", error);
      },
    );
  });

  return {
    playerChanged(change) {
      session?.playerChanged(change);
      // OK on the TV remote presses Play: the gesture the browser wants before the music.
      if (change === "refused" && session !== null) view.togglePlay.focus();
    },
  };
}
