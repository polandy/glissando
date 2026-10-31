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

  it("keeps the reason behind a Show details button until it is pressed", () => {
    const { document, choose } = card();

    choose.show(WORDS.damaged, "no JSON at 1:2");

    const alert = document.querySelector<HTMLElement>("[role=alert]");
    const toggle = document.querySelector<HTMLButtonElement>(".details-toggle");
    const reason = document.querySelector<HTMLElement>(".error-details");
    expect(alert?.textContent).toBe(WORDS.damaged);
    expect(toggle?.textContent).toBe(WORDS.showDetails);
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    expect(reason?.hidden).toBe(true);

    toggle?.click();

    expect(reason?.hidden).toBe(false);
    expect(reason?.textContent).toBe("no JSON at 1:2");
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
    expect(toggle?.textContent).toBe(WORDS.hideDetails);

    toggle?.click();

    expect(reason?.hidden).toBe(true);
    expect(toggle?.textContent).toBe(WORDS.showDetails);
  });

  it("offers no details button for a problem without a reason", () => {
    const { document, choose } = card();

    choose.show(WORDS.noManifest);

    expect(document.querySelector<HTMLElement>("[role=alert]")?.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>(".details-toggle")?.hidden).toBe(true);
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
