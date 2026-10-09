import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { ImmichAvailabilityState } from "../../immich/immich-availability";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { ImportSession } from "./import-session";
import PicturesStep from "./PicturesStep.svelte";

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
});

function session(): ImportSession {
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
    captureDate: () => Promise.resolve("2025-07-01T10:00:00Z"),
    immichSource: () => {
      throw new Error("no Immich download in this test");
    },
    probeMusic: () => Promise.reject(new Error("no music in this test")),
    newId: () => `id-${nextId++}`,
    now: () => new Date(0),
    onError: () => undefined,
    log: () => undefined,
  });
}

function mountStep(immich: ImmichAvailabilityState, importSession = session()) {
  const calls: string[] = [];
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
      immich,
      onOpenImmich: () => calls.push("open"),
      onImmichSettings: () => calls.push("settings"),
    },
    { current: createTranslator("en") },
  );
  unmounts.push(step.destroy);
  const button = (label: string) =>
    [...step.target.querySelectorAll("button")].find((b) => b.textContent.trim() === label);
  return { target: step.target, calls, button };
}

describe("PicturesStep, the Immich box", () => {
  it.each([[{ kind: "checking" }], [{ kind: "notSetUp" }]] as const)(
    "is hidden while Immich is %o, leaving the other device's box",
    (state) => {
      const { target } = mountStep(state);

      expect(target.textContent).toContain("Slideshow from another device?");
      expect(target.textContent).not.toContain("From Immich");
    },
  );

  it("opens Immich when available, above the other device's box", () => {
    const { target, calls, button } = mountStep({
      kind: "available",
      version: "3.3.1",
      albumCount: 2,
    });

    const text = target.textContent;
    expect(text.indexOf("From Immich")).toBeLessThan(
      text.indexOf("Slideshow from another device?"),
    );
    button("Open Immich")?.click();
    expect(calls).toEqual(["open"]);
  });

  it("greys Open Immich out offline and says why", () => {
    const { target, button } = mountStep({ kind: "offline" });

    expect(target.textContent).toContain("Offline — Immich needs a connection");
    expect(button("Open Immich")?.disabled).toBe(true);
  });

  it("names a problem and leads to the settings", () => {
    const { target, calls, button } = mountStep({ kind: "keyRejected" });

    expect(target.textContent).toContain("Immich rejects the server's key.");
    expect(button("Open Immich")).toBeUndefined();
    button("Settings")?.click();
    expect(calls).toEqual(["settings"]);
  });

  it("offers more from Immich next to add more once pictures are in", async () => {
    const importSession = session();
    const { calls, button } = mountStep(
      { kind: "available", version: "3.3.1", albumCount: 2 },
      importSession,
    );

    importSession.addPictures([new File(["a"], "a.jpg", { type: "image/jpeg" })]);
    await importSession.reported();
    flushSync();

    expect(button("add more")).toBeDefined();
    button("more from Immich")?.click();
    expect(calls).toEqual(["open"]);
  });
});
