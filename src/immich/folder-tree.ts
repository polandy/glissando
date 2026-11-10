const SEPARATOR = "/";

export interface FolderEntry {
  readonly name: string;
  /** The path as Immich lists it, usable for `GET api/view/folder?path=`. */
  readonly path: string;
  /** How many folders lie anywhere below it. */
  readonly subfolderCount: number;
}

/** Every folder on the way to a listed path, so a folder Immich leaves unlisted still shows. */
function allFolders(uniquePaths: readonly string[]): ReadonlySet<string> {
  const folders = new Set<string>();
  for (const path of uniquePaths) {
    const segments = path.split(SEPARATOR);
    for (let length = 1; length <= segments.length; length += 1) {
      folders.add(segments.slice(0, length).join(SEPARATOR));
    }
  }
  return folders;
}

/** The folders directly below `parentPath` (null for the top), from Immich's list of paths. */
export function subfolders(
  uniquePaths: readonly string[],
  parentPath: string | null,
): readonly FolderEntry[] {
  const folders = [...allFolders(uniquePaths)];
  const prefix = parentPath === null ? "" : `${parentPath}${SEPARATOR}`;
  const isBelow = (path: string, ancestor: string): boolean =>
    path.startsWith(`${ancestor}${SEPARATOR}`);
  return folders
    .filter((path) => path.startsWith(prefix) && !path.slice(prefix.length).includes(SEPARATOR))
    .filter((path) => path.length > prefix.length)
    .map((path) => ({
      name: path.slice(prefix.length),
      path,
      subfolderCount: folders.filter((other) => isBelow(other, path)).length,
    }));
}

/** The top-level folders. */
export function rootFolders(uniquePaths: readonly string[]): readonly FolderEntry[] {
  return subfolders(uniquePaths, null);
}

export interface FolderCrumb {
  readonly name: string;
  readonly path: string;
}

/** The folders from the top down to `path`, each with the path that opens it. */
export function folderCrumbs(path: string | null): readonly FolderCrumb[] {
  if (path === null) return [];
  const segments = path.split(SEPARATOR);
  return segments.map((name, index) => ({
    name,
    path: segments.slice(0, index + 1).join(SEPARATOR),
  }));
}
