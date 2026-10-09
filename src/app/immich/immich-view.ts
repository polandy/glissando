import type { ImmichAvailabilityState } from "../../immich/immich-availability";
import type { ImmichAlbum, ImmichPhoto, ImmichUnavailableKind } from "../../immich/immich-client";
import type { MessageKey } from "../i18n/messages";

/** An Immich problem the UI names in one line; "not set up" is no problem, Immich is just absent. */
export type ImmichProblem = Exclude<ImmichUnavailableKind, "notSetUp">;

/** Each problem's one line, in the settings and the pictures step's box alike. */
export const PROBLEM_MESSAGES: Readonly<Record<ImmichProblem, MessageKey>> = {
  offline: "immich.problemOffline",
  unreachable: "immich.problemUnreachable",
  keyRejected: "immich.problemKeyRejected",
  permissionMissing: "immich.problemPermissionMissing",
  signInExpired: "immich.problemSignInExpired",
};

/** The pictures step's Immich box. */
export type ImmichBox =
  | { readonly kind: "hidden" }
  | { readonly kind: "open" }
  | { readonly kind: "offline" }
  | { readonly kind: "problem"; readonly problem: Exclude<ImmichProblem, "offline"> };

export function immichBox(state: ImmichAvailabilityState): ImmichBox {
  switch (state.kind) {
    case "checking":
    case "notSetUp":
      return { kind: "hidden" };
    case "available":
      return { kind: "open" };
    case "offline":
      return { kind: "offline" };
    default:
      return { kind: "problem", problem: state.kind };
  }
}

/** The settings' read-only Immich group. */
export type ImmichSettings =
  | { readonly kind: "checking" }
  | { readonly kind: "notSetUp" }
  | { readonly kind: "available"; readonly version: string; readonly albumCount: number }
  | {
      readonly kind: "problem";
      readonly problem: ImmichProblem;
      /** An expired sign-in needs the page reloaded through the proxy; the rest a new check. */
      readonly remedy: "checkAgain" | "reload";
    };

export function immichSettings(state: ImmichAvailabilityState): ImmichSettings {
  switch (state.kind) {
    case "checking":
    case "notSetUp":
    case "available":
      return state;
    case "signInExpired":
      return { kind: "problem", problem: state.kind, remedy: "reload" };
    default:
      return { kind: "problem", problem: state.kind, remedy: "checkAgain" };
  }
}

/** The albums whose name contains `filter`, ignoring case and surrounding spaces. */
export function filterAlbums(
  albums: readonly ImmichAlbum[],
  filter: string,
): readonly ImmichAlbum[] {
  const wanted = filter.trim().toLocaleLowerCase();
  if (wanted === "") return albums;
  return albums.filter(({ name }) => name.toLocaleLowerCase().includes(wanted));
}

/** The browser footer's text: a hint while empty, else the count and the albums it spans. */
export type SelectionSummary =
  | { readonly kind: "hint" }
  | { readonly kind: "count"; readonly count: number; readonly albums: number | null };

const ALBUMS_NAMED_FROM = 2;

export function selectionSummary(count: number, albumCount: number): SelectionSummary {
  if (count === 0) return { kind: "hint" };
  return { kind: "count", count, albums: albumCount >= ALBUMS_NAMED_FROM ? albumCount : null };
}

export function isWholeDaySelected(
  photos: readonly ImmichPhoto[],
  isSelected: (photoId: string) => boolean,
): boolean {
  return photos.every(({ id }) => isSelected(id));
}

/** The photos known to be in an album; `complete` once all of its pages have been read. */
export interface AlbumMembership {
  readonly photoIds: ReadonlySet<string>;
  readonly complete: boolean;
}

export interface AlbumPick {
  readonly selected: number;
  readonly all: boolean;
}

export function albumPick(
  membership: AlbumMembership | undefined,
  selectedIds: ReadonlySet<string>,
): AlbumPick {
  if (membership === undefined) return { selected: 0, all: false };
  let selected = 0;
  for (const id of membership.photoIds) if (selectedIds.has(id)) selected += 1;
  const all = membership.complete && selected > 0 && selected === membership.photoIds.size;
  return { selected, all };
}

/** How many albums hold at least one selected photo, as far as their photos are known. */
export function albumsWithSelection(
  membership: ReadonlyMap<string, AlbumMembership>,
  selectedIds: ReadonlySet<string>,
): number {
  let albums = 0;
  for (const known of membership.values()) {
    if (albumPick(known, selectedIds).selected > 0) albums += 1;
  }
  return albums;
}
