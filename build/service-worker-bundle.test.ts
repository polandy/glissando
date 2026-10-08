import { describe, expect, it } from "vitest";
import { PRECACHE_PLACEHOLDER } from "../src/sw/precache.ts";
import { precacheFor, writePrecache } from "./precache-list.ts";
import {
  publicFiles,
  writeServiceWorker,
  type BundleFile,
  type PublicDirPort,
  type ServiceWorkerChunk,
} from "./service-worker-bundle.ts";

const WORKER_CODE = `const p=parse("${PRECACHE_PLACEHOLDER}");`;

function worker(overrides: Partial<ServiceWorkerChunk> = {}): ServiceWorkerChunk {
  return {
    type: "chunk",
    fileName: "sw.js",
    code: WORKER_CODE,
    imports: [],
    dynamicImports: [],
    exports: [],
    ...overrides,
  };
}

function bundleWith(sw: BundleFile): Record<string, BundleFile> {
  return {
    "index.html": { type: "asset", fileName: "index.html", source: "<html>" },
    "assets/index-a1.js": { ...worker(), fileName: "assets/index-a1.js", code: "app" },
    "sw.js": sw,
  };
}

const PUBLIC = [{ path: "icons/icon-192.png", content: new Uint8Array([1, 2]) }];

describe("writeServiceWorker", () => {
  it("lists index.html, the built code and the public files in sw.js", async () => {
    const sw = worker();
    const bundle = bundleWith(sw);
    await writeServiceWorker(bundle, PUBLIC);
    const expected = await precacheFor([
      { path: "index.html", content: "<html>" },
      { path: "assets/index-a1.js", content: "app" },
      ...PUBLIC,
    ]);
    expect(expected.files).toEqual(["assets/index-a1.js", "icons/icon-192.png", "index.html"]);
    expect(sw.code).toBe(writePrecache(WORKER_CODE, expected));
  });

  it("fails the build when there is no sw.js", async () => {
    const bundle = bundleWith(worker());
    delete bundle["sw.js"];
    await expect(writeServiceWorker(bundle, PUBLIC)).rejects.toThrow(/emitted no sw\.js/);
  });

  it("fails the build when sw.js is an asset, not the built worker", async () => {
    const bundle = bundleWith({ type: "asset", fileName: "sw.js", source: WORKER_CODE });
    await expect(writeServiceWorker(bundle, PUBLIC)).rejects.toThrow(/emitted no sw\.js/);
  });

  it.each([
    { link: "an import", overrides: { imports: ["assets/shared.js"] } },
    { link: "a dynamic import", overrides: { dynamicImports: ["assets/lazy.js"] } },
    { link: "an export", overrides: { exports: ["helper"] } },
  ])("fails the build when sw.js has $link", async ({ overrides }) => {
    const bundle = bundleWith(worker(overrides));
    await expect(writeServiceWorker(bundle, PUBLIC)).rejects.toThrow(/must import and export/);
  });

  it("fails the build when sw.js lacks the placeholder", async () => {
    const bundle = bundleWith(worker({ code: "const p=1;" }));
    await expect(writeServiceWorker(bundle, PUBLIC)).rejects.toThrow(PRECACHE_PLACEHOLDER);
  });

  it("fails the build when sw.js holds the placeholder twice", async () => {
    const bundle = bundleWith(worker({ code: WORKER_CODE + WORKER_CODE }));
    await expect(writeServiceWorker(bundle, PUBLIC)).rejects.toThrow(/2 times/);
  });
});

describe("publicFiles", () => {
  /** A directory tree: bytes are a file, an object a directory. */
  interface Tree {
    readonly [name: string]: Tree | Uint8Array;
  }

  function fakeFs(root: string, tree: Tree): PublicDirPort {
    function find(path: string): Tree | Uint8Array {
      const names = path.slice(root.length).split("/").filter(Boolean);
      let node: Tree | Uint8Array = tree;
      for (const name of names) {
        const child: Tree | Uint8Array | undefined =
          node instanceof Uint8Array ? undefined : node[name];
        if (child === undefined) {
          throw new Error(`no such file: ${path}`);
        }
        node = child;
      }
      return node;
    }
    return {
      readdir: (path) => {
        const node = find(path);
        if (node instanceof Uint8Array) {
          throw new Error(`not a directory: ${path}`);
        }
        return Promise.resolve(
          Object.entries(node).map(([name, child]) => ({
            name,
            isFile: () => child instanceof Uint8Array,
            isDirectory: () => !(child instanceof Uint8Array),
          })),
        );
      },
      readFile: (path) => {
        const node = find(path);
        if (!(node instanceof Uint8Array)) {
          throw new Error(`not a file: ${path}`);
        }
        return Promise.resolve(node);
      },
    };
  }

  it("lists every file below the public directory, relative to it", async () => {
    const icon = new Uint8Array([1]);
    const manifest = new Uint8Array([2]);
    const fs = fakeFs("/app/public", {
      "manifest.webmanifest": manifest,
      icons: { "icon-192.png": icon, maskable: {} },
    });
    expect(await publicFiles(fs, "/app/public")).toEqual([
      { path: "manifest.webmanifest", content: manifest },
      { path: "icons/icon-192.png", content: icon },
    ]);
  });

  it("lists nothing without a public directory", async () => {
    expect(await publicFiles(fakeFs("/", {}), "")).toEqual([]);
  });
});
