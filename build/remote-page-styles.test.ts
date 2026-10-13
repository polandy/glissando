import { describe, expect, it } from "vitest";
import { darkTokenDeclarations, inlineFontFaces } from "./remote-page-styles.ts";

const TOKENS = `@font-face {
  font-family: "Instrument Sans";
  src: url("../../assets/fonts/instrumentsans.woff2") format("woff2");
  font-weight: 400 600;
}
@font-face {
  font-family: "Baloo 2";
  src: url("../../assets/fonts/baloo2.woff2") format("woff2");
}

:root {
  --gl-ground: #f6f5f8;
  --gl-ink: #221d33;
  --gl-faint: #9c97ad;
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --gl-ground: #121019;
  }
}

:root[data-theme="dark"] {
  --gl-ground: #121019;
  --gl-ink: #edeaf3;
  --gl-faint: #6c6680;
  color-scheme: dark;
}
`;

describe("darkTokenDeclarations", () => {
  it("gives the page's tokens their dark values in a dark system theme", () => {
    expect(darkTokenDeclarations(TOKENS, ":root{--gl-ground:#f6f5f8;--gl-ink:#221d33}")).toBe(
      "@media (prefers-color-scheme: dark){:root{--gl-ground:#121019;--gl-ink:#edeaf3;" +
        "color-scheme:dark}}",
    );
  });

  it("leaves out the dark values of tokens the page does not use", () => {
    expect(darkTokenDeclarations(TOKENS, ":root{--gl-ink:#221d33}")).not.toContain("--gl-faint");
  });

  it("fails loud on design tokens without a dark theme", () => {
    expect(() => darkTokenDeclarations(":root{--gl-ink:#221d33}", "")).toThrow(/dark/);
  });
});

describe("inlineFontFaces", () => {
  it("writes each font of the design tokens into the page as a data URL", async () => {
    const read: string[] = [];
    const faces = await inlineFontFaces(TOKENS, "/repo", (path) => {
      read.push(path);
      return Promise.resolve(new Uint8Array([1, 2, 3]));
    });
    expect(read).toEqual([
      "/repo/assets/fonts/instrumentsans.woff2",
      "/repo/assets/fonts/baloo2.woff2",
    ]);
    expect(faces).toContain('font-family: "Baloo 2"');
    expect(faces).toContain('url("data:font/woff2;base64,AQID") format("woff2")');
    expect(faces).not.toContain("../../assets");
  });

  it("fails loud on design tokens without fonts", async () => {
    await expect(
      inlineFontFaces(":root{}", "/repo", () => Promise.resolve(new Uint8Array())),
    ).rejects.toThrow(/font/);
  });
});
