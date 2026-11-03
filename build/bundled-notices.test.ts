import { describe, expect, it } from "vitest";
import { bundledNotices } from "./bundled-notices.ts";

const ROOT = "/app";
const MEDIABUNNY = `${ROOT}/node_modules/mediabunny/package.json`;

function packages(files: Readonly<Record<string, unknown>>) {
  return (path: string): Promise<Uint8Array> => {
    const json = files[path];
    if (json === undefined) return Promise.reject(new Error(`ENOENT: ${path}`));
    return Promise.resolve(new TextEncoder().encode(JSON.stringify(json)));
  };
}

const MEDIABUNNY_JSON = {
  name: "mediabunny",
  version: "1.62.1",
  license: "MPL-2.0",
  repository: { type: "git", url: "git+https://github.com/Vanilagy/mediabunny.git" },
};

describe("bundledNotices", () => {
  it("names each npm package among the chunk's modules once, with its licence and source", async () => {
    const notices = await bundledNotices(
      [
        `${ROOT}/src/export-player/main.ts`,
        `${ROOT}/node_modules/mediabunny/dist/modules/src/index.js`,
        `${ROOT}/node_modules/mediabunny/dist/modules/src/logging.js`,
        "\0vite/modulepreload-polyfill.js",
      ],
      packages({ [MEDIABUNNY]: MEDIABUNNY_JSON }),
    );

    expect(notices).toEqual([
      {
        name: "mediabunny",
        version: "1.62.1",
        licenseId: "MPL-2.0",
        sourceUrl: "https://github.com/Vanilagy/mediabunny",
      },
    ]);
  });

  it("is empty for a chunk of the app's own modules only", async () => {
    expect(await bundledNotices([`${ROOT}/src/share-page/main.ts`], packages({}))).toEqual([]);
  });

  it("finds a scoped package and a package nested under another's node_modules", async () => {
    const notices = await bundledNotices(
      [
        `${ROOT}/node_modules/@scope/lib/index.js`,
        `${ROOT}/node_modules/mediabunny/node_modules/inner/index.js?v=1`,
      ],
      packages({
        [`${ROOT}/node_modules/@scope/lib/package.json`]: {
          name: "@scope/lib",
          version: "2.0.0",
          license: "MIT",
          repository: "https://github.com/scope/lib",
        },
        [`${ROOT}/node_modules/mediabunny/node_modules/inner/package.json`]: {
          name: "inner",
          version: "0.1.0",
          license: "ISC",
          repository: { url: "https://example.com/inner.git" },
        },
      }),
    );

    expect(notices.map((notice) => [notice.name, notice.version, notice.sourceUrl])).toEqual([
      ["@scope/lib", "2.0.0", "https://github.com/scope/lib"],
      ["inner", "0.1.0", "https://example.com/inner"],
    ]);
  });

  it("fails on a package that names no licence or no source, naming the package", async () => {
    const modules = [`${ROOT}/node_modules/mediabunny/dist/index.js`];
    await expect(
      bundledNotices(
        modules,
        packages({ [MEDIABUNNY]: { ...MEDIABUNNY_JSON, license: undefined } }),
      ),
    ).rejects.toThrow(/mediabunny.*licen/);
    await expect(
      bundledNotices(
        modules,
        packages({ [MEDIABUNNY]: { ...MEDIABUNNY_JSON, repository: undefined } }),
      ),
    ).rejects.toThrow(/mediabunny.*source/);
  });
});
