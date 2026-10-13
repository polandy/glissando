import { afterEach, describe, expect, it } from "vitest";
import { element, mountEditor, unmountEditor, view } from "./picture-editor-harness";
import { section, text } from "./picture-editor-timing-fixtures";

afterEach(() => unmountEditor());

const layoutSection = () => section("layout-label");
const switchInput = () => element<HTMLInputElement>('.layout input[role="switch"]');

describe("PictureEditorScreen layout (ADR-0028)", () => {
  it("shows the switch off and the alone status for a picture that stays single", () => {
    mountEditor(
      view({
        layout: { alone: false, pairedWithNumber: null, blurredFill: false, settingOverride: null },
      }),
    );

    expect(switchInput().checked).toBe(false);
    expect(text(layoutSection())).toContain("Immer allein");
    expect(text(layoutSection())).toContain("Wird allein gezeigt.");
  });

  it("names the pair partner", () => {
    mountEditor(
      view({
        layout: { alone: false, pairedWithNumber: 4, blurredFill: false, settingOverride: null },
      }),
    );

    expect(text(layoutSection())).toContain("Teilt ein Dia mit Bild 4");
  });

  it("names the blurred fill", () => {
    mountEditor(
      view({
        layout: { alone: false, pairedWithNumber: null, blurredFill: true, settingOverride: null },
      }),
    );

    expect(text(layoutSection())).toContain(
      "Wird allein über einer unscharfen Kopie von sich selbst gezeigt",
    );
  });

  it("says the slideshow's setting overrides the switch", () => {
    mountEditor(
      view({
        layout: {
          alone: false,
          pairedWithNumber: null,
          blurredFill: false,
          settingOverride: "fill-screen",
        },
      }),
    );

    expect(text(layoutSection())).toContain(
      "Wirkt sich nicht aus, solange die Diashow auf „Bildschirm füllen“ steht",
    );
  });

  it("toggles always alone", () => {
    const { calls } = mountEditor(
      view({
        layout: { alone: false, pairedWithNumber: 4, blurredFill: false, settingOverride: null },
      }),
    );

    switchInput().click();

    expect(calls.alones).toEqual([true]);
    expect(switchInput().checked).toBe(true);
  });
});
