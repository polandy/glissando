import type { ImmichThumbnailSize, PhotoSource } from "./immich-client";

export const TIMELINE_PATH = "api/timeline/buckets";
const FOLDER_PATH = "api/view/folder";
export const FOLDER_PATHS_PATH = `${FOLDER_PATH}/unique-paths`;
const PEOPLE_PATH = "api/people";
/** Immich's own page size for the people list; the list is read to its last page. */
export const PEOPLE_PAGE_SIZE = 500;
export const FIRST_PEOPLE_PAGE = 1;

export function peoplePath(page: number, size: number): string {
  return `${PEOPLE_PATH}?withHidden=false&page=${String(page)}&size=${String(size)}`;
}

export function personThumbnailPath(personId: string): string {
  return `${PEOPLE_PATH}/${encodeURIComponent(personId)}/thumbnail`;
}

export function folderPath(path: string): string {
  return `${FOLDER_PATH}?path=${encodeURIComponent(path)}`;
}

export function assetPath(photoId: string): string {
  return `api/assets/${encodeURIComponent(photoId)}`;
}

export function thumbnailPath(photoId: string, size: ImmichThumbnailSize): string {
  return `${assetPath(photoId)}/thumbnail?size=${size}`;
}

/** The search fields that narrow the library to one source; a folder is not a search. */
export function sourceFilter(source: Exclude<PhotoSource, { kind: "folder" }>): object {
  switch (source.kind) {
    case "library":
      return {
        ...(source.favoritesOnly ? { isFavorite: true } : {}),
        ...(source.takenBefore === null ? {} : { takenBefore: source.takenBefore }),
      };
    case "album":
      return { albumIds: [source.albumId] };
    case "person":
      return { personIds: [source.personId] };
  }
}
