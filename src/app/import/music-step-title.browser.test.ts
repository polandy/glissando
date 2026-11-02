import "../../styles/tokens.css";
import "../../styles/base.css";
import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { server } from "vitest/browser";
import { titleForCaptureRange, type ExistingSlideshow } from "../../compose";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import { createTranslator } from "../i18n/translator";
import { emulateCoarsePointer } from "../testing/coarse-pointer";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { Toaster } from "../toast/toaster";
import type { ImportSession } from "./import-session";
import MusicStep from "./MusicStep.svelte";
import { withTwoPictures } from "./testing/import-session-fixtures";

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
});

// The fixture's pictures were taken on 2025-07-01 and 2025-08-02.
const SUMMER_DATES = ["2025-07-01T10:00:00Z", "2025-08-02T10:00:00Z"];
const SUMMER_TITLE = titleForCaptureRange(SUMMER_DATES, "en");

function mountStep(
  session: ImportSession,
  existingSlideshows: readonly ExistingSlideshow[] = [],
  language: "de" | "en" = "en",
) {
  const created: string[] = [];
  const step = mountWithTranslator(
    MusicStep,
    {
      session,
      existingSlideshows,
      loadThumbnail: () => Promise.resolve(new Blob()),
      onBack: () => undefined,
      onCreate: (title: string) => created.push(title),
      onError: (error: unknown) => {
        throw error;
      },
      toaster: new Toaster(new FakeScheduler()),
    },
    { current: createTranslator(language) },
  );
  unmounts.push(step.destroy);
  return { target: step.target, created };
}

function titleField(target: HTMLElement): HTMLInputElement {
  const field = [...target.querySelectorAll("input")].find(
    (input) => input.labels?.[0]?.textContent.includes("Title") ?? false,
  );
  if (field === undefined) throw new Error("no Title field");
  return field;
}

const buttonNamed = (target: HTMLElement, name: string) => {
  const button = [...target.querySelectorAll("button")].find(
    (candidate) => candidate.textContent.trim() === name,
  );
  if (button === undefined) throw new Error(`no button "${name}"`);
  return button;
};

function type(field: HTMLInputElement, value: string): void {
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  flushSync();
}

const pressEnter = (field: HTMLInputElement) => {
  field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  flushSync();
};

describe("MusicStep, the Title field", () => {
  it("is prefilled with the automatic title, focused with its text selected under a mouse, and carries its hint", async () => {
    const { session } = await withTwoPictures();

    const { target } = mountStep(session);
    const field = titleField(target);

    expect(field.value).toBe(SUMMER_TITLE);
    expect(document.activeElement).toBe(field);
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, SUMMER_TITLE.length]);
    expect(target.textContent).toContain("You can change it later on the slideshow screen.");
    expect(field.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  });

  it.skipIf(server.browser !== "chromium")(
    "waits for a tap on a touch screen, so the keyboard does not cover the step",
    async () => {
      const { session } = await withTwoPictures();
      await emulateCoarsePointer(true);
      try {
        const { target } = mountStep(session);
        const field = titleField(target);

        expect(field.value).toBe(SUMMER_TITLE);
        expect(document.activeElement).toBe(document.body);
      } finally {
        await emulateCoarsePointer(false);
      }
    },
  );

  it("is prefilled with a title no other slideshow has", async () => {
    const { session } = await withTwoPictures();

    const { target } = mountStep(session, [{ title: SUMMER_TITLE, capturedAt: SUMMER_DATES }]);

    expect(titleField(target).value).toBe(`${SUMMER_TITLE} · 2`);
  });

  it("is labelled Titel in German", async () => {
    const { session } = await withTwoPictures();

    const { target } = mountStep(session, [], "de");

    expect(target.querySelector("label")?.textContent).toContain("Titel");
    expect(target.textContent).toContain("Du kannst ihn später auf der Diashow-Seite ändern.");
  });

  it("creates the slideshow with the typed title on Enter", async () => {
    const { session } = await withTwoPictures();
    const { target, created } = mountStep(session);

    const field = titleField(target);
    type(field, "  Sommer am See ");
    pressEnter(field);

    expect(created).toEqual(["Sommer am See"]);
  });

  it("creates the slideshow with the typed title from Create without music", async () => {
    const { session } = await withTwoPictures();
    const { target, created } = mountStep(session);

    type(titleField(target), "Sommer am See");
    buttonNamed(target, "Create without music").click();

    expect(created).toEqual(["Sommer am See"]);
  });

  it("falls back to the automatic title when the field is empty or blank", async () => {
    const { session } = await withTwoPictures();
    const { target, created } = mountStep(session);
    const field = titleField(target);

    type(field, "");
    pressEnter(field);
    type(field, "   ");
    buttonNamed(target, "Create without music").click();

    expect(created).toEqual([SUMMER_TITLE, SUMMER_TITLE]);
  });

  it("does not create on Enter while a song is still being read", async () => {
    const { session } = await withTwoPictures({
      probeMusic: () => new Promise(() => undefined),
    });
    void session.addSongs([new File(["x"], "Slow.mp3", { type: "audio/mpeg" })]);
    const { target, created } = mountStep(session);

    expect(target.querySelector<HTMLButtonElement>("button.primary")?.disabled).toBe(true);
    pressEnter(titleField(target));

    expect(created).toEqual([]);
  });
});
