import type { Plugin, Rolldown } from "vite";
import {
  precacheFor,
  SERVICE_WORKER_FILE,
  writePrecache,
  type BuiltFile,
} from "./precache-list.ts";

const APP_ENTRY = "index.html";
const SERVICE_WORKER_ENTRY = "sw";
const SERVICE_WORKER_SOURCE = "src/sw/service-worker.ts";
const ASSET_FILE_NAMES = "assets/[name]-[hash].js";

/**
 * Builds `src/sw/` as `sw.js` at the app root and writes the list of every built file and
 * every `public/` file into it (ADR-0005).
 */
export function serviceWorkerPlugin(): Plugin {
  let publicDir = "";
  return {
    name: "glissando:service-worker",
    apply: "build",
    // After Vite has emitted index.html, so the list includes it.
    enforce: "post",
    config: () => ({
      build: {
        rolldownOptions: {
          input: { index: APP_ENTRY, [SERVICE_WORKER_ENTRY]: SERVICE_WORKER_SOURCE },
          output: {
            entryFileNames: (chunk) =>
              chunk.name === SERVICE_WORKER_ENTRY ? SERVICE_WORKER_FILE : ASSET_FILE_NAMES,
          },
        },
      },
    }),
    configResolved(config) {
      publicDir = config.publicDir;
    },
    async generateBundle(_options, bundle) {
      const worker = bundle[SERVICE_WORKER_FILE];
      if (worker?.type !== "chunk") {
        throw new Error(
          `the build emitted no ${SERVICE_WORKER_FILE} from ${SERVICE_WORKER_SOURCE}`,
        );
      }
      // A classic script cannot import: anything shared with the app would become an import.
      const links = [...worker.imports, ...worker.dynamicImports, ...worker.exports];
      if (links.length > 0) {
        throw new Error(
          `${SERVICE_WORKER_FILE} must import and export nothing, it links ${links.join(", ")}; ` +
            `move code it shares with the app out of the modules the app imports`,
        );
      }
      const built: BuiltFile[] = Object.values(bundle).map((file) => ({
        path: file.fileName,
        content: file.type === "chunk" ? file.code : file.source,
      }));
      const precache = await precacheFor([...built, ...(await publicFiles(this.fs, publicDir))]);
      worker.code = writePrecache(worker.code, precache);
    },
  };
}

/** Every file below the public directory, with its path relative to it. */
async function publicFiles(
  fs: Rolldown.PluginContext["fs"],
  publicDir: string,
): Promise<BuiltFile[]> {
  if (publicDir === "") {
    return [];
  }
  const files: BuiltFile[] = [];
  async function walk(directory: string, prefix: string): Promise<void> {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) {
        await walk(path, `${prefix}${entry.name}/`);
      } else if (entry.isFile()) {
        files.push({ path: `${prefix}${entry.name}`, content: await fs.readFile(path) });
      }
    }
  }
  await walk(publicDir, "");
  return files;
}
