import type {
  ExportCapabilities,
  ExportTarget,
  PresetId,
  VideoExportResult,
} from "../../video-export";
import type { Delivery, ExportSheetState, VideoExportPorts } from "./export-sheet-state";
import { spaceShortage } from "./space-shortage";

type SupportedCapabilities = Extract<ExportCapabilities, { readonly supported: true }>;
type ChooseState = Extract<ExportSheetState, { readonly kind: "choose" }>;

/** What probing the browser found: a state that ends the sheet, or what the sheet chooses from. */
export type BrowserProbe =
  | { readonly kind: "ended"; readonly state: ExportSheetState }
  | {
      readonly kind: "supported";
      readonly capabilities: SupportedCapabilities;
      readonly freeBytes: number | null;
    };

/** Probes the browser, the free storage and the clips; rejects if the probe itself fails. */
export async function probeBrowser<Preview>(
  ports: VideoExportPorts<Preview>,
  withAudio: boolean,
): Promise<BrowserProbe> {
  const [capabilities, freeBytes] = await Promise.all([
    ports.probe(withAudio),
    // A picked file is not the browser's storage, so only a private one is measured.
    ports.canPickSaveFile() ? null : ports.freeBytes(),
  ]);
  if (!capabilities.supported) {
    return { kind: "ended", state: { kind: "unsupported", reason: capabilities.reason } };
  }
  const clip = await ports.undecodableClip().catch((error: unknown) => {
    // An unreadable clip is no verdict on the browser; the run itself fails loud if it must.
    ports.log(error);
    return null;
  });
  if (clip !== null) return { kind: "ended", state: { kind: "clip-unsupported", clip } };
  return { kind: "supported", capabilities, freeBytes };
}

/** The sheet offering `preset` among what the browser can do. */
export function chooseState(
  capabilities: SupportedCapabilities,
  preset: PresetId,
  freeBytes: number | null,
  estimate: (preset: PresetId) => number,
): ChooseState {
  return {
    kind: "choose",
    available: capabilities.available,
    preset,
    audioCodec: capabilities.audioCodec,
    spaceShortage: spaceShortage(preset, capabilities.available, freeBytes, estimate),
    starting: false,
  };
}

/** How a finished file reaches the user: saved where picked, else shared or downloaded. */
export function deliveryOf(target: ExportTarget, canShare: boolean): Delivery {
  if (target.kind === "picked") {
    return "saved";
  }
  return canShare ? "share" : "download";
}

/** The sheet's state for an error, whatever was thrown. */
export function failedState(error: unknown): ExportSheetState {
  return { kind: "failed", error: error instanceof Error ? error : new Error(String(error)) };
}

interface EndedRun {
  readonly preset: PresetId;
  readonly framesTotal: number;
  /** The whole file's rough size with `preset`. */
  readonly estimate: number;
  readonly delivery: (file: File) => Delivery;
  readonly result: VideoExportResult;
}

/** The sheet's state after an export ended; null after a cancel, which only closing the sheet causes. */
export function outcomeState(run: EndedRun): ExportSheetState | null {
  const { preset, framesTotal, result } = run;
  switch (result.kind) {
    case "done":
      return { kind: "done", preset, file: result.file, delivery: run.delivery(result.file) };
    case "storage-full":
      return {
        kind: "storage-full",
        preset,
        frameReached: result.frameReached,
        framesTotal,
        missingBytes: run.estimate * (1 - result.frameReached / framesTotal),
      };
    case "failed":
      return failedState(result.error);
    case "cancelled":
      return null;
  }
}
