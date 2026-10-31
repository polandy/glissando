import { afterEach, describe, expect, it } from "vitest";
import type { PageSizeId } from "../../../../html-export/plan";
import { createTranslator } from "../../../i18n/translator";
import { mountWithTranslator } from "../../../testing/mount-with-translator";
import PageChoose from "./PageChoose.svelte";

const de = createTranslator("de");
const ESTIMATE_BYTES = 12_000_000;
const SMALL_BYTES = 4_000_000;

let destroy = () => {};
afterEach(() => destroy());

function mountChoose(
  clipCount: number,
  estimates: Record<PageSizeId, number>,
  sizeId: PageSizeId = "small",
) {
  const mounted = mountWithTranslator(PageChoose, {
    clipCount,
    view: { kind: "choose", sizeId, estimates, starting: false },
    videoBytes: ESTIMATE_BYTES,
    fromImmich: false,
    onSelect: () => {},
    onStart: () => {},
    onCancel: () => {},
  });
  destroy = mounted.destroy;
  return mounted.target;
}

function expectEstimateOnEveryOption(target: HTMLElement): void {
  const options = target.querySelectorAll('[role="radio"]');
  expect(options).toHaveLength(3);
  for (const option of options) {
    expect(option.textContent).toMatch(/\d/);
    expect(option.querySelector(".size")?.textContent).toContain(de.formatBytes(ESTIMATE_BYTES));
  }
}

describe("the web page sheet's size note", () => {
  it("is one line when clips make the sizes alike", () => {
    const alike = { small: ESTIMATE_BYTES, sharp: ESTIMATE_BYTES, "4k": ESTIMATE_BYTES };
    const target = mountChoose(2, alike, "sharp");

    expectEstimateOnEveryOption(target);
    expect(target.textContent).toContain(de.t("htmlExport.clipsNote", { count: 2 }));
    expect(target.querySelector(".notice")).toBeNull();
    expect(target.querySelector('[role="radio"][aria-checked="true"]')?.textContent).toContain(
      de.t("sizeScale.standard"),
    );
  });

  it("is absent without clips, with the three estimates present", () => {
    const alike = { small: ESTIMATE_BYTES, sharp: ESTIMATE_BYTES, "4k": ESTIMATE_BYTES };
    const target = mountChoose(0, alike);

    expectEstimateOnEveryOption(target);
    expect(target.textContent).not.toContain(de.t("htmlExport.clipsNote", { count: 0 }));
  });

  it("is absent with clips when the sizes still differ", () => {
    const target = mountChoose(1, {
      small: SMALL_BYTES,
      sharp: ESTIMATE_BYTES,
      "4k": ESTIMATE_BYTES,
    });

    expect(target.querySelectorAll('[role="radio"]')).toHaveLength(3);
    expect(target.textContent).not.toContain(de.t("htmlExport.clipsNote", { count: 1 }));
  });
});
