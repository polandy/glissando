import { describe, expect, it } from "vitest";
import { estimatePageBytes, playerBundleBytes } from "../../html-export/plan";
import { FAKE_BUNDLE } from "../../html-export/testing/fakes";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { createTranslator } from "../i18n/translator";
import { slideshowHtmlExport } from "./slideshow-html-export";
import { fakeHtmlExportDevice } from "./testing/fake-html-export-ports";

const STORED: StoredSlideshow = {
  id: "s1",
  title: "Sommer",
  createdAt: "2025-07-12T10:00:00Z",
  secondsPerPicture: 5,
  pictures: [
    { id: "a", capturedAt: "2025-07-12T10:00:00Z", width: 3840, height: 2160, fileName: "a.jpg" },
    { id: "b", capturedAt: "2025-07-12T11:00:00Z", width: 1000, height: 800, fileName: "b.jpg" },
  ],
  music: { id: "m", fileName: "m.mp3", durationMs: 60_000, mimeType: "audio/mpeg" },
};

async function storeWithMedia(): Promise<MemoryLibraryStore> {
  const store = new MemoryLibraryStore();
  const thumbnail = new Blob(["t"]);
  await store.putPicture("a", { display: new Blob(["a".repeat(900)]), thumbnail });
  await store.putPicture("b", { display: new Blob(["b".repeat(300)]), thumbnail });
  await store.putMusic("m", new Blob(["m".repeat(500)]));
  return store;
}

describe("slideshowHtmlExport", () => {
  it("estimates from the stored display pictures' and the music's bytes and the player bundle", async () => {
    const sheet = slideshowHtmlExport(
      fakeHtmlExportDevice(),
      await storeWithMedia(),
      STORED,
      createTranslator("de"),
    );

    await sheet.open();

    const weights = {
      pictures: [
        { width: 3840, height: 2160, bytes: 900 },
        { width: 1000, height: 800, bytes: 300 },
      ],
      musicBytes: 500,
      pageBytes: playerBundleBytes(FAKE_BUNDLE),
    };
    expect(sheet.state).toMatchObject({
      kind: "choose",
      estimates: {
        small: estimatePageBytes(weights, "small"),
        "4k": estimatePageBytes(weights, "4k"),
      },
    });
  });

  it("writes the page in the translator's language at the time of the run", async () => {
    const ports = fakeHtmlExportDevice();
    const sheet = slideshowHtmlExport(
      ports,
      await storeWithMedia(),
      STORED,
      createTranslator("en"),
    );
    await sheet.open();

    await sheet.start();

    expect(sheet.state.kind).toBe("done");
    const page = sheet.state.kind === "done" ? await sheet.state.file.text() : "";
    expect(page).toContain('<html lang="en">');
    expect(page).toContain("2 pictures · 1:00 · with music");
  });
});
