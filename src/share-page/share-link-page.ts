// The share page for a link, `/s/<token>` (dev-docs/share_link/RECIPIENTS_PAGE.md): loads the
// shared slideshow from the share API and plays it with the web page export's player page; its
// start card offers control by phone (dev-docs/tv_remote/TV_PAGE.md, way B).
import { createMusicAudioContext } from "../player/browser/platform";
import { MutableMusicOutput } from "../export-player/mutable-music-output";
import { createPagePlayer } from "../export-player/page-player";
import { loadCaptionFont, showStartFailure } from "../export-player/page-start";
import { createPageView } from "../export-player/page-view";
import { canFullscreen } from "../ui-kit/fullscreen";
import { createShareApi, ShareGoneError, ShareUnreachableError } from "./share-api";
import { shareToken } from "./share-page-contract";
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
import { offerTvControl, type TvOffer } from "./tv-offer";
import type { TvPorts } from "./tv-session";

export async function startShareLinkPage(
  words: SharePageWords,
  language: SharePageLanguage,
  ports: TvPorts,
): Promise<void> {
  const parts = createShareParts(document, words);
  // The page starts over as it opened, with the slideshow as it is now.
  parts.tryAgain.addEventListener("click", () => location.reload());
  /** The link's own failures are states of the page; anything else is a bug and fails loud. */
  let showState = parts.showState;
  const failed = (error: unknown) => {
    if (error instanceof ShareGoneError) showState("gone");
    else if (error instanceof ShareUnreachableError) showState("unreachable");
    else showStartFailure(error);
  };

  const token = shareToken(location.pathname);
  if (token === null) {
    showState("gone");
    return;
  }
  const api = createShareApi((url) => fetch(url), token);
  const createUrl = (song: Blob) => URL.createObjectURL(song);
  let show: SharedShow;
  try {
    show = await loadSharedShow(api, createUrl, null, language);
  } catch (error: unknown) {
    failed(error);
    return;
  }
  let skipped: ReadonlySet<string> = new Set();
  const first = playableShow(show, api, skipped);
  document.title = show.stored.title;
  const view = withShareParts(
    createPageView(document, {
      title: show.stored.title,
      copy: pageCopyFor(words, language, shareSummary(show, first.slideshow)),
      withFullScreen: canFullscreen(),
      withMusic: first.slideshow.music !== undefined,
    }),
    parts,
  );
  showState = view.showState;
  await loadCaptionFont();
  const music = new MutableMusicOutput(createMusicAudioContext);
  let tv: TvOffer | null = null;
  const pagePlayer = createPagePlayer(view, music, {
    start(play) {
      view.showState("starting");
      // Live: each start plays the slideshow as it is now (dev-docs/share_link/THE_LINK.md).
      loadSharedShow(api, createUrl, show, language).then((now) => {
        if (now !== show) {
          for (const url of show.songUrls.values()) URL.revokeObjectURL(url);
          show = now;
          skipped = new Set();
          pagePlayer.show(playableShow(show, api, skipped));
        }
        play();
      }, failed);
    },
    pictureFailed(cause) {
      if (cause instanceof SharedPictureMissingError) {
        const skip = skipMissingPicture(show, skipped, cause.pictureKey);
        if (skip === null) return false;
        skipped = skip.skipped;
        pagePlayer.show(playableShow(show, api, skipped), {
          atSeconds: skip.atSeconds,
          play: true,
        });
        return true;
      }
      if (cause instanceof ShareGoneError || cause instanceof ShareUnreachableError) {
        failed(cause);
        return true;
      }
      return false;
    },
    waiting: (waiting) => parts.showLate(waiting),
    changed: (change) => tv?.playerChanged(change),
  });
  pagePlayer.show(first);
  tv = offerTvControl({
    document,
    words,
    view,
    player: pagePlayer,
    title: show.stored.title,
    token,
    origin: location.origin,
    ports,
    failed: (state) => showState(state),
  });
  // Only now is a click on Play heard; an error the player raised meanwhile stays shown.
  if (view.state === "loading") view.showState("start");
}
