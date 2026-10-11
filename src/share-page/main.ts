// The share page's script (dev-docs/SHARE_LINK.md, The recipient's page): loads the shared
// slideshow from the share API and plays it with the web page export's player page. Built into
// share.html by build/share-page-plugin.ts; never imports Svelte.
import { createMusicAudioContext } from "../player/browser/platform";
import { MutableMusicOutput } from "../export-player/mutable-music-output";
import { createPagePlayer, loadCaptionFont, showStartFailure } from "../export-player/page-player";
import { createPageView } from "../export-player/page-view";
import "../export-player/page.css";
import { canFullscreen } from "../ui-kit/fullscreen";
import { createShareApi, ShareGoneError, ShareUnreachableError } from "./share-api";
import { SHARE_WORDS_BLOCK_ID, shareToken } from "./share-page-contract";
import { readShareWords } from "./read-share-words";
import { pageCopyFor, shareLanguage } from "./share-page-words";
import { createShareParts, withShareParts } from "./share-parts";
import {
  loadSharedShow,
  playableShow,
  SharedPictureMissingError,
  skipMissingPicture,
  type SharedShow,
} from "./shared-show";
import "./share-page.css";

async function startSharePage(): Promise<void> {
  const languages = readShareWords(
    document.getElementById(SHARE_WORDS_BLOCK_ID)?.textContent ?? null,
  );
  const language = shareLanguage(navigator.language);
  const words = languages[language];
  document.documentElement.lang = language;
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
    show = await loadSharedShow(api, createUrl, null);
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
      copy: pageCopyFor(words, language, {
        pictureCount: first.slideshow.slides.length,
        durationMs: first.slideshow.slides.reduce((sum, { durationMs }) => sum + durationMs, 0),
        withMusic: first.slideshow.music !== undefined,
      }),
      withFullScreen: canFullscreen(),
      withMusic: first.slideshow.music !== undefined,
    }),
    parts,
  );
  showState = view.showState;
  await loadCaptionFont();
  const music = new MutableMusicOutput(createMusicAudioContext);
  const pagePlayer = createPagePlayer(view, music, {
    start(play) {
      view.showState("starting");
      // Live: each start plays the slideshow as it is now (dev-docs/SHARE_LINK.md, The link).
      loadSharedShow(api, createUrl, show).then((now) => {
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
  });
  pagePlayer.show(first);
  // Only now is a click on Play heard; an error the player raised meanwhile stays shown.
  if (view.state === "loading") view.showState("start");
}

startSharePage().catch(showStartFailure);
