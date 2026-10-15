import type { ExportSheetState } from "./export-sheet-state";
import { FakeExportPorts, type FakePreview } from "./testing/fake-export-ports";
import { VideoExportSession } from "./video-export-session";

const TITLE = "Sommer am See";
/** 10 s: 300 frames. */
export const DURATION_MS = 10_000;
export const FRAMES = 300;

export function session(ports: FakeExportPorts, withMusic = true): VideoExportSession<FakePreview> {
  return new VideoExportSession(
    { title: TITLE, durationMs: DURATION_MS, withMusic, withAudio: withMusic },
    ports,
  );
}

export async function opened(ports = new FakeExportPorts(), withMusic = true) {
  const sheet = session(ports, withMusic);
  await sheet.open();
  return sheet;
}

/** Starts the export and waits until it runs; `ended` settles once its outcome is shown. */
export async function running(ports: FakeExportPorts, sheet: VideoExportSession<FakePreview>) {
  const ended = sheet.start();
  const run = await ports.nextRun();
  return { ended, run };
}

export function kindOf(state: ExportSheetState): string {
  return state.kind;
}
