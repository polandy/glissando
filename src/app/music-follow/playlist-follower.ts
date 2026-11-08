import type { MusicAnalysisPass } from "../../library/music-analysis-pass";

/** One track as the playlist holds it: its stored read, and a way to stop following it. */
export interface StartedTrack {
  readonly read: Promise<void>;
  dispose(): void;
}

export interface PlaylistFollowerPorts<Status> {
  readonly pass: Pick<MusicAnalysisPass, "listenFor">;
  startTrack(songId: string, onChange: (status: Status) => void): StartedTrack;
}

/**
 * Follows every song of the playlist as it changes: each song added is listened for once and its
 * track kept until the song leaves the playlist. Tells the status of all followed songs.
 */
export class PlaylistFollower<Status> {
  readonly #ports: PlaylistFollowerPorts<Status>;
  readonly #onChange: (status: ReadonlyMap<string, Status>) => void;
  readonly #tracks = new Map<string, { track?: StartedTrack }>();
  #status = new Map<string, Status>();

  constructor(
    ports: PlaylistFollowerPorts<Status>,
    onChange: (status: ReadonlyMap<string, Status>) => void,
  ) {
    this.#ports = ports;
    this.#onChange = onChange;
  }

  /** Follows exactly `songIds`; resolves once the stored values of the new ones are read. */
  async follow(songIds: readonly string[]): Promise<void> {
    const wanted = new Set(songIds);
    for (const [songId, { track }] of this.#tracks) {
      if (!wanted.has(songId)) {
        track?.dispose();
        this.#tracks.delete(songId);
        this.#tell(new Map([...this.#status].filter(([id]) => id !== songId)));
      }
    }
    const added = songIds.filter((songId) => !this.#tracks.has(songId));
    const reads: Promise<void>[] = [];
    for (const songId of added) {
      // Held before the start so a replayed status counts; identity drops a removed track's late tell.
      const entry: { track?: StartedTrack } = {};
      this.#tracks.set(songId, entry);
      entry.track = this.#ports.startTrack(songId, (status) => {
        if (this.#tracks.get(songId) === entry) {
          this.#tell(new Map([...this.#status, [songId, status]]));
        }
      });
      reads.push(entry.track.read);
      this.#ports.pass.listenFor(songId);
    }
    await Promise.all(reads);
  }

  dispose(): void {
    for (const { track } of this.#tracks.values()) track?.dispose();
    this.#tracks.clear();
  }

  #tell(status: Map<string, Status>): void {
    this.#status = status;
    this.#onChange(status);
  }
}
