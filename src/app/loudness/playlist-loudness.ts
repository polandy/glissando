import type { LoudnessPass } from "../../library/loudness-pass";
import type { LoudnessStatus } from "./music-loudness-known";
import { TrackLoudness, type TrackLoudnessPorts } from "./track-loudness";

export interface PlaylistLoudnessPorts extends TrackLoudnessPorts {
  readonly pass: Pick<LoudnessPass, "subscribe" | "listenFor">;
}

/**
 * What the music editor knows of the loudness of every song of the playlist as it changes: each
 * song followed is measured for once (a song not measured yet, e.g. a server slideshow's or one
 * just added, now) and its `TrackLoudness` kept until it leaves the playlist (ADR-0040).
 */
export class PlaylistLoudness {
  readonly #ports: PlaylistLoudnessPorts;
  readonly #onChange: (status: ReadonlyMap<string, LoudnessStatus>) => void;
  readonly #tracks = new Map<string, TrackLoudness>();
  #status = new Map<string, LoudnessStatus>();

  constructor(
    ports: PlaylistLoudnessPorts,
    onChange: (status: ReadonlyMap<string, LoudnessStatus>) => void,
  ) {
    this.#ports = ports;
    this.#onChange = onChange;
  }

  /** Follows exactly `songIds`; resolves once the stored loudness of the new ones is read. */
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
        new TrackLoudness(songId, this.#ports, (status) => {
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

  #tell(status: Map<string, LoudnessStatus>): void {
    this.#status = status;
    this.#onChange(status);
  }
}
