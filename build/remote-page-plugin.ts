import type { Plugin } from "vite";
import { remotePageLanguages } from "../src/app/remote-page/remote-page-languages.ts";
import { remotePageHtml } from "../src/remote-page/remote-page-html.ts";
import { buildPlayerPage } from "./export-player-plugin.ts";
import { darkTokenDeclarations, inlineFontFaces } from "./remote-page-styles.ts";

/** Caddy answers every `/r/<remoteSecret>` with this file (dev-docs/tv_remote/REMOTE_PAGE.md). */
export const REMOTE_PAGE_FILE = "remote.html";
/** The remote page as text, for its browser test; typed in src/remote-page/testing/. */
export const REMOTE_PAGE_MODULE = "virtual:glissando-remote-page";
const RESOLVED_REMOTE_PAGE_MODULE = `\0${REMOTE_PAGE_MODULE}`;
const REMOTE_PAGE_ENTRY = "src/remote-page/main.ts";
const DESIGN_TOKENS = "src/styles/tokens.css";

/**
 * Builds the phone's remote for a slideshow on the TV into the build as `remote.html`: its own
 * script, both languages' words, the design tokens in both themes and the brand's fonts, all
 * inline. It also serves the page as `virtual:glissando-remote-page`, which only its browser
 * test imports.
 */
export function remotePagePlugin(): Plugin {
  let root = "";
  return {
    name: "glissando:remote-page",
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      return id === REMOTE_PAGE_MODULE ? RESOLVED_REMOTE_PAGE_MODULE : null;
    },
    async load(id) {
      if (id !== RESOLVED_REMOTE_PAGE_MODULE) return null;
      const page = await remotePage(root, (path) => this.fs.readFile(path));
      return `export default ${JSON.stringify(page)};\n`;
    },
    async generateBundle() {
      const page = await remotePage(root, (path) => this.fs.readFile(path));
      this.emitFile({ type: "asset", fileName: REMOTE_PAGE_FILE, source: page });
    },
  };
}

async function remotePage(
  root: string,
  readFile: (path: string) => Promise<Uint8Array>,
): Promise<string> {
  const { script, style } = await buildPlayerPage(root, REMOTE_PAGE_ENTRY, readFile);
  const tokens = new TextDecoder().decode(await readFile(`${root}/${DESIGN_TOKENS}`));
  return remotePageHtml({
    languages: remotePageLanguages(),
    fontFaces: await inlineFontFaces(tokens, root, readFile),
    style: `${style}\n${darkTokenDeclarations(tokens, style)}`,
    script,
  });
}
