import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { picture } from "../../library/testing/library-store-contract";
import { FakeDecoder } from "../../import/testing/picture-import-fixtures";
import { createTranslator } from "../i18n/translator";
import { pictureFile } from "../testing/picture-intake-ports";
import type { AddPicturesSession } from "./add-pictures-session";
import { mountRoute, SHOW, unmountRoutes } from "./testing/mount-add-route";
import { buttonNamed } from "../testing/by-role";

const de = createTranslator("de");
afterEach(unmountRoutes);

/** Settles when the test says so. */
function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((settle) => (resolve = settle));
  return { promise, resolve };
}

async function choosePicture(session: AddPicturesSession): Promise<void> {
  session.intake.addPictures([pictureFile("new.jpg", "2025-07-02T10:00:00Z")]);
  await session.intake.settled();
  flushSync();
}

/**
 * The footer's primary action, found by its class rather than its label: while busy it reads
 * "Add" too, the same as the strip head's button (AddPicturesMenu), so a label lookup is
 * ambiguous.
 */
function primaryButton(target: HTMLElement): HTMLButtonElement {
  const found = target.querySelector<HTMLButtonElement>(".btn.primary");
  if (found === null) {
    throw new Error("no primary button");
  }
  return found;
}

describe("AddPicturesRoute, adding to a server slideshow", () => {
  it("links pictures from Immich, offering files from this device as a copy", () => {
    const { target } = mountRoute(SHOW, undefined, "server");

    expect(target.textContent).toContain(de.t("server.copyToAdd"));
    expect(buttonNamed(target, de.t("import.chooseFiles"))).toBeDefined();
    expect(target.textContent).not.toContain(de.t("server.deviceDisabled"));
  });

  it.each([
    { answer: "confirmed", label: de.t("server.copyToAddConfirm"), copies: [["a.jpg", "b.jpg"]] },
    { answer: "cancelled", label: de.t("common.cancel"), copies: [] },
  ])("asks before copying files chosen from this device, $answer", ({ label, copies }) => {
    const { target, session, copiesToAdd } = mountRoute(SHOW, undefined, "server");
    const picked = new DataTransfer();
    picked.items.add(new File(["x"], "a.jpg"));
    picked.items.add(new File(["y"], "b.jpg"));
    const input = target.querySelector<HTMLInputElement>("input[type=file][multiple]");
    if (input === null) throw new Error("no file input");

    input.files = picked.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    flushSync();
    const sheet = document.querySelector("dialog");
    expect(sheet?.textContent).toContain(de.t("server.copyToAddTitle"));
    expect(sheet?.textContent).toContain("deine 2 Dateien");
    if (sheet === null) throw new Error("no sheet");
    buttonNamed(sheet, label).click();
    flushSync();

    expect(document.querySelector("dialog")).toBeNull();
    expect(copiesToAdd).toEqual(copies);
    expect(session.intake.pictures.state.pictures).toEqual([]);
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

    expect(primaryButton(target).disabled).toBe(true);
    await session.intake.settled();
    flushSync();
    expect(buttonNamed(target, de.t("add.add", { count: 1 })).disabled).toBe(false);
  });

  it("names how many pictures are left while Add is disabled for importing", async () => {
    const decoder = new FakeDecoder();
    const { session, target } = mountRoute(SHOW, undefined, "device", { decode: decoder.decode });
    decoder.hold();

    session.intake.addPictures([
      pictureFile("new1.jpg", "2025-07-02T10:00:00Z"),
      pictureFile("new2.jpg", "2025-07-03T10:00:00Z"),
    ]);
    flushSync();

    expect(target.querySelector(".blocked-reason")?.textContent).toBe(
      de.t("import.blockedImporting", { count: 2 }),
    );

    decoder.open();
    await session.intake.settled();
    flushSync();
    expect(target.querySelector(".blocked-reason")).toBeNull();
  });

  it("disables Add n, Cancel and back while the pictures are being added", async () => {
    const commit = deferred();
    const { session, target } = mountRoute(SHOW, () => commit.promise);
    await choosePicture(session);
    const add = buttonNamed(target, de.t("add.add", { count: 1 }));
    expect(add.disabled).toBe(false);

    add.click();
    flushSync();

    expect(add.disabled).toBe(true);
    expect(buttonNamed(target, de.t("common.cancel")).disabled).toBe(true);
    expect(buttonNamed(target, de.t("common.back")).disabled).toBe(true);
    commit.resolve();
    await commit.promise;
    flushSync();
    expect(add.disabled).toBe(false);
    expect(buttonNamed(target, de.t("common.cancel")).disabled).toBe(false);
  });

  it("asks Discard selection? on Cancel with pictures chosen, discarding nothing yet", async () => {
    const { session, target, discards } = mountRoute();
    await choosePicture(session);

    buttonNamed(target, de.t("common.cancel")).click();
    flushSync();

    expect(document.querySelector("dialog h3")?.textContent).toBe(de.t("import.discardTitle"));
    expect(discards).toEqual([]);
  });

  it("leaves without asking on Cancel with nothing chosen", () => {
    const { target, discards } = mountRoute();

    buttonNamed(target, de.t("common.cancel")).click();
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
