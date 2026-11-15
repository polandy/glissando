import { describe, expect, it } from "vitest";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import { PORTRAIT_SIZE, stored } from "../editing/editor-test-harness";
import { createTranslator, type Language } from "../i18n/translator";
import { Toaster } from "../toast/toaster";
import { createScreenEditor } from "./screen-editor";

/** The toast after pairing `aloneId` of a portrait show `ids` again, in `language`'s copy. */
function rejoinToast(language: Language, ids: readonly string[], aloneId: string) {
  const toaster = new Toaster(new FakeScheduler());
  const editor = createScreenEditor(
    stored(ids, PORTRAIT_SIZE),
    {
      store: new MemoryLibraryStore(),
      focusOf: () => undefined,
      toaster,
      newId: () => "claim",
      now: () => new Date("2026-11-15T12:00:00Z"),
      random: () => 0,
      onError: (error) => {
        throw error;
      },
      onGone: () => undefined,
    },
    createTranslator(language),
  );
  editor.setPictureAlone(aloneId, true);
  editor.rejoinPair(aloneId);
  return toaster.current?.text;
}

describe("the Pair again toast's copy", () => {
  it.each([
    // a+b | c | d+e: no later pair loses a picture.
    {
      language: "de",
      ids: ["a", "b", "c", "d"],
      alone: "b",
      text: "Bilder 1 und 2 wieder als Paar",
    },
    {
      language: "en",
      ids: ["a", "b", "c", "d"],
      alone: "b",
      text: "Pictures 1 and 2 paired again",
    },
    // a+b | c (alone) | d+e → a+b | c+d | e.
    {
      language: "de",
      ids: ["a", "b", "c", "d", "e"],
      alone: "c",
      text: "Bilder 3 und 4 wieder als Paar, 4 und 5 getrennt",
    },
    {
      language: "en",
      ids: ["a", "b", "c", "d", "e"],
      alone: "c",
      text: "Pictures 3 and 4 paired again, 4 and 5 split",
    },
    // a (alone) | b+c | d+e | f → a+b | c+d | e+f.
    {
      language: "de",
      ids: ["a", "b", "c", "d", "e", "f"],
      alone: "a",
      text: "Bilder 1 und 2 wieder als Paar, 2 und 3 getrennt …",
    },
    {
      language: "en",
      ids: ["a", "b", "c", "d", "e", "f"],
      alone: "a",
      text: "Pictures 1 and 2 paired again, 2 and 3 split …",
    },
  ] as const)("$language: $text", ({ language, ids, alone, text }) => {
    expect(rejoinToast(language, ids, alone)).toBe(text);
  });
});
