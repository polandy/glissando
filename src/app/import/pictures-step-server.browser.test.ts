import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { ImmichAvailabilityState } from "../../immich/immich-availability";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { fakeRemovalPorts } from "../testing/picture-intake-ports";
import type { SlideshowHome } from "../../server-library/server-library-memory";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { ImportSession } from "./import-session";
import PicturesStep from "./PicturesStep.svelte";

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
});

const AVAILABLE: ImmichAvailabilityState = { kind: "available", version: "3.3.1", albumCount: 2 };
const PHOTO = { id: "asset-1", fileName: "a.jpg", takenAt: "2025-07-01T10:00:00Z", size: null };

function session(): ImportSession {
  let nextId = 1;
  return new ImportSession({
    store: new MemoryLibraryStore(),
    ...fakeRemovalPorts(),
    decode: (file) =>
      Promise.resolve({
        width: 300,
        height: 200,
        display: new Blob([file.name]),
        thumbnail: new Blob([file.name]),
      }),
    captureDate: () => Promise.resolve("2025-07-01T10:00:00Z"),
    immichSource: () => {
      throw new Error("no Immich download in this test");
    },
    probeMusic: () => Promise.reject(new Error("no music in this test")),
    createOnServer: () => Promise.reject(new Error("no server in this test")),
    newId: () => `id-${nextId++}`,
    now: () => new Date(0),
    onError: () => undefined,
    log: () => undefined,
  });
}

function mountStep(
  serverOn: boolean,
  rememberedHome: SlideshowHome = "device",
  importSession = session(),
) {
  const chosen: SlideshowHome[] = [];
  const step = mountWithTranslator(
    PicturesStep,
    {
      session: importSession,
      loadThumbnail: () => Promise.resolve(new Blob()),
      onError: () => undefined,
      onLeave: () => undefined,
      onNext: () => undefined,
      onDiscard: () => undefined,
      onOpenFile: () => undefined,
      notice: null,
      onDismissNotice: () => undefined,
      onReload: () => undefined,
      immich: AVAILABLE,
      onOpenImmich: () => undefined,
      onImmichSettings: () => undefined,
      serverOn,
      rememberedHome,
      onHomeChosen: (home: SlideshowHome) => chosen.push(home),
    },
    { current: createTranslator("en") },
  );
  unmounts.push(step.destroy);
  const option = (label: string) =>
    [...step.target.querySelectorAll<HTMLButtonElement>(".where button")].find((b) =>
      b.textContent.includes(label),
    );
  return { target: step.target, session: importSession, chosen, option };
}

describe("PicturesStep, where a new slideshow lives", () => {
  it("asks nothing while the server library is off, even if the server was chosen before", () => {
    const { target, session } = mountStep(false, "server");

    expect(target.textContent).toContain("From Immich");
    expect(target.textContent).not.toContain("Where should it live?");
    expect(session.choices.current().home).toBe("device");
  });

  it("starts on the choice this device remembers while the server library is on", () => {
    const { option, session } = mountStep(true, "server");

    expect(option("Glissando server")?.getAttribute("aria-pressed")).toBe("true");
    expect(option("This device")?.getAttribute("aria-pressed")).toBe("false");
    expect(session.choices.current().home).toBe("server");
  });

  it("remembers a choice and puts Immich first for the server, the device's pictures disabled", () => {
    const { target, option, chosen } = mountStep(true);

    option("Glissando server")?.click();
    flushSync();

    expect(chosen).toEqual(["server"]);
    const text = target.textContent;
    expect(text.indexOf("From Immich")).toBeLessThan(text.indexOf("Pictures from this device"));
    expect(text).toContain("A server slideshow only links photos from Immich.");
    expect(target.querySelector(".immich-first .btn.primary")?.textContent).toContain(
      "Open Immich",
    );
    expect(text).not.toContain("Choose pictures");
  });

  it("fixes the choice once a picture is linked, and says the pictures stay in Immich", () => {
    const { target, option, session } = mountStep(true, "server");

    session.addImmichPhotos([PHOTO]);
    flushSync();

    expect(option("This device")?.disabled).toBe(true);
    expect(option("Glissando server")?.disabled).toBe(true);
    expect(target.textContent).toContain(
      "Chosen for this slideshow. Clear the pictures to change it.",
    );
    expect(target.querySelector(".notice.mint")?.textContent).toContain(
      "Linked from Immich. Nothing is downloaded now",
    );
  });
});
