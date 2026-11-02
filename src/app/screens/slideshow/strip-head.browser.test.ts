import { createRawSnippet } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import "../../../styles/tokens.css";
import "../../../styles/base.css";
import { createTranslator } from "../../i18n/translator";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import StripHead from "./StripHead.svelte";

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

function mountHead(
  narrow: boolean,
  { selecting = false, ownOrder = false, onToggleSelect = () => {} } = {},
) {
  const adds: string[] = [];
  const shuffles: string[] = [];
  const sorts: string[] = [];
  const mounted = mountWithTranslator(StripHead, {
    count: 24,
    ownOrder,
    selecting,
    onToggleSelect,
    onShuffle: () => shuffles.push("shuffle"),
    onSortByDate: () => sorts.push("sort"),
    onAdd: () => adds.push("add"),
  });
  destroy = mounted.destroy;
  // The screen is the query container; narrower than 720 px is the phone layout.
  mounted.target.style.containerType = "inline-size";
  mounted.target.style.width = narrow ? "400px" : "1000px";
  const buttons = [...mounted.target.querySelectorAll<HTMLButtonElement>("button")];
  const addButton = buttons.find(
    (button) => button.getAttribute("aria-label") === "Bilder hinzufügen",
  );
  const selectButton = buttons.find((button) => button.getAttribute("aria-label") === "Auswählen");
  if (addButton === undefined || selectButton === undefined) {
    throw new Error("the strip head shows no Select or Add media button");
  }
  return { button: addButton, selectButton, adds, shuffles, sorts, buttons };
}

describe("StripHead's Add media", () => {
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

describe("StripHead's add", () => {
  it("replaces the default Add media button with the given snippet", () => {
    const add = createRawSnippet(() => ({
      render: () => '<button class="own-add" type="button">Bilder hinzufügen</button>',
    }));
    const mounted = mountWithTranslator(StripHead, {
      count: 3,
      ownOrder: false,
      selecting: false,
      onToggleSelect: () => {},
      onShuffle: () => {},
      onSortByDate: () => {},
      add,
    });
    destroy = mounted.destroy;

    expect(mounted.target.querySelector(".own-add")).not.toBeNull();
    expect(
      [...mounted.target.querySelectorAll("button")].some(
        (button) => button.getAttribute("aria-label") === "Bilder hinzufügen",
      ),
    ).toBe(false);
  });
});

describe("StripHead's Shuffle", () => {
  it("asks for a new order", () => {
    const { buttons, shuffles } = mountHead(false);

    buttons.find((button) => button.getAttribute("aria-label") === "Mischen")?.click();

    expect(shuffles).toEqual(["shuffle"]);
  });
});

const SORT_BY_DATE_LABEL = "Nach Aufnahmedatum sortieren";
const sortByDateButton = (buttons: readonly HTMLButtonElement[]) =>
  buttons.find((button) => button.getAttribute("aria-label") === SORT_BY_DATE_LABEL);

describe("StripHead's Sort by date", () => {
  it("is left out while the pictures are in date order, with Shuffle there", () => {
    const { buttons } = mountHead(false, { ownOrder: false });

    expect(buttons.some((button) => button.getAttribute("aria-label") === "Mischen")).toBe(true);
    expect(sortByDateButton(buttons)).toBeUndefined();
  });

  it("sits between Shuffle and Select while the order is the user's own", () => {
    const { buttons } = mountHead(false, { ownOrder: true });

    const labels = buttons.map((button) => button.getAttribute("aria-label"));
    expect(labels.slice(0, 3)).toEqual(["Mischen", SORT_BY_DATE_LABEL, "Auswählen"]);
  });

  it("asks for the capture-date order", () => {
    const { buttons, sorts } = mountHead(false, { ownOrder: true });

    sortByDateButton(buttons)?.click();

    expect(sorts).toEqual(["sort"]);
  });
});

describe("StripHead's hint", () => {
  it("does not mention holding to select, sorted by capture date", () => {
    const mounted = mountWithTranslator(StripHead, {
      count: 3,
      ownOrder: false,
      selecting: false,
      onToggleSelect: () => {},
      onShuffle: () => {},
      onSortByDate: () => {},
      onAdd: () => {},
    });
    destroy = mounted.destroy;

    expect(mounted.target.textContent).toContain("Nach Aufnahmedatum sortiert");
    expect(mounted.target.textContent).not.toContain("halten");
  });
});

/** The strip's width on a 412 px phone: the screen's 16 px padding on either side. */
const PHONE_STRIP_WIDTH_PX = 380;

function overlaps(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

describe("StripHead on a 412 px phone", () => {
  it.each([
    { locale: "de", ownOrder: false, buttonCount: 3 },
    { locale: "en", ownOrder: false, buttonCount: 3 },
    { locale: "de", ownOrder: true, buttonCount: 4 },
    { locale: "en", ownOrder: true, buttonCount: 4 },
  ] as const)(
    "keeps the eyebrow and the count clear of the buttons in $locale, own order $ownOrder",
    ({ locale, ownOrder, buttonCount }) => {
      const mounted = mountWithTranslator(
        StripHead,
        {
          count: 248,
          ownOrder,
          selecting: false,
          onToggleSelect: () => {},
          onShuffle: () => {},
          onSortByDate: () => {},
          onAdd: () => {},
        },
        { current: createTranslator(locale) },
      );
      destroy = mounted.destroy;
      mounted.target.style.containerType = "inline-size";
      mounted.target.style.width = `${PHONE_STRIP_WIDTH_PX}px`;
      const eyebrow = mounted.target.querySelector<HTMLElement>(".eyebrow");
      const count = mounted.target.querySelector<HTMLElement>(".count");
      const buttons = [...mounted.target.querySelectorAll<HTMLElement>("button")];
      if (eyebrow === null || count === null) {
        throw new Error("the strip head shows no eyebrow or count");
      }

      expect(buttons).toHaveLength(buttonCount);
      expect(mounted.target.scrollWidth).toBeLessThanOrEqual(mounted.target.clientWidth);
      expect(eyebrow.scrollWidth).toBeLessThanOrEqual(eyebrow.clientWidth);
      for (const button of buttons) {
        const box = button.getBoundingClientRect();
        expect(overlaps(eyebrow.getBoundingClientRect(), box)).toBe(false);
        expect(overlaps(count.getBoundingClientRect(), box)).toBe(false);
      }
    },
  );
});
