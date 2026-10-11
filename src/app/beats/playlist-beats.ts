import type { BeatPass } from "../../library/beat-pass";
import type { BeatsStatus } from "./music-beats-known";
import { TrackBeats, type TrackBeatsPorts } from "./track-beats";

export interface PlaylistBeatsPorts extends TrackBeatsPorts {
  readonly pass: Pick<BeatPass, "subscribe" | "listenFor">;
}

/**
 * What the music editor knows of the beats of every song of the playlist as it changes: each song
 * followed is listened for once (a song not listened to yet, e.g. a server slideshow's or one just
 * added, now) and its `TrackBeats` kept until it leaves the playlist (ADR-0021, ADR-0023).
 */
export class PlaylistBeats {
  readonly #ports: PlaylistBeatsPorts;
  readonly #onChange: (status: ReadonlyMap<string, BeatsStatus>) => void;
  readonly #tracks = new Map<string, TrackBeats>();
  #status = new Map<string, BeatsStatus>();

  constructor(
    ports: PlaylistBeatsPorts,
    onChange: (status: ReadonlyMap<string, BeatsStatus>) => void,
  ) {
    this.#ports = ports;
    this.#onChange = onChange;
  }

  /** Follows exactly `songIds`; resolves once the stored beats of the new ones are read. */
  async follow(songIds: readonly string[]): Promise<void> {
    const wanted = new Set(songIds);
    for (const [songId, track] of this.#tracks) {
      if (!wanted.has(songId)) {
        track.dispose();
        this.#tracks.delete(songId);
        this.#tell(new Map([...this.#status].filter(([id]) => id !== songId)));
      }
    }
    const added = songIds.filter((songId) => !this.#tracks.has(songId));
    for (const songId of added) {
      this.#tracks.set(
        songId,
        new TrackBeats(songId, this.#ports, (status) => {
          if (this.#tracks.has(songId)) this.#tell(new Map([...this.#status, [songId, status]]));
        }),
      );
      this.#ports.pass.listenFor(songId);
    }
    await Promise.all(added.map((songId) => this.#tracks.get(songId)?.read));
  }

  dispose(): void {
    for (const track of this.#tracks.values()) track.dispose();
    this.#tracks.clear();
  }

  #tell(status: Map<string, BeatsStatus>): void {
    this.#status = status;
    this.#onChange(status);
  }
}
