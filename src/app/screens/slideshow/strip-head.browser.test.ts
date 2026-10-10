import { afterEach, describe, expect, it } from "vitest";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import StripHead from "./StripHead.svelte";

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

function mountHead(narrow: boolean) {
  const adds: string[] = [];
  const mounted = mountWithTranslator(StripHead, {
    count: 24,
    ownOrder: false,
    onAdd: () => adds.push("add"),
  });
  destroy = mounted.destroy;
  // The screen is the query container; narrower than 720 px is the phone layout.
  mounted.target.style.containerType = "inline-size";
  mounted.target.style.width = narrow ? "400px" : "1000px";
  const button = mounted.target.querySelector<HTMLButtonElement>("button");
  if (button === null) {
    throw new Error("the strip head shows no Add pictures button");
  }
  return { button, adds };
}

describe("StripHead's Add pictures", () => {
  it.each([
    { layout: "wide", narrow: false, label: "Bilder hinzufügen" },
    { layout: "narrow", narrow: true, label: "Hinzufügen" },
  ])(
    "reads $label in the $layout layout, named in full for assistive technology",
    ({ narrow, label }) => {
      const { button } = mountHead(narrow);

      expect(button.innerText.trim()).toBe(label);
      expect(button.getAttribute("aria-label")).toBe("Bilder hinzufügen");
    },
  );

  it("opens the add screen", () => {
    const { button, adds } = mountHead(true);

    button.click();

    expect(adds).toEqual(["add"]);
  });
});
