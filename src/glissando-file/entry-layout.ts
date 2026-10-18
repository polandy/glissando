import { MANIFEST_ENTRY_NAME } from "./glissando-manifest";
import type { ZipEntry } from "./zip-reader";

/**
 * Which of a ZIP's entries are a .glissando file's, once a ZIP tool has packed it again
 * (ADR-0038): the entries a tool adds by itself are skipped unread, and one folder every entry
 * shares, as zipping a folder adds it, is taken off; an entry outside that folder refuses the
 * file, as it could stand in for one inside. What is left is named as the format names it;
 * whether each name is one the format allows is `isAllowedEntryName`'s to decide.
 */

export type EntryLayout =
  | { readonly kind: "glissando"; readonly entries: ReadonlyMap<string, ZipEntry> }
  | { readonly kind: "damaged"; readonly reason: string }
  | { readonly kind: "foreign" };

const PATH_SEPARATOR = "/";
/** Where macOS puts each file's resource fork when it zips a folder. */
const MACOS_RESOURCE_FOLDER = "__MACOSX";
/** A file's resource fork beside it, as macOS writes it outside `__MACOSX`. */
const APPLE_DOUBLE_PREFIX = "._";
/** Folder settings and caches that Finder and Windows Explorer zip along, compared lowercase. */
const TOOL_FILE_NAMES: ReadonlySet<string> = new Set([".ds_store", "thumbs.db", "desktop.ini"]);
/** Segments that would leave a folder, or a name that would start at the root. */
const PATH_ESCAPES: ReadonlySet<string> = new Set(["", ".", ".."]);

export function glissandoEntries(entries: readonly ZipEntry[]): EntryLayout {
  const own = entries.filter((entry) => !isToolEntry(entry));
  const names = own.map((entry) => entry.name);
  const folder = names.includes(MANIFEST_ENTRY_NAME) ? "" : sharedFolder(names);
  if (folder === null) {
    return { kind: "foreign" };
  }
  const outside = own.find((entry) => !entry.name.startsWith(folder));
  if (outside !== undefined) {
    return {
      kind: "damaged",
      reason: `"${outside.name}" is outside the folder "${folder}" that holds ${MANIFEST_ENTRY_NAME}`,
    };
  }
  return {
    kind: "glissando",
    entries: new Map(own.map((entry) => [entry.name.slice(folder.length), entry])),
  };
}

/** The one top-level folder holding glissando.json, with its separator; null without one. */
function sharedFolder(names: readonly string[]): string | null {
  const manifestSuffix = PATH_SEPARATOR + MANIFEST_ENTRY_NAME;
  const folders = names.filter(
    (name) => name.endsWith(manifestSuffix) && segments(name).length === 2,
  );
  const [only, ...others] = folders;
  if (only === undefined || others.length > 0) {
    return null;
  }
  return only.slice(0, only.length - MANIFEST_ENTRY_NAME.length);
}

/** An entry a ZIP tool adds by itself; a name that would leave its folder never counts as one. */
function isToolEntry(entry: ZipEntry): boolean {
  const parts = segments(entry.name);
  const isDirectory = entry.name.endsWith(PATH_SEPARATOR);
  const pathParts = isDirectory ? parts.slice(0, -1) : parts;
  if (entry.name.includes("\\") || pathParts.some((part) => PATH_ESCAPES.has(part))) {
    return false;
  }
  if (isDirectory) {
    return entry.size === 0;
  }
  const last = parts[parts.length - 1] ?? "";
  return (
    parts[0] === MACOS_RESOURCE_FOLDER ||
    last.startsWith(APPLE_DOUBLE_PREFIX) ||
    TOOL_FILE_NAMES.has(last.toLowerCase())
  );
}

function segments(name: string): string[] {
  return name.split(PATH_SEPARATOR);
}
