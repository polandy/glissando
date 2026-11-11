import type { PhotoSource } from "../../immich/immich-client";

/** A place the browser selects whole: an album, a person or a folder (its path is the id). */
export interface BrowseSource {
  readonly kind: "album" | "person" | "folder";
  readonly id: string;
}

const KEY_SEPARATOR = ":";

/** One key per source across kinds, so an album and a person of the same id stay apart. */
export function sourceKey(source: BrowseSource): string {
  return `${source.kind}${KEY_SEPARATOR}${source.id}`;
}

export function isAlbumKey(key: string): boolean {
  return key.startsWith(`album${KEY_SEPARATOR}`);
}

export function photoSourceOf(source: BrowseSource): PhotoSource {
  switch (source.kind) {
    case "album":
      return { kind: "album", albumId: source.id };
    case "person":
      return { kind: "person", personId: source.id };
    case "folder":
      return { kind: "folder", path: source.id };
  }
}

export const albumSource = (id: string): BrowseSource => ({ kind: "album", id });
export const personSource = (id: string): BrowseSource => ({ kind: "person", id });
export const folderSource = (path: string): BrowseSource => ({ kind: "folder", id: path });
