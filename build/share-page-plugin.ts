import type { Plugin } from "vite";
import { sharePageLanguages } from "../src/app/share-page/share-page-languages.ts";
import { sharePageHtml } from "../src/share-page/share-page-html.ts";
import { captionFontDataUrl } from "./export-player-bundle.ts";
import { buildPlayerPage } from "./export-player-plugin.ts";

/** Caddy answers every `/s/<token>` with this file (dev-docs/SHARE_LINK.md). */
export const SHARE_PAGE_FILE = "share.html";
/** The share page as text, for its browser test; typed in src/share-page/testing/. */
export const SHARE_PAGE_MODULE = "virtual:glissando-share-page";
const RESOLVED_SHARE_PAGE_MODULE = `\0${SHARE_PAGE_MODULE}`;
const SHARE_PAGE_ENTRY = "src/share-page/main.ts";

/**
 * Builds the page a share link opens into the build as `share.html`: the export player's page
 * with the share page's script, both languages' words, and everything inline
 * (dev-docs/share_link/RECIPIENTS_PAGE.md). It also serves the page as
 * `virtual:glissando-share-page`, which only its browser test imports.
 */
export function sharePagePlugin(): Plugin {
  let root = "";
  return {
    name: "glissando:share-page",
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      return id === SHARE_PAGE_MODULE ? RESOLVED_SHARE_PAGE_MODULE : null;
    },
    async load(id) {
      if (id !== RESOLVED_SHARE_PAGE_MODULE) return null;
      const page = await sharePage(root, (path) => this.fs.readFile(path));
      return `export default ${JSON.stringify(page)};\n`;
    },
    async generateBundle() {
      const page = await sharePage(root, (path) => this.fs.readFile(path));
      this.emitFile({ type: "asset", fileName: SHARE_PAGE_FILE, source: page });
    },
  };
}

async function sharePage(
  root: string,
  readFile: (path: string) => Promise<Uint8Array>,
): Promise<string> {
  const { script, style, fontBytes } = await buildPlayerPage(root, SHARE_PAGE_ENTRY, readFile);
  return sharePageHtml({
    languages: sharePageLanguages(),
    style,
    captionFontDataUrl: captionFontDataUrl(fontBytes),
    script,
  });
}
