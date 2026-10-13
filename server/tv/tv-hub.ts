import type { Command, PlaybackState } from "../../src/tv-remote/tv-protocol";
import { newShareToken, type RandomBytes } from "../share-token";

/**
 * The TV sessions, in memory only (dev-docs/tv_remote/SESSIONS.md): who may control which TV,
 * and the streams each side holds open. No timer and no socket: expiry is checked on each call,
 * and a stream is a sink the HTTP layer maps onto `text/event-stream`.
 */

export const SESSION_IDLE_MS = 15 * 60 * 1000;
export const MAX_SESSIONS = 100;
/** No I, L or O, which a TV's font shows like 1 and 0. */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 4;
/** Far more than a hub of MAX_SESSIONS codes among 23^4 ever needs. */
const MAX_CODE_DRAWS = 64;
/** A byte from here up is drawn again, so that every letter is equally likely. */
const UNBIASED_BYTE_LIMIT = Math.floor(256 / CODE_ALPHABET.length) * CODE_ALPHABET.length;

type NoData = Readonly<Record<string, never>>;
const NO_DATA: NoData = {};

export interface TvSnapshot {
  readonly claimed: boolean;
  readonly showing: boolean;
  readonly remotePresent: boolean;
}

export type TvEvent =
  | { readonly name: "snapshot"; readonly data: TvSnapshot }
  | { readonly name: "claimed" | "show" | "end"; readonly data: NoData }
  | { readonly name: "command"; readonly data: Command }
  | { readonly name: "remote"; readonly data: { readonly present: boolean } };

export type RemoteEvent =
  | {
      readonly name: "snapshot";
      readonly data: { readonly tvPresent: boolean; readonly state: PlaybackState | null };
    }
  | { readonly name: "state"; readonly data: PlaybackState }
  | { readonly name: "tv"; readonly data: { readonly present: boolean } }
  | { readonly name: "end"; readonly data: NoData };

/** One open stream: the hub sends to it, and closes it when the session ends or is replaced. */
export interface EventSink<Event> {
  send(event: Event): void;
  close(): void;
}

/** Called by the stream's owner when it closed; calling it again does nothing. */
export type CloseStream = () => void;

/** Way A: the slideshow the phone chose, if it chose one yet. Way B: the share link's token. */
export type SlideshowSource =
  | { readonly kind: "chosen"; readonly slideshowId: string | undefined }
  | { readonly kind: "link"; readonly token: string };

export interface TvHubDependencies {
  /** Milliseconds since the epoch. */
  readonly now: () => number;
  readonly randomBytes: RandomBytes;
}

interface Session {
  readonly tvKey: string;
  remoteSecret: string | undefined;
  /** Way A until claimed. */
  code: string | undefined;
  source: SlideshowSource;
  tv: EventSink<TvEvent> | undefined;
  readonly remotes: Set<EventSink<RemoteEvent>>;
  state: PlaybackState | undefined;
  readonly createdAt: number;
  /** When the TV's stream last closed, or the session was made. */
  tvLeftAt: number;
}

export type TvHub = ReturnType<typeof createTvHub>;

export function createTvHub({ now, randomBytes }: TvHubDependencies) {
  const byTvKey = new Map<string, Session>();
  const bySecret = new Map<string, Session>();
  const byCode = new Map<string, Session>();

  const newKey = (): string => {
    const key = newShareToken(randomBytes);
    if (byTvKey.has(key) || bySecret.has(key)) {
      throw new Error("the random source answered a key a live session already has");
    }
    return key;
  };

  const newCode = (): string => {
    for (let draw = 0; draw < MAX_CODE_DRAWS; draw++) {
      const bytes = randomBytes(CODE_LENGTH);
      if (bytes.length !== CODE_LENGTH) {
        throw new Error(`the random source answered ${bytes.length} bytes, not ${CODE_LENGTH}`);
      }
      if (bytes.some((byte) => byte >= UNBIASED_BYTE_LIMIT)) continue;
      const code = Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
      if (!byCode.has(code)) return code;
    }
    throw new Error(`no unused code after ${MAX_CODE_DRAWS} draws from the random source`);
  };

  const end = (session: Session): void => {
    byTvKey.delete(session.tvKey);
    if (session.remoteSecret !== undefined) bySecret.delete(session.remoteSecret);
    if (session.code !== undefined) byCode.delete(session.code);
    const tv = session.tv;
    session.tv = undefined;
    tv?.send({ name: "end", data: NO_DATA });
    tv?.close();
    const remotes = [...session.remotes];
    session.remotes.clear();
    for (const remote of remotes) {
      remote.send({ name: "end", data: NO_DATA });
      remote.close();
    }
  };

  const isExpired = (session: Session) =>
    session.tv === undefined && now() - session.tvLeftAt >= SESSION_IDLE_MS;

  const sweep = (): void => {
    for (const session of [...byTvKey.values()]) {
      if (isExpired(session)) end(session);
    }
  };

  /** The session whose TV has been away the longest, else the oldest. */
  const evictionCandidate = (): Session | undefined => {
    const sessions = [...byTvKey.values()];
    const away = sessions.filter((session) => session.tv === undefined);
    const earliest = (candidates: Session[], time: (session: Session) => number) =>
      candidates.reduce<Session | undefined>(
        (found, session) => (found === undefined || time(session) < time(found) ? session : found),
        undefined,
      );
    return (
      earliest(away, (session) => session.tvLeftAt) ??
      earliest(sessions, (session) => session.createdAt)
    );
  };

  const add = (session: Omit<Session, "tvKey" | "remotes" | "createdAt" | "tvLeftAt">) => {
    sweep();
    if (byTvKey.size >= MAX_SESSIONS) {
      const candidate = evictionCandidate();
      if (candidate !== undefined) end(candidate);
    }
    const time = now();
    const made: Session = {
      ...session,
      tvKey: newKey(),
      remotes: new Set(),
      createdAt: time,
      tvLeftAt: time,
    };
    byTvKey.set(made.tvKey, made);
    if (made.remoteSecret !== undefined) bySecret.set(made.remoteSecret, made);
    if (made.code !== undefined) byCode.set(made.code, made);
    return made;
  };

  const live = <Key>(map: Map<Key, Session>, key: Key): Session | undefined => {
    sweep();
    return map.get(key);
  };

  const sendToRemotes = (session: Session, event: RemoteEvent) => {
    for (const remote of session.remotes) remote.send(event);
  };

  return {
    /** Way A: a session waiting for the phone to claim its code. */
    create(): { tvKey: string; code: string } {
      const session = add({
        remoteSecret: undefined,
        code: newCode(),
        source: { kind: "chosen", slideshowId: undefined },
        tv: undefined,
        state: undefined,
      });
      return { tvKey: session.tvKey, code: session.code ?? "" };
    },

    /** Way B: a session bound to the share link `token` for its whole life. */
    createBound(token: string): { tvKey: string; remoteSecret: string } {
      const remoteSecret = newKey();
      const session = add({
        remoteSecret,
        code: undefined,
        source: { kind: "link", token },
        tv: undefined,
        state: undefined,
      });
      return { tvKey: session.tvKey, remoteSecret };
    },

    /** The remote's secret for `code`, once; afterwards the code is gone. */
    claim(code: string): string | undefined {
      const session = live(byCode, code);
      if (session === undefined) return undefined;
      byCode.delete(code);
      session.code = undefined;
      const remoteSecret = newKey();
      session.remoteSecret = remoteSecret;
      bySecret.set(remoteSecret, session);
      session.tv?.send({ name: "claimed", data: NO_DATA });
      return remoteSecret;
    },

    show(remoteSecret: string, slideshowId: string): "shown" | "noSuchTv" | "boundToLink" {
      const session = live(bySecret, remoteSecret);
      if (session === undefined) return "noSuchTv";
      if (session.source.kind === "link") return "boundToLink";
      session.source = { kind: "chosen", slideshowId };
      session.tv?.send({ name: "show", data: NO_DATA });
      return "shown";
    },

    sourceOf(tvKey: string): SlideshowSource | undefined {
      return live(byTvKey, tvKey)?.source;
    },

    hasRemoteSecret: (remoteSecret: string): boolean => live(bySecret, remoteSecret) !== undefined,

    /** Replays a `snapshot` first; a second stream of the TV closes the first. */
    connectTv(tvKey: string, sink: EventSink<TvEvent>): CloseStream | undefined {
      const session = live(byTvKey, tvKey);
      if (session === undefined) return undefined;
      const previous = session.tv;
      session.tv = sink;
      if (previous === undefined) {
        sendToRemotes(session, { name: "tv", data: { present: true } });
      } else {
        previous.close();
      }
      sink.send({
        name: "snapshot",
        data: {
          claimed: session.remoteSecret !== undefined,
          showing: session.source.kind === "link" || session.source.slideshowId !== undefined,
          remotePresent: session.remotes.size > 0,
        },
      });
      return () => {
        if (session.tv !== sink) return;
        session.tv = undefined;
        session.tvLeftAt = now();
        sendToRemotes(session, { name: "tv", data: { present: false } });
      };
    },

    /** Replays a `snapshot` first. */
    connectRemote(remoteSecret: string, sink: EventSink<RemoteEvent>): CloseStream | undefined {
      const session = live(bySecret, remoteSecret);
      if (session === undefined) return undefined;
      session.remotes.add(sink);
      if (session.remotes.size === 1) {
        session.tv?.send({ name: "remote", data: { present: true } });
      }
      sink.send({
        name: "snapshot",
        data: { tvPresent: session.tv !== undefined, state: session.state ?? null },
      });
      return () => {
        if (!session.remotes.delete(sink)) return;
        if (session.remotes.size === 0) {
          session.tv?.send({ name: "remote", data: { present: false } });
        }
      };
    },

    /** `disconnect` ends the session, whether the TV is there or not. */
    command(remoteSecret: string, command: Command): "sent" | "noSuchTv" | "tvAway" {
      const session = live(bySecret, remoteSecret);
      if (session === undefined) return "noSuchTv";
      if (command.type === "disconnect") {
        end(session);
        return "sent";
      }
      if (session.tv === undefined) return "tvAway";
      session.tv.send({ name: "command", data: command });
      return "sent";
    },

    report(tvKey: string, state: PlaybackState): "reported" | "noSuchTv" {
      const session = live(byTvKey, tvKey);
      if (session === undefined) return "noSuchTv";
      session.state = state;
      sendToRemotes(session, { name: "state", data: state });
      return "reported";
    },
  };
}
