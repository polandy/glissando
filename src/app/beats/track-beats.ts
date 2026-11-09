import type { MusicBeats } from "../../beats";
import type { MusicAnalysisPass } from "../../library/music-analysis-pass";
import type { LibraryStore } from "../../library/library-store";
import { TrackFollower } from "../music-follow/track-follower";
import { beatsStatus, type BeatsStatus } from "./music-beats-known";

export interface TrackBeatsPorts {
  readonly store: Pick<LibraryStore, "musicBeats">;
  readonly pass: Pick<MusicAnalysisPass, "subscribe">;
  log(error: unknown): void;
}

/**
 * What an editor knows of one track's beats while it is open: the stored result, read once, and
 * what the background pass finds meanwhile (ADR-0021). Tells every change to `onChange`. Unread,
 * the beats are what the pass finds; until then the pictures share the music evenly.
 */
export class TrackBeats extends TrackFollower<MusicBeats, BeatsStatus> {
  constructor(musicId: string, ports: TrackBeatsPorts, onChange: (status: BeatsStatus) => void) {
    super(
      musicId,
      {
        readStored: (id) => ports.store.musicBeats(id),
        pass: ports.pass,
        log: (error) => ports.log(error),
        status: beatsStatus,
      },
      onChange,
    );
  }
}
