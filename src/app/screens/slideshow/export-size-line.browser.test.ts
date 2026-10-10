import { afterEach, describe, expect, it } from "vitest";
import { createTranslator } from "../../i18n/translator";
import { mountWithTranslator } from "../../testing/mount-with-translator";
import PageChoose from "./html-export/PageChoose.svelte";
import PresetRadios from "./video-export/PresetRadios.svelte";

const de = createTranslator("de");
const ESTIMATE_BYTES = 12_000_000;

let destroy = () => {};
afterEach(() => destroy());

function presetRadios() {
  const mounted = mountWithTranslator(PresetRadios, {
    available: ["720p", "1080p", "4k"],
    preset: "1080p",
    estimate: () => ESTIMATE_BYTES,
    onSelect: () => {},
  });
  destroy = mounted.destroy;
  return mounted.target;
}

function pageChoose(fromImmich: boolean) {
  const mounted = mountWithTranslator(PageChoose, {
    view: {
      kind: "choose",
      sizeId: "small",
      estimates: fromImmich
        ? null
        : { small: ESTIMATE_BYTES, sharp: ESTIMATE_BYTES, "4k": ESTIMATE_BYTES },
      starting: false,
    },
    videoBytes: ESTIMATE_BYTES,
    fromImmich,
    onSelect: () => {},
    onStart: () => {},
    onCancel: () => {},
  });
  destroy = mounted.destroy;
  return mounted.target;
}

describe("the export sheets' size line", () => {
  it("of the web page says a server slideshow's pictures are downloaded from Immich", () => {
    const target = pageChoose(true);

    expect(target.textContent).toContain(de.t("server.exportFromImmich"));
  });

  it("of the video gives the estimate, for a server slideshow too, as pictures don't change it", () => {
    const target = presetRadios();

    expect(target.textContent).toContain(de.formatBytes(ESTIMATE_BYTES));
    expect(target.textContent).not.toContain(de.t("server.exportFromImmich"));
  });

  it("of the web page gives a device slideshow's estimate", () => {
    const target = pageChoose(false);

    expect(target.textContent).toContain(de.formatBytes(ESTIMATE_BYTES));
    expect(target.textContent).not.toContain(de.t("server.exportFromImmich"));
  });
});
