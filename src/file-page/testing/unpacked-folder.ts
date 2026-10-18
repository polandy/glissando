import { readEntry, readZipDirectory } from "../../glissando-file/zip-reader";
import type { PickedEntry } from "../folder-source";

/** The folder name the unpacked fixtures sit in, as a folder picker reports it. */
export const UNPACKED_FOLDER = "Herbst";

/** `file`'s entries as the files of the folder it was unpacked into, each under `folder`. */
export async function unpackedFolder(file: Blob, folder = UNPACKED_FOLDER): Promise<PickedEntry[]> {
  const entries: PickedEntry[] = [];
  for (const entry of (await readZipDirectory(file)) ?? []) {
    const read = await readEntry(file, entry);
    if (read.kind !== "ok") throw new Error(`the fixture's "${entry.name}" does not read`);
    entries.push({ relativePath: `${folder}/${entry.name}`, file: read.data });
  }
  return entries;
}

/** `entries` without the files at the paths `gone`, below the folder. */
export function without(entries: readonly PickedEntry[], ...gone: string[]): PickedEntry[] {
  return entries.filter(
    ({ relativePath }) => !gone.some((path) => relativePath.endsWith(`/${path}`)),
  );
}

/** `entries` with `glissando.json` holding `text`. */
export function withManifestText(entries: readonly PickedEntry[], text: string): PickedEntry[] {
  return [
    ...without(entries, "glissando.json"),
    { relativePath: `${UNPACKED_FOLDER}/glissando.json`, file: new Blob([text]) },
  ];
}
