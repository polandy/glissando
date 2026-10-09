import {
  estimatedBytes,
  exportFileName,
  frameCount,
  presetById,
  VIDEO_PRESETS,
  type AudioCodecChoice,
  type ExportCapabilities,
  type ExportProgress,
  type ExportTarget,
  type PresetId,
  type UnsupportedReason,
  type VideoExportResult,
} from "../../video-export";

/** The preset "Andere Größe wählen" offers after the storage ran out: the smallest. */
const SMALLEST_PRESET: PresetId = "720p";
const SHARE_DISMISSED = "AbortError";

/** One export as the sheet starts it; `Preview` is the canvas the export just drew. */
export interface ExportRun<Preview> {
  readonly preset: PresetId;
  readonly audioCodec: AudioCodecChoice | null;
  readonly target: ExportTarget;
  readonly signal: AbortSignal;
  onProgress(progress: ExportProgress, preview: Preview): void;
}

/** What the sheet needs of the browser and the export (VIDEO_EXPORT.md, Sheet). */
export interface VideoExportPorts<Preview> {
  probe(withMusic: boolean): Promise<ExportCapabilities>;
  /** Quota minus usage of the origin's storage; null where the browser cannot tell. */
  freeBytes(): Promise<number | null>;
  canPickSaveFile(): boolean;
  /** Null when the user dismissed the picker. */
  pickSaveTarget(fileName: string): Promise<ExportTarget | null>;
  privateExportTarget(fileName: string): Promise<ExportTarget>;
  run(job: ExportRun<Preview>): Promise<VideoExportResult>;
  keepScreenAwake(): { release(): void };
  canShare(file: File): boolean;
  /** Rejects with an "AbortError" when the user dismissed the share sheet. */
  share(file: File): Promise<void>;
  download(file: File): void;
  /** An error the sheet shows in its own words. */
  log(error: unknown): void;
}

/** The slideshow being exported. */
export interface ExportSubject {
  readonly title: string;
  readonly durationMs: number;
  readonly withMusic: boolean;
}

export interface SpaceShortage {
  readonly freeBytes: number;
  readonly neededBytes: number;
  /** The largest smaller preset whose estimate fits; null when none does. */
  readonly fitting: PresetId | null;
}

/** How a finished file reaches the user: already saved, the share sheet or a download. */
export type Delivery = "saved" | "share" | "download";

export type ExportSheetState =
  | { readonly kind: "probing" }
  | { readonly kind: "unsupported"; readonly reason: UnsupportedReason }
  | {
      readonly kind: "choose";
      readonly available: readonly PresetId[];
      readonly preset: PresetId;
      readonly audioCodec: AudioCodecChoice | null;
      readonly spaceShortage: SpaceShortage | null;
      /** "Video erstellen" was pressed; the target is being opened. */
      readonly starting: boolean;
    }
  | {
      readonly kind: "running";
      readonly preset: PresetId;
      readonly framesDone: number;
      readonly framesTotal: number;
      /** Null until the first frame gave a time per frame. */
      readonly remainingMs: number | null;
    }
  | {
      readonly kind: "done";
      readonly preset: PresetId;
      readonly file: File;
      readonly delivery: Delivery;
    }
  | {
      readonly kind: "storage-full";
      readonly preset: PresetId;
      readonly frameReached: number;
      readonly framesTotal: number;
      readonly missingBytes: number;
    }
  | { readonly kind: "failed"; readonly error: Error };

type ChooseState = Extract<ExportSheetState, { readonly kind: "choose" }>;

/**
 * The video export sheet's flow, from probing to the finished file (VIDEO_EXPORT.md, Sheet).
 * Closing it cancels a running export and discards a private file.
 */
export class VideoExportSession<Preview> {
  /** The latest frame the export drew, for the running sheet's preview. */
  onPreview: ((preview: Preview) => void) | null = null;
  readonly #subject: ExportSubject;
  readonly #ports: VideoExportPorts<Preview>;
  readonly #listeners = new Set<(state: ExportSheetState) => void>();
  readonly #closed = new AbortController();
  #state: ExportSheetState = { kind: "probing" };
  #capabilities: Extract<ExportCapabilities, { readonly supported: true }> | null = null;
  #freeBytes: number | null = null;
  #target: ExportTarget | null = null;
  #awake: { release(): void } | null = null;

  constructor(subject: ExportSubject, ports: VideoExportPorts<Preview>) {
    this.#subject = subject;
    this.#ports = ports;
  }

  get state(): ExportSheetState {
    return this.#state;
  }

  get subject(): ExportSubject {
    return this.#subject;
  }

  /** The file's rough size with `preset`, from the bitrates. */
  estimate(preset: PresetId): number {
    return estimatedBytes(presetById(preset), this.#subject.durationMs, this.#subject.withMusic);
  }

  /** The listener gets the current state at once, then every change. */
  subscribe(listener: (state: ExportSheetState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  async open(): Promise<void> {
    const ports = this.#ports;
    let capabilities: ExportCapabilities;
    try {
      [capabilities, this.#freeBytes] = await Promise.all([
        ports.probe(this.#subject.withMusic),
        // A picked file is not the browser's storage, so only a private one is measured.
        ports.canPickSaveFile() ? null : ports.freeBytes(),
      ]);
    } catch (error: unknown) {
      this.#fail(error);
      return;
    }
    if (!capabilities.supported) {
      this.#set({ kind: "unsupported", reason: capabilities.reason });
      return;
    }
    this.#capabilities = capabilities;
    this.#choose(capabilities.defaultPreset);
  }

  select(preset: PresetId): void {
    if (this.#state.kind === "choose" && this.#state.available.includes(preset)) {
      this.#choose(preset);
    }
  }

  /** "Video erstellen"; call it in the click, since the save picker needs its user gesture. */
  async start(): Promise<void> {
    const choice = this.#state;
    if (choice.kind !== "choose" || choice.starting) {
      return;
    }
    this.#set({ ...choice, starting: true });
    const fileName = exportFileName(this.#subject.title, choice.preset);
    let target: ExportTarget | null;
    try {
      target = this.#ports.canPickSaveFile()
        ? await this.#ports.pickSaveTarget(fileName)
        : await this.#ports.privateExportTarget(fileName);
    } catch (error: unknown) {
      this.#fail(error);
      return;
    }
    if (target === null) {
      this.#set({ ...choice, starting: false });
      return;
    }
    if (this.#closed.signal.aborted) {
      await this.#discardPrivate(target);
      return;
    }
    this.#target = target;
    await this.#run(choice, target);
  }

  /** After the storage ran out: choose again, the smallest preset selected. */
  backToChoose(): void {
    if (this.#state.kind === "storage-full" && this.#capabilities !== null) {
      this.#choose(
        this.#capabilities.available.includes(SMALLEST_PRESET)
          ? SMALLEST_PRESET
          : this.#capabilities.defaultPreset,
      );
    }
  }

  /** "Teilen …" or "Herunterladen" for a finished private file. */
  async deliver(): Promise<void> {
    const state = this.#state;
    if (state.kind !== "done") {
      return;
    }
    if (state.delivery === "download") {
      this.#ports.download(state.file);
    } else if (state.delivery === "share") {
      await this.#ports.share(state.file).catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === SHARE_DISMISSED)) {
          this.#ports.log(error);
        }
      });
    }
  }

  /** Cancels a running export at once; a finished private file is discarded. */
  close(): void {
    if (this.#closed.signal.aborted) {
      return;
    }
    this.#closed.abort();
    this.#releaseScreen();
    if (this.#state.kind === "done" && this.#target !== null) {
      void this.#discardPrivate(this.#target);
    }
  }

  async #run(choice: ChooseState, target: ExportTarget): Promise<void> {
    const framesTotal = frameCount(this.#subject.durationMs);
    this.#set({
      kind: "running",
      preset: choice.preset,
      framesDone: 0,
      framesTotal,
      remainingMs: null,
    });
    this.#awake = this.#ports.keepScreenAwake();
    let result: VideoExportResult;
    try {
      result = await this.#ports.run({
        preset: choice.preset,
        audioCodec: choice.audioCodec,
        target,
        signal: this.#closed.signal,
        onProgress: (progress, preview) => {
          if (this.#state.kind === "running") {
            this.#set({ ...this.#state, ...progress });
          }
          this.onPreview?.(preview);
        },
      });
    } catch (error: unknown) {
      // The export never rejects for its own failures, so this one came before it began.
      await this.#discardPrivate(target);
      this.#fail(error);
      return;
    } finally {
      this.#releaseScreen();
    }
    if (this.#closed.signal.aborted) {
      if (result.kind === "done") {
        await this.#discardPrivate(target);
      }
      return;
    }
    this.#finish(choice.preset, framesTotal, target, result);
  }

  #finish(
    preset: PresetId,
    framesTotal: number,
    target: ExportTarget,
    result: VideoExportResult,
  ): void {
    switch (result.kind) {
      case "done":
        this.#set({
          kind: "done",
          preset,
          file: result.file,
          delivery: this.#delivery(target, result.file),
        });
        return;
      case "storage-full": {
        const estimate = this.estimate(preset);
        this.#set({
          kind: "storage-full",
          preset,
          frameReached: result.frameReached,
          framesTotal,
          missingBytes: estimate * (1 - result.frameReached / framesTotal),
        });
        return;
      }
      case "failed":
        this.#fail(result.error);
        return;
      case "cancelled":
        // Only closing the sheet cancels, and a closed sheet shows nothing.
        return;
    }
  }

  #delivery(target: ExportTarget, file: File): Delivery {
    if (target.kind === "picked") {
      return "saved";
    }
    return this.#ports.canShare(file) ? "share" : "download";
  }

  #choose(preset: PresetId): void {
    const capabilities = this.#capabilities;
    if (capabilities === null) {
      throw new Error("the sheet chooses a preset only once the browser was probed");
    }
    this.#set({
      kind: "choose",
      available: capabilities.available,
      preset,
      audioCodec: capabilities.audioCodec,
      spaceShortage: this.#spaceShortage(preset, capabilities.available),
      starting: false,
    });
  }

  #spaceShortage(preset: PresetId, available: readonly PresetId[]): SpaceShortage | null {
    const freeBytes = this.#freeBytes;
    const neededBytes = this.estimate(preset);
    if (freeBytes === null || freeBytes >= neededBytes) {
      return null;
    }
    const fitting =
      VIDEO_PRESETS.filter(
        ({ id }) => id !== preset && available.includes(id) && this.estimate(id) <= freeBytes,
      ).at(-1)?.id ?? null;
    return { freeBytes, neededBytes, fitting };
  }

  #fail(error: unknown): void {
    this.#ports.log(error);
    this.#set({ kind: "failed", error: error instanceof Error ? error : new Error(String(error)) });
  }

  #releaseScreen(): void {
    this.#awake?.release();
    this.#awake = null;
  }

  /** Never rejects: a file left behind is swept at the next app start. */
  async #discardPrivate(target: ExportTarget): Promise<void> {
    if (target.kind === "private") {
      await target.discard().catch((error: unknown) => this.#ports.log(error));
    }
  }

  #set(state: ExportSheetState): void {
    this.#state = state;
    for (const listener of this.#listeners) {
      listener(state);
    }
  }
}
