import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { createTranslator } from "../i18n/translator";
import type { Route } from "../navigation/route";
import { pictureFile } from "../testing/picture-intake-ports";
import type { AddPicturesSession } from "./add-pictures-session";
import { mountRoute, unmountRoutes } from "./testing/mount-add-route";

const de = createTranslator("de");
const SLIDESHOW: Route = { screen: "slideshow", slideshowId: "s1" };
const IMMICH: Route = { screen: "immich", albumId: null, slideshowId: "s1" };

afterEach(unmountRoutes);

async function choosePicture(session: AddPicturesSession): Promise<void> {
  session.intake.addPictures([pictureFile("new.jpg", "2025-07-02T10:00:00Z")]);
  await session.intake.settled();
  flushSync();
}

function dialogTitle(): string | undefined {
  return document.querySelector("dialog h3")?.textContent;
}

function dialogButton(label: string): HTMLButtonElement {
  const found = [...document.querySelectorAll<HTMLButtonElement>("dialog button")].find(
    (candidate) => candidate.textContent.trim() === label,
  );
  if (found === undefined) {
    throw new Error(`no dialog button "${label}"`);
  }
  return found;
}

function currentGuard(guards: ReturnType<typeof mountRoute>["guards"]) {
  const guard = guards.at(-1);
  if (guard === undefined) {
    throw new Error("the route registered no leave guard");
  }
  return guard;
}

describe("AddPicturesRoute leave guard (UX-23)", () => {
  it("refuses to leave with pictures chosen and asks Auswahl entfernen?", async () => {
    const { session, guards } = mountRoute();
    await choosePicture(session);

    const allowed = currentGuard(guards)(SLIDESHOW);
    flushSync();

    expect(allowed).toBe(false);
    expect(dialogTitle()).toBe(de.t("import.discardTitle"));
  });

  it("keeps the pictures when the dialog says Weiter auswählen", async () => {
    const { session, guards } = mountRoute();
    await choosePicture(session);
    currentGuard(guards)(SLIDESHOW);
    flushSync();

    dialogButton(de.t("import.keepChoosing")).click();
    flushSync();

    expect(document.querySelector("dialog")).toBeNull();
    expect(session.intake.pictures.state.pictures).toHaveLength(1);
  });

  it("lets a move to the Immich browser through without asking", async () => {
    const { session, guards, target } = mountRoute();
    await choosePicture(session);

    const allowed = currentGuard(guards)(IMMICH);
    flushSync();

    expect(allowed).toBe(true);
    expect(document.querySelector("dialog")).toBeNull();
    expect(target.textContent).toContain(de.t("add.title"));
  });

  it("lets a move away through when nothing is chosen", () => {
    const { guards } = mountRoute();

    expect(currentGuard(guards)(SLIDESHOW)).toBe(true);
    expect(document.querySelector("dialog")).toBeNull();
  });

  it("discards and leaves on Entfernen, after which the guard lets the back move pass", async () => {
    const { session, guards, discards } = mountRoute();
    await choosePicture(session);
    const guard = currentGuard(guards);
    guard(SLIDESHOW);
    flushSync();

    dialogButton(de.t("import.discard")).click();
    flushSync();
    session.intake.discard();

    expect(discards).toEqual([true]);
    expect(guard(SLIDESHOW)).toBe(true);
  });
});
