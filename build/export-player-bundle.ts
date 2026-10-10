import { encodeBase64 } from "../src/html-export/base64.ts";

const FONT_DATA_URL_PREFIX = "data:font/woff2;base64,";
/** The design tokens' first `:root` block holds every token with its light value. */
const ROOT_BLOCK = /(?:^|\n):root\s*\{([^}]*)\}/;
const DECLARATION = /(--gl-[\w-]+)\s*:\s*([^;]+);/g;
const TOKEN_USE = /var\(\s*(--gl-[\w-]+)/g;

/**
 * A `:root` rule declaring the design tokens `pageCss` uses, and those they refer to, as the
 * light theme defines them; the exported page is dark in both themes, like the player.
 */
export function tokenDeclarations(tokensCss: string, pageCss: string): string {
  const rootBlock = ROOT_BLOCK.exec(tokensCss)?.[1];
  if (rootBlock === undefined) {
    throw new Error("the design tokens have no :root block to take the page's tokens from");
  }
  const defined = new Map(
    [...rootBlock.matchAll(DECLARATION)].map(([, name, value]) => [name, value?.trim()]),
  );
  const ownTokens = new Set([...pageCss.matchAll(DECLARATION)].map(([, name]) => name));
  const wanted: string[] = [];
  const want = (css: string) => {
    for (const [, name] of css.matchAll(TOKEN_USE)) {
      if (name === undefined || ownTokens.has(name) || wanted.includes(name)) continue;
      const value = defined.get(name);
      if (value === undefined) {
        throw new Error(`the page's CSS uses ${name}, which src/styles/tokens.css does not define`);
      }
      wanted.push(name);
      want(value);
    }
  };
  want(pageCss);
  return `:root{${wanted.map((name) => `${name}:${defined.get(name) ?? ""}`).join(";")}}`;
}

/** The parts of a built file the export player's checks read. */
export type BuiltPlayerFile =
  | { readonly type: "chunk"; readonly fileName: string; readonly code: string }
  | { readonly type: "asset"; readonly fileName: string; readonly source: string | Uint8Array };

/**
 * The page's script and stylesheet from the export player's build, which must emit nothing
 * else: a further file (a worker, an image) would be missing from the self-contained page.
 */
export function bundleParts(files: readonly BuiltPlayerFile[]): { script: string; style: string } {
  const chunks = files.filter((file) => file.type === "chunk");
  const styles = files.filter((file) => file.type === "asset" && file.fileName.endsWith(".css"));
  const others = files.filter((file) => file.type !== "chunk" && !file.fileName.endsWith(".css"));
  if (others.length > 0 || chunks.length !== 1) {
    const extra = [...others, ...chunks.slice(1)].map((file) => file.fileName).join(", ");
    throw new Error(
      `the export player must build into one script and one stylesheet, it also emitted ` +
        `${extra}; inline it (a worker as ?worker&inline) so the page stays self-contained`,
    );
  }
  const [chunk] = chunks;
  const [style] = styles;
  if (chunk?.type !== "chunk" || style?.type !== "asset" || styles.length !== 1) {
    throw new Error("the export player's build emitted no stylesheet; import page.css in main.ts");
  }
  const css =
    typeof style.source === "string" ? style.source : new TextDecoder().decode(style.source);
  return { script: chunk.code, style: css };
}

/** The virtual module's source: the `PlayerBundle` as its default export. */
export function playerBundleModule(parts: {
  readonly script: string;
  readonly style: string;
  readonly fontBytes: Uint8Array;
}): string {
  const bundle = {
    script: parts.script,
    style: parts.style,
    captionFontDataUrl: `${FONT_DATA_URL_PREFIX}${encodeBase64(parts.fontBytes)}`,
  };
  return `export default ${JSON.stringify(bundle)};\n`;
}
