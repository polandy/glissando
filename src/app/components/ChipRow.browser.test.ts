import { afterEach, describe, expect, it } from "vitest";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { reactiveProps } from "../testing/reactive-props.svelte";
import ChipRow from "./ChipRow.svelte";

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

type Props = {
  choices: readonly string[];
  selected: string;
  label: (choice: string) => string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  onChange: (choice: string) => void;
};

function setUp(extra: Partial<Props> = {}) {
  const changes: string[] = [];
  const props = reactiveProps<Props>({
    choices: ["a", "b", "c"],
    selected: "b",
    label: (choice) => choice.toUpperCase(),
    onChange: (choice) => changes.push(choice),
    ...extra,
  });
  const mounted = mountWithTranslator(ChipRow, props, { current: createTranslator("en") });
  destroy = mounted.destroy;
  return { target: mounted.target, changes };
}

describe("ChipRow", () => {
  it("shows a labelled chip per choice", () => {
    const { target } = setUp();

    const chips = Array.from(target.querySelectorAll(".chip"));
    expect(chips.map((chip) => chip.textContent?.trim())).toEqual(["A", "B", "C"]);
  });

  it("marks only the selected chip as pressed", () => {
    const { target } = setUp({ selected: "c" });

    const pressed = target.querySelectorAll('.chip[aria-pressed="true"]');
    expect(Array.from(pressed).map((chip) => chip.textContent?.trim())).toEqual(["C"]);
  });

  it("reports the picked choice", () => {
    const { target, changes } = setUp();

    target.querySelectorAll<HTMLButtonElement>(".chip")[0]?.click();

    expect(changes).toEqual(["a"]);
  });

  it("names the group by aria-label or by aria-labelledby", () => {
    const labelled = setUp({ ariaLabel: "Tint" });
    expect(labelled.target.querySelector("[role=group]")?.getAttribute("aria-label")).toBe("Tint");
    destroy?.();

    const by = setUp({ ariaLabelledby: "head" });
    expect(by.target.querySelector("[role=group]")?.getAttribute("aria-labelledby")).toBe("head");
  });
});
