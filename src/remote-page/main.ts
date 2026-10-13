// The remote page's script (dev-docs/tv_remote/REMOTE_PAGE.md): controls a slideshow on the TV
// through the server. Built into remote.html by build/remote-page-plugin.ts; never imports
// Svelte.
import type { Command } from "../tv-remote/tv-protocol";
import {
  INITIAL_REMOTE_MODEL,
  remoteModelAfter,
  remoteScreen,
  type RemoteEvent,
} from "./remote-model";
import { remoteSecret, REMOTE_WORDS_BLOCK_ID } from "./remote-page-contract";
import { readRemoteWords, remoteLanguage } from "./remote-page-words";
import { createRemoteApi } from "./remote-stream";
import { createRemoteView } from "./remote-view";
import "./remote-page.css";

/** How often the position runs on while the TV plays. */
const TICK_MS = 250;
const VISIBLE: DocumentVisibilityState = "visible";

function startRemotePage(): void {
  const languages = readRemoteWords(
    document.getElementById(REMOTE_WORDS_BLOCK_ID)?.textContent ?? null,
  );
  const language = remoteLanguage(navigator.language);
  document.documentElement.lang = language;
  const now = () => performance.now();
  let model = INITIAL_REMOTE_MODEL;

  const secret = remoteSecret(location.pathname);
  const api =
    secret === null
      ? null
      : createRemoteApi(secret, {
          openEventSource: (url) => new EventSource(url),
          fetch: (url, init) => fetch(url, init),
          schedule: (run, delayMs) => {
            setTimeout(() => void run(), delayMs);
          },
          reportError: (error) => console.error(error),
        });
  const send = (command: Command) => {
    api?.send(command).then((failure) => {
      update(
        failure === null
          ? { type: "commandSent" }
          : { type: "commandFailed", command, reason: failure },
      );
    }, console.error);
  };
  const view = createRemoteView(document, languages[language], language, {
    command: send,
    tryAgain: () => {
      if (model.failedCommand !== null) send(model.failedCommand);
    },
  });
  function update(event: RemoteEvent): void {
    model = remoteModelAfter(model, event, now());
    view.render(remoteScreen(model, now()));
  }

  if (api === null) {
    update({ type: "end" });
    return;
  }
  view.render(remoteScreen(model, now()));
  api.openStream(update);
  setInterval(() => {
    if (model.playback?.playing === true) view.render(remoteScreen(model, now()));
  }, TICK_MS);
  keepScreenOn();
}

/** The phone's screen stays on while the remote is open, where the browser can (wake lock). */
function keepScreenOn(): void {
  if (!("wakeLock" in navigator)) return;
  const request = () => {
    navigator.wakeLock.request("screen").catch((error: unknown) => {
      console.warn("the remote cannot keep the screen on", error);
    });
  };
  request();
  // The browser lets the lock go whenever the page is hidden.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === VISIBLE) request();
  });
}

startRemotePage();
