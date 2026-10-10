import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { picture, slideshow } from "../../library/testing/library-store-contract";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { createTranslator } from "../i18n/translator";
import type { SlideshowHome } from "../routes/slideshow-storage";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { fakeIntakePorts, pictureFile } from "../testing/picture-intake-ports";
import { AddPicturesSession } from "./add-pictures-session";
import AddPicturesRoute from "./AddPicturesRoute.svelte";

const de = createTranslator("de");
const SHOW: StoredSlideshow = slideshow({
  title: "Sommer am See",
  pictures: [{ ...picture("old-1"), capturedAt: "2025-07-01T10:00:00Z" }],
});

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) {
    unmount();
  }
  unmounts = [];
});

/** Settles when the test says so. */
function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((settle) => (resolve = settle));
  return { promise, resolve };
}

function mountRoute(
  shown: StoredSlideshow = SHOW,
  onCommit = () => Promise.resolve(),
  home: SlideshowHome = "device",
) {
  const store = new MemoryLibraryStore();
  const session = new AddPicturesSession(shown, home, { ...fakeIntakePorts(store).ports, store });
  const discards: boolean[] = [];
  const route = mountWithTranslator(AddPicturesRoute, {
    session,
    loadThumbnail: () => Promise.resolve(new Blob()),
    onError: () => undefined,
    onDiscard: (leave: boolean) => discards.push(leave),
    onCommit,
    immich: { kind: "notSetUp" },
    onOpenImmich: () => undefined,
    onImmichSettings: () => undefined,
  });
  unmounts.push(route.destroy);
  return { session, discards, target: route.target };
}

async function choosePicture(session: AddPicturesSession): Promise<void> {
  session.intake.addPictures([pictureFile("new.jpg", "2025-07-02T10:00:00Z")]);
  await session.intake.pictures.settled();
  flushSync();
}

function button(target: HTMLElement, label: string): HTMLButtonElement {
  const found = [...target.querySelectorAll<HTMLButtonElement>("button")].find(
    (candidate) => candidate.textContent.trim() === label || candidate.ariaLabel === label,
  );
  if (found === undefined) {
    throw new Error(`no button "${label}"`);
  }
  return found;
}

describe("AddPicturesRoute, adding to a server slideshow", () => {
  it("takes pictures from Immich only, the device's pictures shown as off", () => {
    const { target } = mountRoute(SHOW, undefined, "server");

    expect(target.querySelector(".device-off")?.textContent).toContain(
      de.t("server.deviceDisabled"),
    );
    expect(target.textContent).not.toContain(de.t("import.pickPictures"));
  });

  it("says the pictures are linked, not downscaled", () => {
    const { target } = mountRoute(SHOW, undefined, "server");

    const lead = target.querySelector(".lead")?.textContent ?? "";
    expect(lead).toContain(de.t("add.leadByDate"));
    expect(lead).not.toContain(de.t("add.leadDownscale"));
  });
});

describe("AddPicturesRoute", () => {
  it.each([
    { order: "sorted by date", shown: SHOW, lead: de.t("add.leadByDate") },
    { order: "own", shown: { ...SHOW, ownOrder: true as const }, lead: de.t("add.leadOwnOrder") },
  ])("tells where the pictures go with the order $order", ({ shown, lead }) => {
    const { target } = mountRoute(shown);

    const text = target.querySelector(".lead")?.textContent ?? "";
    expect(text).toContain(lead);
    expect(text).toContain(de.t("add.leadDownscale"));
  });

  it("keeps Add disabled while a picture is still being downscaled", async () => {
    const { session, target } = mountRoute();

    session.intake.addPictures([pictureFile("new.jpg", "2025-07-02T10:00:00Z")]);
    flushSync();

    expect(button(target, de.t("add.titleShort")).disabled).toBe(true);
    await session.intake.pictures.settled();
    flushSync();
    expect(button(target, de.t("add.add", { count: 1 })).disabled).toBe(false);
  });

  it("disables Add n, Cancel and back while the pictures are being added", async () => {
    const commit = deferred();
    const { session, target } = mountRoute(SHOW, () => commit.promise);
    await choosePicture(session);
    const add = button(target, de.t("add.add", { count: 1 }));
    expect(add.disabled).toBe(false);

    add.click();
    flushSync();

    expect(add.disabled).toBe(true);
    expect(button(target, de.t("common.cancel")).disabled).toBe(true);
    expect(button(target, de.t("common.back")).disabled).toBe(true);
    commit.resolve();
    await commit.promise;
    flushSync();
    expect(add.disabled).toBe(false);
    expect(button(target, de.t("common.cancel")).disabled).toBe(false);
  });

  it("asks Discard selection? on Cancel with pictures chosen, discarding nothing yet", async () => {
    const { session, target, discards } = mountRoute();
    await choosePicture(session);

    button(target, de.t("common.cancel")).click();
    flushSync();

    expect(document.querySelector("dialog h3")?.textContent).toBe(de.t("import.discardTitle"));
    expect(discards).toEqual([]);
  });

  it("leaves without asking on Cancel with nothing chosen", () => {
    const { target, discards } = mountRoute();

    button(target, de.t("common.cancel")).click();
    flushSync();

    expect(discards).toEqual([true]);
    expect(document.querySelector("dialog")).toBeNull();
  });
});

describe("AddPicturesRoute, adding to a slideshow in its own order", () => {
  const OWN: StoredSlideshow = {
    ...SHOW,
    ownOrder: true,
    pictures: [...SHOW.pictures, { ...picture("old-2"), capturedAt: "2025-07-03T10:00:00Z" }],
  };
  const choice = (target: HTMLElement) =>
    target.querySelector<HTMLElement>(
      `[role="radiogroup"][aria-label="${de.t("add.placementTitle")}"]`,
    );
  const checked = (target: HTMLElement) =>
    choice(target)?.querySelector('[aria-checked="true"]')?.textContent.trim();
  const spots = (target: HTMLElement) =>
    [...target.querySelectorAll(".spots li")].map((spot) => spot.textContent.trim());

  it("offers where the new pictures go, by capture date chosen, and shows where that is", async () => {
    const { session, target } = mountRoute(OWN);
    await choosePicture(session);

    expect(target.textContent).toContain(de.t("add.leadOwnOrder"));
    expect(checked(target)).toContain(de.t("add.placementByDate"));
    expect(spots(target)).toEqual([de.t("add.spotAfter", { count: 1, number: 1 })]);
    expect(target.querySelectorAll(".placement .mini")).toHaveLength(3);
  });

  it("puts them at the end once chosen, the preview following", async () => {
    const { session, target } = mountRoute(OWN);
    await choosePicture(session);

    const atEnd = [...(choice(target)?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [])].find(
      (radio) => radio.textContent.includes(de.t("add.placementAtEnd")),
    );
    atEnd?.click();
    flushSync();

    expect(session.placement).toBe("atEnd");
    expect(checked(target)).toContain(de.t("add.placementAtEnd"));
    expect(spots(target)).toEqual([de.t("add.spotAfter", { count: 1, number: 2 })]);
  });

  it("offers no choice for a slideshow sorted by capture date", async () => {
    const { session, target } = mountRoute(SHOW);
    await choosePicture(session);

    expect(target.querySelector(".after")).not.toBeNull();
    expect(choice(target)).toBeNull();
    expect(target.querySelector(".placement")).toBeNull();
  });
});
