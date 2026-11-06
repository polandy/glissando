import type { MusicAnalysisPass, MusicAnalysisPassState } from "../../library/music-analysis-pass";

/** While the stored value is read. */
export const READING_STORED = "reading";

export interface TrackFollowerPorts<Stored, Status> {
  readStored(musicId: string): Promise<Stored | undefined>;
  readonly pass: Pick<MusicAnalysisPass, "subscribe">;
  log(error: unknown): void;
  /** What is known of the track given its stored value (if any) and the pass's current state. */
  status(
    musicId: string,
    stored: Stored | undefined | typeof READING_STORED,
    pass: MusicAnalysisPassState,
  ): Status;
}

/**
 * One track followed while an editor is open: its stored result, read once, and what the
 * background pass finds meanwhile. Tells every change to `onChange`, none before the pass has
 * told its state.
 */
export class TrackFollower<Stored, Status> {
  /** Resolves once the stored value is read, or its failure logged. */
  readonly read: Promise<void>;
  readonly #stopPass: () => void;
  #stored: Stored | undefined | typeof READING_STORED = READING_STORED;
  #pass: MusicAnalysisPassState | undefined;

  constructor(
    musicId: string,
    ports: TrackFollowerPorts<Stored, Status>,
    onChange: (status: Status) => void,
  ) {
    const tell = (): void => {
      if (this.#pass !== undefined) onChange(ports.status(musicId, this.#stored, this.#pass));
    };
    this.#stopPass = ports.pass.subscribe((state) => {
      this.#pass = state;
      tell();
    });
    this.read = ports.readStored(musicId).then(
      (stored) => {
        this.#stored = stored;
        tell();
      },
      (error: unknown) => {
        // An unreadable stored value counts as none stored, so what the pass finds still lands.
        ports.log(error);
        this.#stored = undefined;
        tell();
      },
    );
  }

  dispose(): void {
    this.#stopPass();
  }
}
