import {
  precacheFor,
  SERVICE_WORKER_FILE,
  writePrecache,
  type BuiltFile,
} from "./precache-list.ts";

/** The parts of a built chunk the service worker's checks read; `code` is rewritten. */
export interface ServiceWorkerChunk {
  readonly type: "chunk";
  readonly fileName: string;
  code: string;
  readonly imports: readonly string[];
  readonly dynamicImports: readonly string[];
  readonly exports: readonly string[];
}

export type BundleFile =
  | ServiceWorkerChunk
  | { readonly type: "asset"; readonly fileName: string; readonly source: string | Uint8Array };

export interface DirectoryEntry {
  readonly name: string;
  isFile(): boolean;
  isDirectory(): boolean;
}

export interface PublicDirPort {
  readdir(path: string): Promise<readonly DirectoryEntry[]>;
  readFile(path: string): Promise<Uint8Array>;
}

/**
 * Writes the list of every built file and every public file into `sw.js` (ADR-0005), and fails
 * the build when `sw.js` is missing or could not run as a classic script.
 */
export async function writeServiceWorker(
  bundle: Readonly<Record<string, BundleFile>>,
  publicFiles: readonly BuiltFile[],
): Promise<void> {
  const worker = bundle[SERVICE_WORKER_FILE];
  if (worker?.type !== "chunk") {
    throw new Error(`the build emitted no ${SERVICE_WORKER_FILE} chunk`);
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
  worker.code = writePrecache(worker.code, await precacheFor([...built, ...publicFiles]));
}

/** Every file below the public directory, with its path relative to it. */
export async function publicFiles(fs: PublicDirPort, publicDir: string): Promise<BuiltFile[]> {
  if (publicDir === "") {
    return [];
  }
  const files: BuiltFile[] = [];
  async function walk(directory: string, prefix: string): Promise<void> {
    for (const entry of await fs.readdir(directory)) {
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
