/**
 * The video export's public API for the app (VIDEO_EXPORT.md). The sheet:
 * 1. `probeVideoExport({ withMusic })` when it opens: unsupported (with a reason), or the
 *    available presets, the default one and the audio codec ("opus" warrants the Apple note).
 * 2. `estimatedBytes(presetById(id), durationMs, withMusic)` beside each preset; with a private
 *    target, compared with `navigator.storage.estimate()` for the space note.
 * 3. On "Video erstellen" (in the click's gesture): `canPickSaveFile()` ? `pickSaveTarget(name)`
 *    (null: dismissed, back to choose) : `privateExportTarget(name)`, with
 *    `exportFileName(title, presetId)`.
 * 4. `runVideoExport({...})` resolves with "done" (and the `File`), "cancelled", "storage-full"
 *    (`frameReached`; the file is discarded) or "failed".
 * 5. A private target's file is removed with `target.discard()` when the sheet closes, and
 *    `sweepPrivateExports()` runs once at app start.
 */
export {
  AUDIO_CODECS,
  probeCapabilities,
  type AudioCodecChoice,
  type ExportCapabilities,
  type UnsupportedReason,
} from "./capabilities";
export type { ExportProgress } from "./export-video";
export {
  DEFAULT_PRESET_ID,
  estimatedBytes,
  exportFileName,
  FRAMES_PER_SECOND,
  frameCount,
  PRESET_IDS,
  presetById,
  VIDEO_PRESETS,
  type PresetId,
  type VideoPreset,
} from "./plan";
export { browserCapabilityProbe } from "./browser/capability-probe";
export {
  canPickSaveFile,
  pickSaveTarget,
  privateExportTarget,
  sweepPrivateExports,
  type ExportTarget,
} from "./browser/file-targets";
export {
  runVideoExport,
  type RunVideoExportOptions,
  type VideoExportResult,
} from "./browser/run-video-export";
export { probeVideoExport } from "./browser/entry";
