import type { PlaybackState } from "../../src/tv-remote/tv-protocol";
import type { EventSink, RemoteEvent, SlideshowSource, TvEvent } from "./tv-hub";

export interface Session {
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

const isPairedInUse = (session: Session) =>
  session.remoteSecret !== undefined && session.remotes.size > 0;

/**
 * The session to drop for one more: never a claimed one with a remote connected, since the route
 * that makes sessions is public and must never end a pairing in use. Of the rest, the one whose TV
 * has been away the longest, else the oldest one whose TV is there.
 */
export function evictionCandidate(sessions: readonly Session[]): Session | undefined {
  const rank = (session: Session): readonly [number, number] =>
    session.tv === undefined ? [0, session.tvLeftAt] : [1, session.createdAt];
  return sessions
    .filter((session) => !isPairedInUse(session))
    .reduce<Session | undefined>((found, session) => {
      if (found === undefined) return session;
      const [group, time] = rank(session);
      const [foundGroup, foundTime] = rank(found);
      return group < foundGroup || (group === foundGroup && time < foundTime) ? session : found;
    }, undefined);
}
