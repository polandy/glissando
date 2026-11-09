import type { ExistingSlideshow } from "../../../compose";
import { FakeScheduler } from "../../../ui-kit/testing/fake-scheduler";
import { createTranslator } from "../../i18n/translator";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import { Toaster } from "../../toast/toaster";
import type { ImportSession } from "../import-session";
import MusicStep from "../MusicStep.svelte";

/** A mounted music step: its element, the titles it created with, and how to remove it. */
export interface MusicStepRig {
  readonly target: HTMLElement;
  readonly created: readonly string[];
  readonly destroy: () => void;
}

export function mountMusicStep(
  session: ImportSession,
  existingSlideshows: readonly ExistingSlideshow[] = [],
  language: "de" | "en" = "en",
): MusicStepRig {
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
  return { target: step.target, created, destroy: step.destroy };
}

export function titleField(target: HTMLElement): HTMLInputElement {
  const field = [...target.querySelectorAll("input")].find(
    (input) => input.labels?.[0]?.textContent.includes("Title") ?? false,
  );
  if (field === undefined) throw new Error("no Title field");
  return field;
}
