import { HtmlExportSession } from "./html-export-session";
import { FakeHtmlExportPorts } from "./testing/fake-html-export-ports";

export const TITLE = "Sommer am See";
export const FILE_NAME = "Sommer am See.html";
export const DURATION_MS = 10_000;
export const PICTURES = 3;

export function session(
  ports: FakeHtmlExportPorts,
  withMusic = true,
  picturesFromImmich = false,
  clipCount = 0,
): HtmlExportSession {
  return new HtmlExportSession(
    {
      title: TITLE,
      durationMs: DURATION_MS,
      withMusic,
      pictureCount: PICTURES,
      picturesFromImmich,
      clipCount,
    },
    ports,
  );
}

export async function opened(ports = new FakeHtmlExportPorts(), clipCount = 0) {
  const sheet = session(ports, true, false, clipCount);
  await sheet.open();
  return sheet;
}

/** Starts the export and waits until it runs; `ended` settles once its outcome is shown. */
export async function running(ports: FakeHtmlExportPorts, sheet: HtmlExportSession) {
  const ended = sheet.start();
  const run = await ports.nextRun();
  return { ended, run };
}
