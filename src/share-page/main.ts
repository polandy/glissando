// The share page's script (dev-docs/share_link/RECIPIENTS_PAGE.md), also the TV page's
// (dev-docs/tv_remote/TV_PAGE.md): picks the page by its path. Built into share.html by
// build/share-page-plugin.ts; never imports Svelte.
import { showStartFailure } from "../export-player/page-start";
import "../export-player/page.css";
import { browserScheduler } from "../ui-kit/scheduler";
import { createTvApi } from "../tv-remote/tv-api";
import { readShareWords } from "./read-share-words";
import { isTvPath, SHARE_WORDS_BLOCK_ID } from "./share-page-contract";
import { startShareLinkPage } from "./share-link-page";
import { shareLanguage } from "./share-page-words";
import { startTvPairingPage } from "./tv-pairing-page";
import "./share-page.css";
import "./tv-page.css";

async function startPage(): Promise<void> {
  const languages = readShareWords(
    document.getElementById(SHARE_WORDS_BLOCK_ID)?.textContent ?? null,
  );
  const language = shareLanguage(navigator.language);
  document.documentElement.lang = language;
  const ports = {
    api: createTvApi((url, init) => fetch(url, init)),
    openEvents: (url: string) => new EventSource(url),
    scheduler: browserScheduler,
  };
  if (!isTvPath(location.pathname)) {
    return startShareLinkPage(languages[language], language, ports);
  }
  return startTvPairingPage(languages[language], language, {
    ...ports,
    fetch: (url) => fetch(url),
    origin: location.origin,
  });
}

startPage().catch(showStartFailure);
