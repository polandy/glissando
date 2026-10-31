import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { createTranslator } from "../i18n/translator";
import type { Navigator } from "../navigation/navigator";
import type { Route } from "../navigation/route";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { Toaster } from "../toast/toaster";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import ImportRoute from "./ImportRoute.svelte";
import { sessionWith, withTwoPictures } from "./testing/import-session-fixtures";
import type { ImportSession } from "./import-session";

const de = createTranslator("de");
const START: Route = { screen: "start" };
const IMMICH: Route = { screen: "immich", albumId: null, slideshowId: null };

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
});

function mountRoute(session: ImportSession) {
  const guards: Parameters<Navigator["guardLeave"]>[0][] = [];
  const discards: boolean[] = [];
  const route = mountWithTranslator(ImportRoute, {
    step: "pictures",
    session,
    loadThumbnail: () => Promise.resolve(new Blob()),
    loadPicture: () => Promise.resolve(new Blob()),
    onError: () => undefined,
    onToMusic: () => undefined,
    onBack: () => undefined,
    onDiscard: (leave: boolean) => discards.push(leave),
    onCreated: () => undefined,
    onOpenFile: () => undefined,
    notice: null,
    onDismissNotice: () => undefined,
    onReload: () => undefined,
    immich: { kind: "notSetUp" },
    onOpenImmich: () => undefined,
    onImmichSettings: () => undefined,
    serverOn: false,
    rememberedHome: "device",
    onHomeChosen: () => undefined,
    onCreateFailed: () => undefined,
    toaster: new Toaster(new FakeScheduler()),
    guardLeave: (guard: Parameters<Navigator["guardLeave"]>[0]) => {
      guards.push(guard);
      return () => undefined;
    },
  });
  unmounts.push(route.destroy);
  const guard = guards.at(-1);
  if (guard === undefined) throw new Error("the route registered no leave guard");
  return { guard, discards, target: route.target };
}

function dialogButton(label: string): HTMLButtonElement {
  const found = [...document.querySelectorAll<HTMLButtonElement>("dialog button")].find(
    (candidate) => candidate.textContent.trim() === label,
  );
  if (found === undefined) throw new Error(`no dialog button "${label}"`);
  return found;
}

describe("ImportRoute leave guard (UX-23)", () => {
  it("refuses to leave with pictures chosen and asks Auswahl entfernen?", async () => {
    const { session } = await withTwoPictures();
    const { guard } = mountRoute(session);

    const allowed = guard(START);
    flushSync();

    expect(allowed).toBe(false);
    expect(document.querySelector("dialog h3")?.textContent).toBe(de.t("import.discardTitle"));
  });

  it("keeps the pictures when the dialog says Weiter auswählen", async () => {
    const { session } = await withTwoPictures();
    const { guard } = mountRoute(session);
    guard(START);
    flushSync();

    dialogButton(de.t("import.keepChoosing")).click();
    flushSync();

    expect(document.querySelector("dialog")).toBeNull();
    expect(session.pictures.state.pictures).toHaveLength(2);
  });

  it("lets a move to the Immich browser through without asking", async () => {
    const { session } = await withTwoPictures();
    const { guard, target } = mountRoute(session);

    const allowed = guard(IMMICH);
    flushSync();

    expect(allowed).toBe(true);
    expect(document.querySelector("dialog")).toBeNull();
    expect(target.textContent).toContain(de.t("import.picturesTitle"));
  });

  it("lets a move away through when nothing is chosen", () => {
    const { guard } = mountRoute(sessionWith().session);

    expect(guard(START)).toBe(true);
    expect(document.querySelector("dialog")).toBeNull();
  });

  it("discards and leaves on Entfernen, after which the guard lets the back move pass", async () => {
    const { session } = await withTwoPictures();
    const { guard, discards } = mountRoute(session);
    guard(START);
    flushSync();

    dialogButton(de.t("import.discard")).click();
    flushSync();
    void session.discard();

    expect(discards).toEqual([true]);
    expect(guard(START)).toBe(true);
  });
});
