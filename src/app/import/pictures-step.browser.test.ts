import { noVideoClips } from "./testing/import-session-fixtures";
import { flushSync } from "svelte";
import { FakePictureChecker } from "../../culling/testing/fake-picture-checker";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { FakeDecoder } from "../../import/testing/picture-import-fixtures";
import { createTranslator } from "../i18n/translator";
import { fakeRemovalPorts, fakeStoppedPickText, pictureFile } from "../testing/picture-intake-ports";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { ImportSession } from "./import-session";
import PicturesStep from "./PicturesStep.svelte";

const de = createTranslator("de");

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
  immich: { kind: "notSetUp" },
  onOpenImmich: () => undefined,
  onImmichSettings: () => undefined,
} as const;

/** A session whose import stores "a.jpg" and fails unexpectedly on any other file. */
function failingSession(): ImportSession {
  let nextId = 1;
  return new ImportSession({
    store: new MemoryLibraryStore(),
    ...fakeRemovalPorts(),
    stoppedPickText: fakeStoppedPickText,
    checker: new FakePictureChecker(),
    random: () => 0,
    pixels: () => Promise.resolve([]),
    immichColours: () => Promise.resolve({ veil: "#404040", accent: "#C0C0C0" }),
    decode: (file) =>
      Promise.resolve({
        width: 300,
        height: 200,
        display: new Blob([file.name]),
        thumbnail: new Blob([file.name]),
      }),
    videoClips: noVideoClips,
    captureDate: (file) =>
      file.name === "a.jpg"
        ? Promise.resolve("2025-07-01T10:00:00Z")
        : Promise.reject(new Error("the disk went away")),
    immichSource: () => {
      throw new Error("no Immich in this test");
    },
    probeMusic: () => Promise.reject(new Error("no music in this test")),
    convertMusic: () => Promise.reject(new Error("no music in this test")),
    createOnServer: () => Promise.reject(new Error("no server in this test")),
    newId: () => `id-${nextId++}`,
    now: () => new Date(0),
    onError: () => undefined,
    log: () => undefined,
  });
}

/** A session that decodes every picture with the given decoder, never fails. */
function workingSession(decoder: FakeDecoder): ImportSession {
  let nextId = 1;
  return new ImportSession({
    store: new MemoryLibraryStore(),
    ...fakeRemovalPorts(),
    stoppedPickText: fakeStoppedPickText,
    checker: new FakePictureChecker(),
    random: () => 0,
    pixels: () => Promise.resolve([]),
    immichColours: () => Promise.resolve({ veil: "#404040", accent: "#C0C0C0" }),
    decode: decoder.decode,
    videoClips: noVideoClips,
    captureDate: () => Promise.resolve("2025-07-01T10:00:00Z"),
    immichSource: () => {
      throw new Error("no Immich in this test");
    },
    probeMusic: () => Promise.reject(new Error("no music in this test")),
    convertMusic: () => Promise.reject(new Error("no music in this test")),
    createOnServer: () => Promise.reject(new Error("no server in this test")),
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
      loadPicture: () => Promise.resolve(new Blob()),
      serverOn: false,
      rememberedHome: "device",
      onHomeChosen: () => undefined,
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
    expect(buttons).not.toContain("Medien auswählen");

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
      loadPicture: () => Promise.resolve(new Blob()),
      serverOn: false,
      rememberedHome: "device",
      onHomeChosen: () => undefined,
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

describe("PicturesStep's footer reason", () => {
  it("names how many pictures are left to import while Next stays disabled", async () => {
    const decoder = new FakeDecoder();
    const session = workingSession(decoder);
    const step = mountWithTranslator(PicturesStep, {
      session,
      loadThumbnail: () => Promise.resolve(new Blob()),
      loadPicture: () => Promise.resolve(new Blob()),
      serverOn: false,
      rememberedHome: "device",
      onHomeChosen: () => undefined,
      onError: () => undefined,
      onLeave: () => undefined,
      onNext: () => undefined,
      onDiscard: () => undefined,
      ...noFileOpening,
    });
    unmounts.push(step.destroy);
    decoder.hold();

    session.addPictures([
      pictureFile("a.jpg", "2025-07-01T10:00:00Z"),
      pictureFile("b.jpg", "2025-07-02T10:00:00Z"),
    ]);
    flushSync();

    expect(step.target.querySelector(".blocked-reason")?.textContent).toBe(
      de.t("import.blockedImporting", { count: 2 }),
    );
    const next = [...step.target.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === de.t("common.next"),
    );
    expect(next?.disabled).toBe(true);

    decoder.open();
    await session.reported();
    await session.intake.culling.settled();
    flushSync();
    expect(step.target.querySelector(".blocked-reason")).toBeNull();
  });
});
