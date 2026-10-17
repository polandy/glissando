import { afterEach, describe, expect, it } from "vitest";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import StripHead from "./StripHead.svelte";

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

function mountHead(narrow: boolean, { selecting = false, onToggleSelect = () => {} } = {}) {
  const adds: string[] = [];
  const shuffles: string[] = [];
  const mounted = mountWithTranslator(StripHead, {
    count: 24,
    ownOrder: false,
    selecting,
    onToggleSelect,
    onShuffle: () => shuffles.push("shuffle"),
    onAdd: () => adds.push("add"),
  });
  destroy = mounted.destroy;
  // The screen is the query container; narrower than 720 px is the phone layout.
  mounted.target.style.containerType = "inline-size";
  mounted.target.style.width = narrow ? "400px" : "1000px";
  const buttons = [...mounted.target.querySelectorAll<HTMLButtonElement>("button")];
  const addButton = buttons.find(
    (button) => button.getAttribute("aria-label") === "Medien hinzufügen",
  );
  const selectButton = buttons.find((button) => button.getAttribute("aria-label") === "Auswählen");
  if (addButton === undefined || selectButton === undefined) {
    throw new Error("the strip head shows no Select or Add media button");
  }
  return { button: addButton, selectButton, adds, shuffles, buttons };
}

describe("StripHead's Add media", () => {
  it.each([
    { layout: "wide", narrow: false, label: "Medien hinzufügen" },
    { layout: "narrow", narrow: true, label: "Hinzufügen" },
  ])(
    "reads $label in the $layout layout, named in full for assistive technology",
    ({ narrow, label }) => {
      const { button } = mountHead(narrow);

      expect(button.innerText.trim()).toBe(label);
      expect(button.getAttribute("aria-label")).toBe("Medien hinzufügen");
    },
  );

  it("opens the add screen", () => {
    const { button, adds } = mountHead(true);

    button.click();

    expect(adds).toEqual(["add"]);
  });

  it("comes left of a 'Select' toggle that reflects selecting several", () => {
    const { selectButton } = mountHead(false, { selecting: true });

    expect(selectButton.getAttribute("aria-pressed")).toBe("true");
  });

  it("toggles selecting several", () => {
    const toggles: boolean[] = [];
    const { selectButton } = mountHead(false, { onToggleSelect: () => toggles.push(true) });

    selectButton.click();

    expect(toggles).toEqual([true]);
  });
});

describe("StripHead's Shuffle", () => {
  it("asks for a new order", () => {
    const { buttons, shuffles } = mountHead(false);

    buttons.find((button) => button.getAttribute("aria-label") === "Mischen")?.click();

    expect(shuffles).toEqual(["shuffle"]);
  });
});

describe("StripHead's hint", () => {
  it("adds 'hold to select several' narrow only, sorted by capture date", () => {
    const mounted = mountWithTranslator(StripHead, {
      count: 3,
      ownOrder: false,
      selecting: false,
      onToggleSelect: () => {},
      onShuffle: () => {},
      onAdd: () => {},
    });
    destroy = mounted.destroy;

    expect(mounted.target.textContent).toContain("Nach Aufnahmedatum sortiert");
    expect(mounted.target.textContent).toContain("halten für mehrere");
  });
});
