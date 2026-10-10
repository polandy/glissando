import { describe, expect, it } from "vitest";
import { bundleParts, playerBundleModule, tokenDeclarations } from "./export-player-bundle.ts";

const TOKENS = `
@font-face { font-family: "X"; src: url("x.woff2"); }
:root {
  --gl-ink: #221d33;
  --gl-accent: #ff9f7f;
  --gl-inverse-bg: var(--gl-ink);
  --gl-unused: 1px;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --gl-ink: #edeaf3;
  }
}
`;

describe("tokenDeclarations", () => {
  it("declares on :root exactly the tokens the page's CSS uses, with their light values", () => {
    expect(tokenDeclarations(TOKENS, ".a{color:var(--gl-accent)}")).toBe(
      ":root{--gl-accent:#ff9f7f}",
    );
  });

  it("includes the tokens a used token refers to", () => {
    expect(tokenDeclarations(TOKENS, ".a{background:var(--gl-inverse-bg)}")).toBe(
      ":root{--gl-inverse-bg:var(--gl-ink);--gl-ink:#221d33}",
    );
  });

  it("fails on a token the design tokens do not define, naming it", () => {
    expect(() => tokenDeclarations(TOKENS, ".a{color:var(--gl-missing)}")).toThrow(/--gl-missing/);
  });

  it("leaves a token the page's CSS sets itself to the page", () => {
    expect(tokenDeclarations(TOKENS, ".a{--gl-own:2px;width:var(--gl-own)}")).toBe(":root{}");
  });
});

describe("bundleParts", () => {
  it("takes the one script chunk and the one stylesheet", () => {
    expect(
      bundleParts([
        { type: "chunk", fileName: "main.js", code: "run()" },
        { type: "asset", fileName: "style.css", source: ".a{}" },
      ]),
    ).toEqual({ script: "run()", style: ".a{}" });
  });

  it("fails when the build emitted any other file, e.g. a worker that was not inlined", () => {
    expect(() =>
      bundleParts([
        { type: "chunk", fileName: "main.js", code: "run()" },
        { type: "asset", fileName: "style.css", source: ".a{}" },
        { type: "asset", fileName: "assets/picture-decode-worker.js", source: "" },
      ]),
    ).toThrow(/picture-decode-worker\.js/);
  });

  it("fails without a stylesheet", () => {
    expect(() => bundleParts([{ type: "chunk", fileName: "main.js", code: "run()" }])).toThrow(
      /stylesheet/,
    );
  });
});

describe("playerBundleModule", () => {
  it("exports the script, the style and the font as a data: URL", async () => {
    const source = playerBundleModule({
      script: 'run("</script>")',
      style: ".a{}",
      fontBytes: new Uint8Array([0, 1, 2]),
    });
    const url = `data:text/javascript;base64,${btoa(source)}`;
    const module = (await import(/* @vite-ignore */ url)) as { default: unknown };

    expect(module.default).toEqual({
      script: 'run("</script>")',
      style: ".a{}",
      captionFontDataUrl: "data:font/woff2;base64,AAEC",
    });
  });
});
