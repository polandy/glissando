// The TV page, `/tv` (dev-docs/tv_remote/TV_PAGE.md, way A): pairs with a phone by a code, then
// plays the slideshow the phone chooses, as the phone commands.
import { createMusicAudioContext } from "../player/browser/platform";
import { MutableMusicOutput } from "../export-player/mutable-music-output";
import { createPagePlayer, type PagePlayer } from "../export-player/page-player";
import { loadCaptionFont, showStartFailure } from "../export-player/page-start";
import { createPageView, type PageView } from "../export-player/page-view";
import { canFullscreen } from "../ui-kit/fullscreen";
import { tvShowPath, TvUnreachableError } from "../tv-remote/tv-api";
import {
  createShowApi,
  ShareGoneError,
  ShareUnreachableError,
  type FetchPort,
  type ShareApi,
} from "./share-api";
import { pageCopyFor, type SharePageLanguage, type SharePageWords } from "./share-page-words";
import { createShareParts, withShareParts } from "./share-parts";
import {
  loadSharedShow,
  playableShow,
  shareSummary,
  SharedPictureMissingError,
  skipMissingPicture,
  type SharedShow,
} from "./shared-show";
import { createTvParts } from "./tv-parts";
import { openTvSession, type TvPageEvent, type TvPorts, type TvSession } from "./tv-session";

/** How long the page waits before it asks a server that isn't answering again. */
export const TV_RETRY_MS = 5000;

export interface TvPagePorts extends TvPorts {
  readonly fetch: FetchPort;
  /** The page's origin, which the phone's pairing link starts with. */
  readonly origin: string;
}

interface Shown {
  readonly view: PageView;
  readonly player: PagePlayer;
  readonly show: SharedShow;
}

export async function startTvPairingPage(
  words: SharePageWords,
  language: SharePageLanguage,
  ports: TvPagePorts,
): Promise<void> {
  const parts = createTvParts(document, words, ports.scheduler);
  const shareParts = createShareParts(document, words);
  const music = new MutableMusicOutput(createMusicAudioContext);
  parts.allowSound.addEventListener("click", () => {
    music.unlock();
    parts.showSoundAllowed();
  });
  await loadCaptionFont();

  let session: TvSession | null = null;
  let shown: Shown | null = null;
  // A slideshow is chosen: shown, or still loading.
  let showing = false;
  // Each session and each slideshow loaded counts on; an answer for an older one is dropped.
  let generation = 0;

  const takeDown = () => {
    session?.release();
    if (shown === null) return;
    shown.player.dispose();
    shown.view.remove();
    for (const url of shown.show.songUrls.values()) URL.revokeObjectURL(url);
    shown = null;
    shareParts.showState("loading");
  };

  const pair = async () => {
    showing = false;
    takeDown();
    session?.close();
    session = null;
    const mine = ++generation;
    let created: { readonly tvKey: string; readonly code: string };
    try {
      created = await ports.api.createSession();
    } catch (error: unknown) {
      if (mine !== generation) return;
      if (!(error instanceof TvUnreachableError)) throw error;
      parts.showCard({ kind: "unreachable" });
      ports.scheduler.after(TV_RETRY_MS, startOver);
      return;
    }
    if (mine !== generation) return;
    const { tvKey, code } = created;
    parts.showCard({
      kind: "pairing",
      code,
      link: `${ports.origin}/?tv=${encodeURIComponent(code)}`,
    });
    session = openTvSession(ports, {
      tvKey,
      note: (note) => parts.showNote(note),
      event: (event) => heard(event, tvKey),
    });
  };
  const startOver = () => {
    pair().catch(showStartFailure);
  };

  const heard = (event: TvPageEvent, tvKey: string) => {
    switch (event.type) {
      case "snapshot":
        if (event.showing && !showing) return play(tvKey);
        if (!event.showing && showing) {
          showing = false;
          generation += 1;
          takeDown();
        }
        if (!event.showing && event.claimed) parts.showCard({ kind: "connected" });
        return;
      case "claimed":
        if (!showing) parts.showCard({ kind: "connected" });
        return;
      case "show":
        return play(tvKey);
      case "end":
      case "lost":
        return startOver();
      case "remote":
        return;
    }
  };

  const play = (tvKey: string) => {
    const mine = ++generation;
    showing = true;
    parts.showCard(null);
    shareParts.showState("starting");
    const api = createShowApi(ports.fetch, tvShowPath(tvKey));
    loadSharedShow(api, (song) => URL.createObjectURL(song), null, language).then(
      (show) => {
        if (mine === generation) return showShow(show, api);
        for (const url of show.songUrls.values()) URL.revokeObjectURL(url);
      },
      (error: unknown) => {
        if (mine !== generation) return;
        shareParts.showState("loading");
        if (error instanceof ShareGoneError) {
          // Nothing chosen any more; the stream tells what comes next.
          showing = false;
          parts.showCard({ kind: "connected" });
        } else if (error instanceof ShareUnreachableError) {
          parts.showCard({ kind: "unreachable" });
          ports.scheduler.after(TV_RETRY_MS, () => mine === generation && play(tvKey));
        } else {
          showStartFailure(error);
        }
      },
    );
  };

  const showShow = (show: SharedShow, api: ShareApi) => {
    takeDown();
    let skipped: ReadonlySet<string> = new Set();
    const playable = playableShow(show, api, skipped);
    const title = show.stored.title;
    document.title = title;
    const view = withShareParts(
      createPageView(document, {
        title,
        copy: pageCopyFor(words, language, shareSummary(show, playable.slideshow)),
        withFullScreen: canFullscreen(),
        withMusic: playable.slideshow.music !== undefined,
      }),
      shareParts,
    );
    const player = createPagePlayer(view, music, {
      pictureFailed(cause) {
        if (cause instanceof SharedPictureMissingError) {
          const skip = skipMissingPicture(show, skipped, cause.pictureKey);
          if (skip === null) return false;
          skipped = skip.skipped;
          player.show(playableShow(show, api, skipped), {
            atSeconds: skip.atSeconds,
            play: true,
          });
          return true;
        }
        // A slideshow no longer shown, or a server away: the stream tells what comes next.
        return cause instanceof ShareGoneError || cause instanceof ShareUnreachableError;
      },
      waiting: (waiting) => shareParts.showLate(waiting),
      changed(change) {
        session?.playerChanged(change);
        if (change === "ended") parts.showCard({ kind: "ended", title });
        if (change === "playing") parts.showCard(null);
        // OK on the TV remote presses Play: the gesture the browser wants before the music.
        if (change === "refused") view.togglePlay.focus();
      },
    });
    shown = { view, player, show };
    player.show(playable, { atSeconds: 0, play: true });
    session?.drive(player, title);
  };

  await pair();
}
