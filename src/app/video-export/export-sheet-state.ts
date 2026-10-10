import type {
  AudioCodecChoice,
  ExportCapabilities,
  ExportProgress,
  ExportTarget,
  PresetId,
  UnsupportedReason,
  VideoExportResult,
} from "../../video-export";

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
  /** A server slideshow's pictures, downloaded from Immich only as the video is made. */
  readonly picturesFromImmich: boolean;
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
