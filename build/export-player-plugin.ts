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
 * font, and serves them as `virtual:glissando-export-player` (dev-docs/html_export/CODE.md).
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
      const readFile = (path: string) => this.fs.readFile(path);
      return playerBundleModule(await buildPlayerPage(root, EXPORT_PLAYER_ENTRY, readFile));
    },
  };
}

/** A player page's parts: its script, its stylesheet with the design tokens, the caption font. */
export interface PlayerPageParts {
  readonly script: string;
  readonly style: string;
  readonly fontBytes: Uint8Array;
}

/**
 * Builds the player page whose script starts at `entry` (`src/export-player/main.ts`, or the
 * share page's) into one self-contained script and stylesheet.
 */
export async function buildPlayerPage(
  root: string,
  entry: string,
  readFile: (path: string) => Promise<Uint8Array>,
): Promise<PlayerPageParts> {
  const { script, style } = bundleParts(await buildPlayerScript(root, entry));
  const tokens = new TextDecoder().decode(await readFile(`${root}/${DESIGN_TOKENS}`));
  const fontBytes = await readFile(`${root}/${CAPTION_FONT}`);
  return { script, style: `${tokenDeclarations(tokens, style)}\n${style}`, fontBytes };
}

/** A separate build: the page's script must not share chunks with the app. */
async function buildPlayerScript(root: string, entry: string): Promise<BuiltPlayerFile[]> {
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
        input: `${root}/${entry}`,
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
