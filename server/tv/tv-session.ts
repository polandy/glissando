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

/** The session whose TV has been away the longest, else the oldest. */
export function evictionCandidate(sessions: readonly Session[]): Session | undefined {
  const away = sessions.filter((session) => session.tv === undefined);
  const earliest = (candidates: readonly Session[], time: (session: Session) => number) =>
    candidates.reduce<Session | undefined>(
      (found, session) => (found === undefined || time(session) < time(found) ? session : found),
      undefined,
    );
  return (
    earliest(away, (session) => session.tvLeftAt) ??
    earliest(sessions, (session) => session.createdAt)
  );
}
