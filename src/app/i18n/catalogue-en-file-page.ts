import type { deFilePage } from "./catalogue-de-file-page.ts";
import type { Catalogue } from "./messages.ts";

/** English copy of index.html's choose-folder card; typed to the German keys. */
export const enFilePage: Pick<Catalogue, keyof typeof deFilePage> = {
  "filePage.chooseTitle": "Choose this slideshow’s folder",
  "filePage.chooseText":
    "Pick the folder you unpacked the .glissando file into, the one holding this index.html. Your browser lets the page read the pictures and music only then.",
  "filePage.chooseFolder": "Choose folder",
  "filePage.noManifest":
    "This folder holds no glissando.json. Unpack the whole .glissando file, then choose the folder holding index.html.",
  "filePage.missing":
    "This folder lacks files the slideshow needs: {files}. Unpack the whole .glissando file again.",
  "filePage.damaged": "This file is damaged. Try the original file again.",
  "filePage.showDetails": "Show details",
  "filePage.hideDetails": "Hide details",
  "filePage.foreign": "This folder’s glissando.json is no Glissando slideshow.",
  "filePage.newer":
    "This slideshow was made with a newer Glissando than this page. Open the .glissando file in Glissando instead: https://polandy.github.io/glissando/",
};
