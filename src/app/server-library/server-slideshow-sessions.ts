import { slideshowDurationMs } from "../../compose";
import type { LibraryStore } from "../../library/library-store";
import { MILLISECONDS_PER_SECOND } from "../../player";
import { HttpTvClient } from "../../server-library/http-tv-client";
import type { Scheduler } from "../../ui-kit/scheduler";
import { browserShareLinkDevice } from "../share-link/browser-share-link-device";
import { ShareLinkSession, type ShareLinkApi } from "../share-link/share-link-session";
import { readTvCodeQuery } from "../tv-remote/tv-code";
import { TvSession, type TvApi, type TvSlideshowCard } from "../tv-remote/tv-session";

export interface ServerSlideshowSessionPorts {
  readonly shareApi: ShareLinkApi;
  readonly slideshows: Pick<LibraryStore, "listSlideshows">;
  readonly scheduler: Scheduler;
  /** The share link was turned off and its sheet closed. */
  onTurnedOff(): void;
  onError(error: unknown): void;
  log(error: unknown): void;
}

/** A server slideshow's info panel rows below the storage row, owned by its screen. */
export interface ServerSlideshowRows {
  readonly shareLink: ShareLinkSession;
  readonly tv: TvSession;
}

/** The sheets a server slideshow's info panel opens: sharing by link and showing on a TV. */
export interface ServerSlideshowSessions {
  newShareLinkSession(slideshowId: string): ShareLinkSession;
  newTvSession(slideshowId: string): TvSession;
  /** The "Show on TV" sheet the TV's QR code opened the app with (`?tv=`); null without one. */
  readonly tvAtStart: TvSession | null;
}

/** The server's TV routes plus its slideshows as the sheet's cards, in the start screen's order. */
function browserTvApi(window: Window, ports: ServerSlideshowSessionPorts): TvApi {
  const client = new HttpTvClient({
    appUrl: new URL("./", window.location.href),
    fetch: window.fetch.bind(window),
  });
  return {
    claim: (code) => client.claim(code),
    show: (remoteSecret, slideshowId) => client.show(remoteSecret, slideshowId),
    disconnect: (remoteSecret) => client.disconnect(remoteSecret),
    listSlideshows: async () =>
      (await ports.slideshows.listSlideshows()).map((stored): TvSlideshowCard => ({
        id: stored.id,
        title: stored.title,
        pictureCount: stored.pictures.length,
        durationSeconds: slideshowDurationMs(stored) / MILLISECONDS_PER_SECOND,
      })),
  };
}

/** The address the app was opened at, and the history that rewrites it. */
export interface StartAddress {
  readonly location: Pick<Location, "pathname" | "search" | "hash">;
  readonly history: Pick<History, "state" | "replaceState">;
}

/**
 * Reads `?tv=` once and takes it out of the address, so neither a reload nor a shared address
 * pairs again; a code that is not four letters opens the sheet on empty boxes.
 */
export function openTvAtStart(
  { location, history }: StartAddress,
  newSession: () => TvSession,
): TvSession | null {
  const query = readTvCodeQuery(location.search);
  if (query === null) return null;
  history.replaceState(history.state, "", `${location.pathname}${query.search}${location.hash}`);
  const session = newSession();
  session.open(query.code ?? "");
  return session;
}

export function serverSlideshowSessions(
  window: Window,
  ports: ServerSlideshowSessionPorts,
): ServerSlideshowSessions {
  const shareDevice = browserShareLinkDevice(window, ports.shareApi, ports.scheduler);
  const tvPorts = {
    api: browserTvApi(window, ports),
    origin: window.location.origin,
    openRemote: (path: string) => window.location.assign(path),
    onError: ports.onError,
    log: ports.log,
  };
  return {
    newShareLinkSession: (slideshowId) =>
      new ShareLinkSession(slideshowId, {
        ...shareDevice,
        onTurnedOff: ports.onTurnedOff,
        onError: ports.onError,
      }),
    newTvSession: (slideshowId) => new TvSession(slideshowId, tvPorts),
    tvAtStart: openTvAtStart(window, () => new TvSession(null, tvPorts)),
  };
}
