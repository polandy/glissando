import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { ImportSession } from "./import-session";
import PicturesStep from "./PicturesStep.svelte";

const picture = (name: string): File => new File([name], name, { type: "image/jpeg" });

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) {
    unmount();
  }
  unmounts = [];
});

const noFileOpening = {
  onOpenFile: () => undefined,
  notice: null,
  onDismissNotice: () => undefined,
  onReload: () => undefined,
};

/** A session whose import stores "a.jpg" and fails unexpectedly on any other file. */
function failingSession(): ImportSession {
  let nextId = 1;
  return new ImportSession({
    store: new MemoryLibraryStore(),
    decode: (file) =>
      Promise.resolve({
        width: 300,
        height: 200,
        display: new Blob([file.name]),
        thumbnail: new Blob([file.name]),
      }),
    captureDate: (file) =>
      file.name === "a.jpg"
        ? Promise.resolve("2025-07-01T10:00:00Z")
        : Promise.reject(new Error("the disk went away")),
    probeMusic: () => Promise.reject(new Error("no music in this test")),
    newId: () => `id-${nextId++}`,
    now: () => new Date(0),
    onError: () => undefined,
    log: () => undefined,
  });
}

describe("PicturesStep after a failed import", () => {
  it("shows the failure with Start over instead of letting more files be added", async () => {
    const session = failingSession();
    const discards: string[] = [];
    const step = mountWithTranslator(PicturesStep, {
      session,
      loadThumbnail: () => Promise.resolve(new Blob()),
      onError: () => undefined,
      onLeave: () => undefined,
      onNext: () => undefined,
      onDiscard: () => discards.push("discard"),
      ...noFileOpening,
    });
    unmounts.push(step.destroy);

    session.addPictures([picture("a.jpg"), picture("b.jpg")]);
    await session.reported();
    flushSync();

    const notice = step.target.querySelector(".notice.error");
    expect(notice).not.toBeNull();
    expect(notice?.textContent).toContain("Der Import ist fehlgeschlagen.");
    expect(step.target.querySelector(".strip .tile")).not.toBeNull();
    const buttons = [...step.target.querySelectorAll("button")].map((button) =>
      button.textContent.trim(),
    );
    expect(buttons).toContain("Neu starten");
    expect(buttons).not.toContain("mehr hinzufügen");
    expect(buttons).not.toContain("Bilder auswählen");

    const startOver = [...(notice?.querySelectorAll("button") ?? [])].find(
      (button) => button.textContent === "Neu starten",
    );
    startOver?.click();
    expect(discards).toEqual(["discard"]);
  });
});

describe("PicturesStep and .glissando files", () => {
  function mountStep(onOpenFile: (file: File) => void, session = failingSession()) {
    const step = mountWithTranslator(PicturesStep, {
      session,
      loadThumbnail: () => Promise.resolve(new Blob()),
      onError: () => undefined,
      onLeave: () => undefined,
      onNext: () => undefined,
      onDiscard: () => undefined,
      ...noFileOpening,
      onOpenFile,
    });
    unmounts.push(step.destroy);
    return step.target;
  }

  it("offers to open a slideshow from another device below the drop zone", () => {
    const target = mountStep(() => undefined);

    expect(target.textContent).toContain("Diashow von einem anderen Gerät?");
    expect([...target.querySelectorAll("button")].map((b) => b.textContent.trim())).toContain(
      "Datei öffnen",
    );
  });
});
