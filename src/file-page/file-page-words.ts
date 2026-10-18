import { readPageWords } from "../share-page/read-share-words";
import {
  fill,
  PLAYER_TEXT_KEYS,
  type PlayerPageWords,
  type SharePageLanguage,
} from "../share-page/share-page-words";
import type { FolderProblem } from "./check-folder";

/**
 * `index.html`'s words in one language (`filePage.*` and the export page's `htmlPage.*`): built
 * into the page for both languages, like the share page's (dev-docs/library/GLISSANDO_FILE.md).
 */
export interface FilePageWords extends PlayerPageWords {
  readonly chooseTitle: string;
  readonly chooseText: string;
  readonly chooseFolder: string;
  readonly noManifest: string;
  /** "… {files} …". */
  readonly missing: string;
  /** "… {reason}". */
  readonly damaged: string;
  readonly foreign: string;
  readonly newer: string;
}

export type FilePageLanguages = Readonly<Record<SharePageLanguage, FilePageWords>>;

const FILE_TEXT_KEYS = [
  ...PLAYER_TEXT_KEYS,
  "chooseTitle",
  "chooseText",
  "chooseFolder",
  "noManifest",
  "missing",
  "damaged",
  "foreign",
  "newer",
] as const satisfies readonly Exclude<keyof FilePageWords, "pictures">[];

/** `<script type="application/json">` holding `FilePageLanguages`. */
export const FILE_WORDS_BLOCK_ID = "file-words";

const FILE_LIST_SEPARATOR = ", ";

/** `index.html`'s words block (`FILE_WORDS_BLOCK_ID`), both languages. */
export function readFileWords(text: string | null): FilePageLanguages {
  return readPageWords(text, FILE_TEXT_KEYS, "index.html");
}

/** What the choose card says about a folder that cannot play. */
export function folderProblemText(words: FilePageWords, problem: FolderProblem): string {
  switch (problem.kind) {
    case "noManifest":
      return words.noManifest;
    case "foreign":
      return words.foreign;
    case "newer":
      return words.newer;
    case "damaged":
      return fill(words.damaged, { reason: problem.reason });
    case "missing":
      return fill(words.missing, { files: problem.files.join(FILE_LIST_SEPARATOR) });
  }
}
