import type { MusicAnalysisPass } from "../../library/music-analysis-pass";
import type { BeatsStatus } from "./music-beats-known";
import { PlaylistFollower } from "../music-follow/playlist-follower";
import { TrackBeats, type TrackBeatsPorts } from "./track-beats";

export interface PlaylistBeatsPorts extends TrackBeatsPorts {
  readonly pass: Pick<MusicAnalysisPass, "subscribe" | "listenFor">;
}

/**
 * What the music editor knows of the beats of every song of the playlist as it changes: each song
 * followed is listened for once (a song not listened to yet, e.g. a server slideshow's or one just
 * added, now) and its `TrackBeats` kept until it leaves the playlist (ADR-0021, ADR-0023).
 */
export class PlaylistBeats extends PlaylistFollower<BeatsStatus> {
  constructor(
    ports: PlaylistBeatsPorts,
    onChange: (status: ReadonlyMap<string, BeatsStatus>) => void,
  ) {
    super(
      {
        pass: ports.pass,
        startTrack: (songId, onTrackChange) => new TrackBeats(songId, ports, onTrackChange),
      },
      onChange,
    );
  }
}
