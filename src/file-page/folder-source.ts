import { MANIFEST_ENTRY_NAME } from "../glissando-file/glissando-manifest";

/** Where `index.html` reads the unpacked `.glissando` file from: beside it, or a picked folder. */
export interface FolderSource {
  /** The file at `path` below the folder; null when the folder has none. */
  read(path: string): Promise<Blob | null>;
  has(path: string): Promise<boolean>;
}

/**
 * The browser refuses the page to read beside it: Chromium and WebKit, for a page opened from
 * `file://`. The page then asks for the folder instead.
 */
export class FolderUnreadableError extends Error {
  override readonly name = "FolderUnreadableError";
}

/** A file the person picked with the folder (`File.webkitRelativePath`, the `File` itself). */
export interface PickedEntry {
  readonly relativePath: string;
  readonly file: Blob;
}

const PATH_SEPARATOR = "/";

/**
 * The files beside the page, fetched: from a web server, or from `file://` where the browser
 * allows it (Firefox). `fetch` rejects with a `TypeError` where the browser refuses.
 */
export function fetchedFolder(fetch: (path: string) => Promise<Response>): FolderSource {
  return {
    async read(path) {
      let response: Response;
      try {
        response = await fetch(path);
      } catch (error: unknown) {
        if (error instanceof TypeError) {
          throw new FolderUnreadableError(`the browser refuses to read ${path}`, { cause: error });
        }
        throw error;
      }
      return response.ok ? response.blob() : null;
    },
    async has(path) {
      try {
        const response = await fetch(path);
        // Only whether it is there matters; the bytes are read once it plays.
        await response.body?.cancel();
        return response.ok;
      } catch (error: unknown) {
        if (error instanceof TypeError) return false;
        throw error;
      }
    },
  };
}

/**
 * The picked folder's files, by their path below the shallowest `glissando.json` among them, so
 * picking the folder around the unpacked one works too; files outside it are left out.
 */
export function pickedFolder(entries: readonly PickedEntry[]): FolderSource {
  const segments = entries.map((entry) => entry.relativePath.split(PATH_SEPARATOR));
  const manifests = segments.filter((parts) => parts.at(-1) === MANIFEST_ENTRY_NAME);
  const shallowest = manifests.reduce<string[] | null>(
    (best, parts) => (best === null || parts.length < best.length ? parts : best),
    null,
  );
  const files = new Map<string, Blob>();
  if (shallowest !== null) {
    const root = shallowest.slice(0, -1);
    const prefix = root.map((part) => `${part}${PATH_SEPARATOR}`).join("");
    for (const entry of entries) {
      if (entry.relativePath.startsWith(prefix)) {
        files.set(entry.relativePath.slice(prefix.length), entry.file);
      }
    }
  }
  return {
    read: async (path) => files.get(path) ?? null,
    has: async (path) => files.has(path),
  };
}
