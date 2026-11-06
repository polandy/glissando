import type { MusicAnalysisPass } from "../../library/music-analysis-pass";
import type { LoudnessStatus } from "./music-loudness-known";
import { PlaylistFollower } from "../music-follow/playlist-follower";
import { TrackLoudness, type TrackLoudnessPorts } from "./track-loudness";

export interface PlaylistLoudnessPorts extends TrackLoudnessPorts {
  readonly pass: Pick<MusicAnalysisPass, "subscribe" | "listenFor">;
}

/**
 * What the music editor knows of the loudness of every song of the playlist as it changes: each
 * song followed is measured for once (a song not measured yet, e.g. a server slideshow's or one
 * just added, now) and its `TrackLoudness` kept until it leaves the playlist (ADR-0040).
 */
export class PlaylistLoudness extends PlaylistFollower<LoudnessStatus> {
  constructor(
    ports: PlaylistLoudnessPorts,
    onChange: (status: ReadonlyMap<string, LoudnessStatus>) => void,
  ) {
    super(
      {
        pass: ports.pass,
        startTrack: (songId, onTrackChange) => new TrackLoudness(songId, ports, onTrackChange),
      },
      onChange,
    );
  }
}
