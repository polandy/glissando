import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { readEntry, readZipDirectory } from "../../src/glissando-file/zip-reader";

/**
 * Unpacks a downloaded `.glissando` file's entries into `directory` on disk, as a person would
 * with a ZIP tool before opening its `index.html`. `omit` leaves named entries out, so a case can
 * build a folder that lacks a file the slideshow needs. Returns every entry name written.
 */
export async function unpackGlissandoFile(
  file: Blob,
  directory: string,
  omit: ReadonlySet<string> = new Set(),
): Promise<string[]> {
  const entries = (await readZipDirectory(file)) ?? [];
  const written: string[] = [];
  for (const entry of entries) {
    if (omit.has(entry.name)) continue;
    const read = await readEntry(file, entry);
    if (read.kind !== "ok") throw new Error(`"${entry.name}" does not unpack: ${read.reason}`);
    const path = join(directory, entry.name);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, new Uint8Array(await read.data.arrayBuffer()));
    written.push(entry.name);
  }
  return written;
}
