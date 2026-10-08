import type { Plugin } from "vite";
import { SERVICE_WORKER_FILE } from "./precache-list.ts";
import { publicFiles, writeServiceWorker, type PublicDirPort } from "./service-worker-bundle.ts";

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
      const fs: PublicDirPort = {
        readdir: (path) => this.fs.readdir(path, { withFileTypes: true }),
        readFile: (path) => this.fs.readFile(path),
      };
      await writeServiceWorker(bundle, await publicFiles(fs, publicDir));
    },
  };
}
