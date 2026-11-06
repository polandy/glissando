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
  /** When the TV's stream last closed, or the session was made. */
  tvLeftAt: number;
}

/**
 * The session whose TV has been away the longest; none while every TV is there, since the route
 * that makes sessions is public and must never end a pairing in use.
 */
export function evictionCandidate(sessions: readonly Session[]): Session | undefined {
  return sessions
    .filter((session) => session.tv === undefined)
    .reduce<Session | undefined>(
      (found, session) =>
        found === undefined || session.tvLeftAt < found.tvLeftAt ? session : found,
      undefined,
    );
}
