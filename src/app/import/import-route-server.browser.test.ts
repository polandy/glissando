import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { fakeRemovalPorts } from "../testing/picture-intake-ports";
import { ServerLibraryUnavailableError } from "../../server-library/server-library-client";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { ImportSession, type ImportSessionPorts } from "./import-session";
import ImportRoute from "./ImportRoute.svelte";

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
});

const PHOTO = { id: "asset-1", fileName: "a.jpg", takenAt: "2025-07-01T10:00:00Z", size: null };

function session(createOnServer: ImportSessionPorts["createOnServer"]): ImportSession {
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
    createOnServer,
    newId: () => `id-${nextId++}`,
    now: () => new Date(0),
    onError: () => undefined,
    log: () => undefined,
  });
}

function mountMusicStep(importSession: ImportSession) {
  const failed: (() => void)[] = [];
  const created: string[] = [];
  let told = () => {};
  const toldFailure = new Promise<void>((resolve) => (told = resolve));
  const route = mountWithTranslator(
    ImportRoute,
    {
      step: "music",
      session: importSession,
      loadThumbnail: () => Promise.resolve(new Blob()),
      onError: (error: unknown) => {
        throw error;
      },
      onMusicUnreadable: () => undefined,
      onToMusic: () => undefined,
      onBack: () => undefined,
      onDiscard: () => undefined,
      onCreated: (slideshow: { id: string }) => created.push(slideshow.id),
      onOpenFile: () => undefined,
      notice: null,
      onDismissNotice: () => undefined,
      onReload: () => undefined,
      immich: { kind: "available", version: "3.3.1", albumCount: 1 },
      onOpenImmich: () => undefined,
      onImmichSettings: () => undefined,
      serverOn: true,
      rememberedHome: "server",
      onHomeChosen: () => undefined,
      onCreateFailed: (retry: () => void) => {
        failed.push(retry);
        told();
      },
    },
    { current: createTranslator("en") },
  );
  unmounts.push(route.destroy);
  const createButton = () =>
    [...route.target.querySelectorAll("button")].find(
      (button) => button.textContent.trim() === "Create without music",
    );
  return { target: route.target, failed, created, toldFailure, createButton };
}

describe("ImportRoute, creating a server slideshow", () => {
  it("saves under the server's overlay, and tells a failure keeping the wizard to try again", async () => {
    let attempts = 0;
    const importSession = session(() => {
      attempts += 1;
      return Promise.reject(new ServerLibraryUnavailableError("POST /slideshows"));
    });
    importSession.chooseHome("server");
    importSession.addImmichPhotos([PHOTO]);
    const { target, failed, created, toldFailure, createButton } = mountMusicStep(importSession);

    createButton()?.click();
    flushSync();
    expect(target.textContent).toContain("Saving on your Glissando server\u00a0…");
    await toldFailure;
    flushSync();

    expect(createButton()).toBeDefined();
    expect(created).toEqual([]);
    expect(importSession.pictures.state.pictures).toHaveLength(1);
    failed[0]?.();
    expect(attempts).toBe(2);
  });
});
