import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { button, element, mountEditor, unmountEditor, view } from "./picture-editor-harness";

afterEach(() => unmountEditor());

const field = () => element<HTMLInputElement>('input[type="text"]');
const counter = () => element(".caption .count").textContent;
const previewCaption = () => document.querySelector(".preview [data-caption]");

function type(text: string): void {
  field().value = text;
  field().dispatchEvent(new Event("input", { bubbles: true }));
  flushSync();
}

describe("PictureEditorScreen, the caption", () => {
  it("offers a one-line caption field below Ken Burns, with its counter and hint", () => {
    mountEditor(view({ caption: "Am Steg" }));

    const section = element(".caption");
    expect(element(".motion").nextElementSibling).toBe(section);
    expect(element(".caption label").textContent).toBe("Bildtitel");
    expect(field().value).toBe("Am Steg");
    expect(field().placeholder).toBe("z. B. Abends am Steg");
    expect(field().maxLength).toBe(80);
    expect(field().getAttribute("enterkeyhint")).toBe("done");
    expect(counter()).toBe("7 / 80");
    expect(section.textContent).toContain("Steht im Player unten links");
  });

  it("hands every keystroke on as typed and counts its characters", () => {
    const { calls } = mountEditor();

    type("Abends ");

    expect(calls.captions).toEqual(["Abends "]);
    expect(counter()).toBe("7 / 80");
  });

  it("shows the clear button only while there is text; it empties the field and keeps focus", () => {
    const { calls } = mountEditor();
    expect(document.querySelector('[aria-label="Bildtitel leeren"]')).toBeNull();
    type("Steg");

    button("Bildtitel leeren").click();
    flushSync();

    expect(field().value).toBe("");
    expect(calls.captions.at(-1)).toBe("");
    expect(document.activeElement).toBe(field());
    expect(document.querySelector('[aria-label="Bildtitel leeren"]')).toBeNull();
  });

  it("leaves the field on Enter", () => {
    mountEditor();
    field().focus();

    field().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(document.activeElement).not.toBe(field());
  });

  it("tidies the text on leaving the field, as it is stored", () => {
    mountEditor();
    field().focus();
    type("  Abends\tam   Steg ");

    field().blur();
    flushSync();

    expect(field().value).toBe("Abends am Steg");
    expect(counter()).toBe("14 / 80");
  });

  it("shows the caption in the preview as the player will, and none while empty", () => {
    mountEditor();
    expect(element(".preview")).toBeDefined();
    expect(previewCaption()).toBeNull();

    type("  Abends am Steg");

    expect(previewCaption()?.textContent).toBe("Abends am Steg");
  });
});
