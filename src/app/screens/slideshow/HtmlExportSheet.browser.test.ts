import { afterEach, describe, expect, it } from "vitest";
import { HtmlExportSession } from "../../html-export/html-export-session";
import { FakeHtmlExportPorts } from "../../html-export/testing/fake-html-export-ports";
import { createTranslator } from "../../i18n/translator";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import { buttonLabelled, sheetShows, sizeChoiceIsShown } from "./export-sheet/testing/sheet-dom";
import HtmlExportSheet from "./HtmlExportSheet.svelte";

const de = createTranslator("de");
const RAW = "picture 2 could not be read: ENOENT";

let destroy = () => {};
afterEach(() => destroy());

describe("the web page sheet after a failure", () => {
  it("says it in a sentence, keeps the raw error behind Show details, and Try again offers the sizes", async () => {
    const ports = new FakeHtmlExportPorts();
    const session = new HtmlExportSession(
      {
        title: "Sommer am See",
        durationMs: 10_000,
        withMusic: false,
        pictureCount: 3,
        picturesFromImmich: false,
        clipCount: 0,
      },
      ports,
    );
    const mounted = mountWithTranslator(HtmlExportSheet, {
      session,
      coverUrl: "",
      thumbnailUrls: [],
      onClose: () => {},
    });
    destroy = mounted.destroy;
    const target = mounted.target;
    (await buttonLabelled(target, de.t("htmlExport.start"))).click();
    await ports.nextRun();
    await ports.failRun(new Error(RAW));

    await sheetShows(target, de.t("exportErrors.unknownText"));
    expect(target.textContent).toContain(de.t("exportErrors.unknownPageTitle"));
    expect(target.textContent).not.toContain(RAW);

    (await buttonLabelled(target, de.t("exportErrors.showDetails"))).click();
    await sheetShows(target, RAW);

    (await buttonLabelled(target, de.t("exportErrors.tryAgain"))).click();
    await buttonLabelled(target, de.t("htmlExport.start"));
    expect(sizeChoiceIsShown(target)).toBe(true);
    expect(target.textContent).not.toContain(RAW);
  });
});
