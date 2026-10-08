import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import Header from "../components/Header.svelte";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { createTranslator } from "./translator";
import { TranslatorState } from "./translator-state.svelte";

let destroy = () => {};
afterEach(() => destroy());

describe("translator in context", () => {
  it("re-renders mounted copy when the language changes, without remounting", () => {
    const translator = new TranslatorState(createTranslator("de"));
    const mounted = mountWithTranslator(
      Header,
      { crumbs: ["Bibliothek"], onBack: () => {} },
      translator,
    );
    destroy = mounted.destroy;
    const back = mounted.target.querySelector("button");
    expect(back?.getAttribute("aria-label")).toBe("Zurück");

    translator.current = createTranslator("en");
    flushSync();

    expect(mounted.target.querySelector("button")).toBe(back);
    expect(back?.getAttribute("aria-label")).toBe("Back");
  });
});
