import { iconSvg } from "../export-player/page-view.ts";
import type { FilePageWords } from "./file-page-words.ts";
import type { PickedEntry } from "./folder-source.ts";

/** The card asking for the slideshow's folder where the browser will not read it unasked. */
export interface ChooseCard {
  /** Shows the card, with `problem` under the button, or none. */
  show(problem: string | null): void;
  hide(): void;
}

/**
 * Builds the card inside `document.body`, hidden. Its button opens the browser's folder picker;
 * every file picked reaches `onPicked` with its path inside the picked folder.
 */
export function createChooseCard(
  document: Document,
  words: FilePageWords,
  eyebrow: string,
  onPicked: (entries: readonly PickedEntry[]) => void,
): ChooseCard {
  const make = <Tag extends keyof HTMLElementTagNameMap>(
    tag: Tag,
    className: string,
    ...children: (Node | string)[]
  ): HTMLElementTagNameMap[Tag] => {
    const node = document.createElement(tag);
    node.className = className;
    node.append(...children);
    return node;
  };

  const picker = make("input", "");
  picker.type = "file";
  picker.webkitdirectory = true;
  picker.hidden = true;
  picker.addEventListener("change", () => {
    const files = [...(picker.files ?? [])];
    // The same folder picked again after a fix must still raise `change`.
    picker.value = "";
    onPicked(files.map((file) => ({ relativePath: file.webkitRelativePath, file })));
  });
  const choose = make("button", "again", iconSvg(document, "folder"), words.chooseFolder);
  choose.type = "button";
  choose.addEventListener("click", () => picker.click());
  const error = make("p", "error");
  error.setAttribute("role", "alert");
  const card = make(
    "div",
    "card choose",
    make(
      "div",
      "",
      make("div", "eyebrow", eyebrow),
      make("h1", "title", words.chooseTitle),
      make("p", "choose-text", words.chooseText),
      choose,
      picker,
      error,
    ),
    make("div", "made", words.madeWith),
  );
  card.hidden = true;
  document.body.append(card);

  return {
    show(problem) {
      error.textContent = problem ?? "";
      error.hidden = problem === null;
      card.hidden = false;
    },
    hide() {
      card.hidden = true;
    },
  };
}
