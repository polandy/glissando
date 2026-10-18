import { MANIFEST_ENTRY_NAME, type GlissandoManifest } from "../glissando-file/glissando-manifest";
import { mediaDescriptors } from "../glissando-file/media-descriptors";
import { readManifest } from "../glissando-file/read-manifest";
import { FolderUnreadableError, type FolderSource } from "./folder-source";

/** Why a folder cannot play; the choose card says so and lets the person pick again. */
export type FolderProblem =
  | { readonly kind: "noManifest" }
  | { readonly kind: "foreign" }
  | { readonly kind: "newer" }
  | { readonly kind: "damaged"; readonly reason: string }
  | { readonly kind: "missing"; readonly files: readonly string[] };

export type FolderCheck =
  | { readonly kind: "ok"; readonly manifest: GlissandoManifest }
  /** The browser refuses the page to read beside it: the person picks the folder. */
  | { readonly kind: "unreadable" }
  | FolderProblem;

/**
 * Reads `glissando.json` with the app's own checks (ADR-0038) and makes sure every picture, song
 * and clip it names is in the folder; thumbnails are not, as the player never shows them.
 */
export async function checkFolder(folder: FolderSource): Promise<FolderCheck> {
  let manifestFile: Blob | null;
  try {
    manifestFile = await folder.read(MANIFEST_ENTRY_NAME);
  } catch (error: unknown) {
    if (error instanceof FolderUnreadableError) return { kind: "unreadable" };
    throw error;
  }
  if (manifestFile === null) return { kind: "noManifest" };
  const reading = readManifest(await manifestFile.text());
  if (reading.kind !== "ok") return reading;
  const descriptors = mediaDescriptors(reading.manifest);
  if (descriptors.kind === "damaged") return descriptors;
  const played = [...descriptors.byPath]
    .filter(([, descriptor]) => descriptor.kind !== "thumbnail")
    .map(([path]) => path);
  const present = await Promise.all(played.map((path) => folder.has(path)));
  const missing = played.filter((_, index) => !present[index]);
  return missing.length === 0
    ? { kind: "ok", manifest: reading.manifest }
    : { kind: "missing", files: missing };
}
