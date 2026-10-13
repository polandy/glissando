import { encodeBase64 } from "../src/html-export/base64.ts";

/** The design tokens' dark theme, as the app's theme switch sets it. */
const DARK_BLOCK = /:root\[data-theme="dark"\]\s*\{([^}]*)\}/;
const DECLARATION = /(--gl-[\w-]+|color-scheme)\s*:\s*([^;]+);/g;
/** A token the page's own `:root` rule declares, its last declaration without a `;`. */
const DECLARED_NAME = /(--gl-[\w-]+)\s*:/g;
const FONT_FACE = /@font-face\s*\{[^}]*\}/g;
const FONT_URL = /url\("([^"]+)"\)/g;
/** Where tokens.css lies, which its font URLs are relative to. */
const TOKENS_DIRECTORY = "file:///src/styles/";
const FONT_DATA_URL_PREFIX = "data:font/woff2;base64,";

/**
 * A rule giving the tokens the page's light `:root` block declares their dark values when the
 * phone is in a dark theme; the remote follows the system, it has no theme switch.
 */
export function darkTokenDeclarations(tokensCss: string, pageTokens: string): string {
  const darkBlock = DARK_BLOCK.exec(tokensCss)?.[1];
  if (darkBlock === undefined) {
    throw new Error(
      'the design tokens have no :root[data-theme="dark"] block to take dark values from',
    );
  }
  const used = new Set([...pageTokens.matchAll(DECLARED_NAME)].map(([, name]) => name));
  used.add("color-scheme");
  const declarations = [...darkBlock.matchAll(DECLARATION)]
    .filter(([, name]) => used.has(name))
    .map(([, name, value]) => `${name}:${value?.trim() ?? ""}`);
  return `@media (prefers-color-scheme: dark){:root{${declarations.join(";")}}}`;
}

/** The design tokens' `@font-face` rules with each font read into a data URL. */
export async function inlineFontFaces(
  tokensCss: string,
  root: string,
  readFile: (path: string) => Promise<Uint8Array>,
): Promise<string> {
  const faces = tokensCss.match(FONT_FACE) ?? [];
  if (faces.length === 0) throw new Error("the design tokens declare no @font-face to inline");
  const inlined = await Promise.all(
    faces.map(async (face) => {
      const urls = [...face.matchAll(FONT_URL)].map(([, url]) => url ?? "");
      const dataUrls = await Promise.all(
        urls.map(async (url) => {
          const path = `${root}${new URL(url, TOKENS_DIRECTORY).pathname}`;
          return `${FONT_DATA_URL_PREFIX}${encodeBase64(await readFile(path))}`;
        }),
      );
      return urls.reduce(
        (rule, url, index) => rule.replace(`url("${url}")`, `url("${dataUrls[index] ?? ""}")`),
        face,
      );
    }),
  );
  return inlined.join("\n");
}
