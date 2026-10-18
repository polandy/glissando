import type { Plugin } from "vite";
import { filePageLanguages } from "../src/app/file-page/file-page-languages.ts";
import { playerBundle } from "./export-player-bundle.ts";
import { buildPlayerPage } from "./export-player-plugin.ts";

/** The file page's parts (`FilePageBundle`); typed in src/file-page/browser/. */
export const FILE_PAGE_MODULE = "virtual:glissando-file-page";
const RESOLVED_FILE_PAGE_MODULE = `\0${FILE_PAGE_MODULE}`;
const FILE_PAGE_ENTRY = "src/file-page/main.ts";

/**
 * Builds the player page every `.glissando` file carries as `index.html` (ADR-0038) and serves
 * its script, style, fonts and both languages' words as `virtual:glissando-file-page`; the app
 * fills in the slideshow's title and card fonts at export time (`filePageHtml`).
 */
export function filePagePlugin(): Plugin {
  let root = "";
  return {
    name: "glissando:file-page",
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      return id === FILE_PAGE_MODULE ? RESOLVED_FILE_PAGE_MODULE : null;
    },
    async load(id) {
      if (id !== RESOLVED_FILE_PAGE_MODULE) return null;
      const parts = await buildPlayerPage(root, FILE_PAGE_ENTRY, (path) => this.fs.readFile(path));
      const bundle = { ...playerBundle(parts), languages: filePageLanguages() };
      return `export default ${JSON.stringify(bundle)};\n`;
    },
  };
}
