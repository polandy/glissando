import { build, type Plugin, type Rolldown } from "vite";
import {
  bundleParts,
  playerBundleModule,
  tokenDeclarations,
  type BuiltPlayerFile,
} from "./export-player-bundle.ts";

/** The module the app imports the export player from; typed in src/html-export/browser/. */
export const EXPORT_PLAYER_MODULE = "virtual:glissando-export-player";
const RESOLVED_EXPORT_PLAYER_MODULE = `\0${EXPORT_PLAYER_MODULE}`;
const EXPORT_PLAYER_ENTRY = "src/export-player/main.ts";
const DESIGN_TOKENS = "src/styles/tokens.css";
const CAPTION_FONT = "assets/fonts/instrumentsans-latin-wght400-600.woff2";

/**
 * Builds `src/export-player/` into one self-contained script and stylesheet, with the caption
 * font, and serves them as `virtual:glissando-export-player` (dev-docs/HTML_EXPORT.md, "Code").
 * The app imports it dynamically, so it is a chunk of its own, loaded on the first export and
 * precached like every built file (ADR-0005).
 */
export function exportPlayerPlugin(): Plugin {
  let root = "";
  return {
    name: "glissando:export-player",
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      return id === EXPORT_PLAYER_MODULE ? RESOLVED_EXPORT_PLAYER_MODULE : null;
    },
    async load(id) {
      if (id !== RESOLVED_EXPORT_PLAYER_MODULE) {
        return null;
      }
      const { script, style } = bundleParts(await buildExportPlayer(root));
      const tokens = await this.fs.readFile(`${root}/${DESIGN_TOKENS}`, { encoding: "utf8" });
      const fontBytes = await this.fs.readFile(`${root}/${CAPTION_FONT}`);
      return playerBundleModule({
        script,
        style: `${tokenDeclarations(tokens, style)}\n${style}`,
        fontBytes,
      });
    },
  };
}

/** A separate build: the page's script must not share chunks with the app. */
async function buildExportPlayer(root: string): Promise<BuiltPlayerFile[]> {
  const result = await build({
    configFile: false,
    root,
    logLevel: "warn",
    publicDir: false,
    mode: "production",
    // The decode worker becomes a classic script inside the page (`?worker&inline`).
    worker: { format: "iife" },
    build: {
      write: false,
      cssCodeSplit: false,
      modulePreload: false,
      reportCompressedSize: false,
      rolldownOptions: {
        input: `${root}/${EXPORT_PLAYER_ENTRY}`,
        output: { format: "iife" },
      },
    },
  });
  const outputs: Rolldown.RolldownOutput[] = Array.isArray(result)
    ? result
    : "output" in result
      ? [result]
      : [];
  if (outputs.length === 0) {
    throw new Error("the export player's build returned a watcher instead of its files");
  }
  return outputs.flatMap(({ output }) =>
    output.map((file): BuiltPlayerFile =>
      file.type === "chunk"
        ? { type: "chunk", fileName: file.fileName, code: file.code }
        : { type: "asset", fileName: file.fileName, source: file.source },
    ),
  );
}
