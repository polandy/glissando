import { afterEach, describe, expect, it } from "vitest";
import { createTranslator } from "../../i18n/translator";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import { VideoExportSession } from "../../video-export/video-export-session";
import type { ExportPreview } from "../../video-export/slideshow-video-export";
import type { VideoExportPorts } from "../../video-export/export-sheet-state";
import { FakeExportPorts } from "../../video-export/testing/fake-export-ports";
import { buttonLabelled, sheetShows, sizeChoiceIsShown } from "./export-sheet/testing/sheet-dom";
import VideoExportSheet from "./VideoExportSheet.svelte";

const de = createTranslator("de");
const RAW = "encoder broke: code 0x80004005";

let destroy = () => {};
afterEach(() => destroy());

async function mountFailed(ports: FakeExportPorts, finish: () => void) {
  // The fake draws no canvas; only the preview handed to the sheet differs in type.
  const session = new VideoExportSession<ExportPreview>(
    { title: "Sommer am See", durationMs: 10_000, withMusic: false, withAudio: false },
    ports as unknown as VideoExportPorts<ExportPreview>,
  );
  const mounted = mountWithTranslator(VideoExportSheet, {
    session,
    coverUrl: "",
    onClose: () => {},
  });
  destroy = mounted.destroy;
  (await buttonLabelled(mounted.target, de.t("videoExport.start"))).click();
  await ports.nextRun();
  finish();
  return mounted.target;
}

describe("the video sheet after a failure", () => {
  it("says it in a sentence, keeps the raw error behind Show details, and Try again offers the sizes", async () => {
    const ports = new FakeExportPorts();
    const target = await mountFailed(ports, () =>
      ports.finish({ kind: "failed", error: new Error(RAW) }),
    );

    await sheetShows(target, de.t("exportErrors.unknownText"));
    expect(target.textContent).toContain(de.t("exportErrors.unknownVideoTitle"));
    expect(target.textContent).not.toContain(RAW);

    (await buttonLabelled(target, de.t("exportErrors.showDetails"))).click();
    await sheetShows(target, RAW);
    expect(target.querySelector('[aria-expanded="true"]')).not.toBeNull();

    (await buttonLabelled(target, de.t("exportErrors.tryAgain"))).click();
    await buttonLabelled(target, de.t("videoExport.start"));
    expect(sizeChoiceIsShown(target)).toBe(true);
    expect(target.textContent).not.toContain(RAW);
  });

  it("offers another size when the storage ran out, with the smallest selected", async () => {
    const ports = new FakeExportPorts();
    const target = await mountFailed(ports, () =>
      ports.finish({ kind: "storage-full", frameReached: 10 }),
    );

    await sheetShows(target, de.t("exportErrors.storageFullText"));
    expect(target.querySelector("code")).toBeNull();

    (await buttonLabelled(target, de.t("exportErrors.smallerSize"))).click();
    await buttonLabelled(target, de.t("videoExport.start"));
    const selected = target.querySelector('[role="radio"][aria-checked="true"]');
    expect(selected?.textContent).toContain(de.t("sizeScale.small"));
  });
});
