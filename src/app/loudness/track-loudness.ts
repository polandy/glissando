import type { MusicLoudness } from "../../loudness";
import type { MusicAnalysisPass } from "../../library/music-analysis-pass";
import type { LibraryStore } from "../../library/library-store";
import { TrackFollower } from "../music-follow/track-follower";
import { loudnessStatus, type LoudnessStatus } from "./music-loudness-known";

export interface TrackLoudnessPorts {
  readonly store: Pick<LibraryStore, "musicLoudness">;
  readonly pass: Pick<MusicAnalysisPass, "subscribe">;
  log(error: unknown): void;
}

/**
 * What an editor knows of one track's loudness while it is open: the stored result, read once,
 * and what the background pass finds meanwhile (ADR-0040). Tells every change to `onChange`.
 * Unread, the loudness is what the pass finds; until then the song plays unlevelled.
 */
export class TrackLoudness extends TrackFollower<MusicLoudness, LoudnessStatus> {
  constructor(
    musicId: string,
    ports: TrackLoudnessPorts,
    onChange: (status: LoudnessStatus) => void,
  ) {
    super(
      musicId,
      {
        readStored: (id) => ports.store.musicLoudness(id),
        pass: ports.pass,
        log: (error) => ports.log(error),
        status: loudnessStatus,
      },
      onChange,
    );
  }
}
