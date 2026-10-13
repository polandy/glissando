import { afterEach, describe, expect, it } from "vitest";
import { commands, page, server } from "vitest/browser";
import { loaded } from "../export-player/testing/page-frame";
import type { PlaybackState } from "../tv-remote/tv-protocol";
import remotePage from "virtual:glissando-remote-page";
import { REMOTE_WORDS_BLOCK_ID } from "./remote-page-contract";
import {
  readRemoteWords,
  remoteLanguage,
  showLine,
  type RemotePageWords,
} from "./remote-page-words";
import "./testing/fake-remote-api";

const SECRET_LENGTH = 22;
/** Its own per browser: the fake's stream is served by secret, and the browsers run at once. */
const SECRET = `remote${server.browser}`.padEnd(SECRET_LENGTH, "x");
const STATE: PlaybackState = {
  playing: true,
  ended: false,
  needsTvOk: false,
  positionSeconds: 12,
  durationSeconds: 90,
  pictureIndex: 1,
  pictureCount: 3,
  volume: 0.5,
  title: "Generated <test>",
};

interface OpenRemote {
  readonly document: Document;
  readonly words: RemotePageWords;
  readonly line: string;
}

/** Resolves once `check` holds for the frame's document, checked on every change to it. */
function until(document: Document, check: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const settle = () => {
      if (!check()) return false;
      observer.disconnect();
      resolve();
      return true;
    };
    const observer = new MutationObserver(settle);
    if (settle()) return;
    observer.observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
  });
}

const element = (document: Document, selector: string): HTMLElement => {
  const found = document.querySelector<HTMLElement>(selector);
  if (found === null) throw new Error(`the remote page has no ${selector}`);
  return found;
};
const text = (document: Document, selector: string) => element(document, selector).textContent;

describe("the remote page", () => {
  const cleanups: (() => Promise<void> | void)[] = [];
  afterEach(async () => {
    for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
  });

  /** Opens `/r/{secret}` in a frame against the fake remote API, its stream opening on a snapshot. */
  async function openRemote(secret: string): Promise<OpenRemote> {
    const snapshot = { tvPresent: true, state: STATE };
    await commands.serveFakeRemoteApi({ secret, remotePage, snapshot });
    cleanups.push(() => commands.stopFakeRemoteApi(secret));
    const frame = document.createElement("iframe");
    cleanups.push(() => frame.remove());
    const documentLoaded = loaded(frame);
    frame.src = `/r/${secret}`;
    document.body.append(frame);
    const remote = await documentLoaded;
    const language = remoteLanguage(remote.defaultView?.navigator.language ?? "");
    const words = readRemoteWords(text(remote, `#${REMOTE_WORDS_BLOCK_ID}`))[language];
    const line = showLine(words, language, {
      pictureNumber: STATE.pictureIndex + 1,
      pictureCount: STATE.pictureCount,
      playback: "playing",
    });
    return { document: remote, words, line };
  }

  const connected = (remote: OpenRemote) =>
    until(remote.document, () => text(remote.document, ".now .line") === remote.line);

  it("shows the TV's slideshow, its title and the picture count once connected", async () => {
    const remote = await openRemote(SECRET);
    await connected(remote);

    expect(text(remote.document, ".now .title")).toBe(STATE.title);
    expect(text(remote.document, ".pill-text")).toBe(remote.words.showing);
    expect(element(remote.document, "button.play").getAttribute("aria-label")).toBe(
      remote.words.pause,
    );
  });

  it("sends a press of pause to the TV", async () => {
    const remote = await openRemote(SECRET);
    await connected(remote);

    const command = commands.nextFakeRemoteCommand(SECRET);
    await page
      .frameLocator(page.elementLocator(frameOf(remote)))
      .getByRole("button", {
        name: remote.words.pause,
      })
      .click();

    expect(await command).toEqual({ type: "pause" });
  });

  it("disables the controls with a note when the TV closes its page", async () => {
    const remote = await openRemote(SECRET);
    await connected(remote);
    const pause = element(remote.document, "button.play") as HTMLButtonElement;
    expect(pause.disabled).toBe(false);

    await commands.sendFakeRemoteEvent(SECRET, "tv", { present: false });
    await until(remote.document, () => !element(remote.document, ".tv-away").hidden);

    expect(pause.disabled).toBe(true);
    expect(text(remote.document, ".pill-text")).toBe(remote.words.tvAway);
    expect(text(remote.document, ".tv-away")).toBe(remote.words.tvAwayNote);
  });

  it("shows the ended card when the server ends the remote", async () => {
    const remote = await openRemote(SECRET);
    await connected(remote);
    expect(element(remote.document, "section.ended").hidden).toBe(true);

    await commands.sendFakeRemoteEvent(SECRET, "end", {});
    await until(remote.document, () => !element(remote.document, "section.ended").hidden);

    expect(text(remote.document, "section.ended .title")).toBe(remote.words.endedTitle);
    expect(element(remote.document, "section.remote").hidden).toBe(true);
  });

  it("shows the ended card for a path that holds no remote secret", async () => {
    const remote = await openRemote(`${SECRET}x`);
    await until(remote.document, () => !element(remote.document, "section.ended").hidden);

    expect(text(remote.document, "section.ended .title")).toBe(remote.words.endedTitle);
  });
});

function frameOf(remote: OpenRemote): HTMLIFrameElement {
  const frame = remote.document.defaultView?.frameElement;
  if (!(frame instanceof HTMLIFrameElement)) throw new Error("the remote page is in no frame");
  return frame;
}
