import { describe, expect, it } from "vitest";
import { filePageLanguages } from "../app/file-page/file-page-languages";
import { createChooseCard } from "./choose-card";
import type { PickedEntry } from "./folder-source";

const WORDS = filePageLanguages().en;
const HOSTILE = '<img src=x onerror="window.hacked = true">';

function card() {
  const document = window.document.implementation.createHTMLDocument("page");
  const picked: (readonly PickedEntry[])[] = [];
  const choose = createChooseCard(document, WORDS, "Herbst", (entries) => picked.push(entries));
  const picker = document.querySelector<HTMLInputElement>("input[type=file]");
  if (picker === null) throw new Error("the card has no folder picker");
  return { document, choose, picker, picked };
}

describe("createChooseCard", () => {
  it("stays hidden until shown, then asks for the folder with no error", () => {
    const { document, choose } = card();
    const shown = document.querySelector<HTMLElement>(".card.choose");
    expect(shown?.hidden).toBe(true);

    choose.show(null);

    expect(shown?.hidden).toBe(false);
    expect(document.querySelector("h1")?.textContent).toBe(WORDS.chooseTitle);
    expect(document.querySelector("button")?.textContent).toBe(WORDS.chooseFolder);
    expect(document.querySelector("button svg")).not.toBeNull();
    expect(document.querySelector<HTMLElement>("[role=alert]")?.hidden).toBe(true);
  });

  it("offers a hidden folder picker that the button opens", () => {
    const { document, picker } = card();
    let opened = 0;
    picker.addEventListener("click", (event) => {
      event.preventDefault();
      opened += 1;
    });

    document.querySelector("button")?.click();

    expect(picker.webkitdirectory).toBe(true);
    expect(picker.hidden).toBe(true);
    expect(opened).toBe(1);
  });

  it("shows a problem as text, never as markup", () => {
    const { document, choose } = card();

    choose.show(HOSTILE);

    const alert = document.querySelector<HTMLElement>("[role=alert]");
    expect(alert?.hidden).toBe(false);
    expect(alert?.textContent).toBe(HOSTILE);
    expect(alert?.querySelector("img")).toBeNull();
  });

  it("hands on every picked file with its path inside the folder", () => {
    const { picker, picked } = card();
    const file = new File(["{}"], "glissando.json");
    const files = new DataTransfer();
    files.items.add(file);
    picker.files = files.files;

    picker.dispatchEvent(new Event("change"));

    expect(picked).toEqual([[{ relativePath: file.webkitRelativePath, file }]]);
  });

  it("hides again", () => {
    const { document, choose } = card();
    choose.show("gone");
    choose.hide();
    expect(document.querySelector<HTMLElement>(".card.choose")?.hidden).toBe(true);
  });
});
