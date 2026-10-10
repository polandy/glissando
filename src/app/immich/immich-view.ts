import { UNEXPECTED_FAILURE, type BrowseFailure } from "../../immich/browse-failure";
import type { ImmichAvailabilityState } from "../../immich/immich-availability";
import type { ImmichAlbum, ImmichPhoto, ImmichUnavailableKind } from "../../immich/immich-client";
import { immichPhotoIdentity } from "../../import/immich-picture-source";
import { isSamePicture, type PictureIdentity } from "../../library/picture-identity";
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

/**
 * How the browser tells a failed request: a whole view's title and text, and the one line an
 * album card has room for.
 */
export interface BrowseFailureMessages {
  readonly title: MessageKey;
  readonly text: MessageKey;
  readonly line: MessageKey;
}

const NOT_ANSWERING: BrowseFailureMessages = {
  title: "immich.notAnswering",
  text: "immich.notAnsweringText",
  line: "immich.notAnswering",
};

/** A problem the user can act on is named; anything else is Immich not answering. */
export function browseFailureMessages(failure: BrowseFailure): BrowseFailureMessages {
  switch (failure) {
    case UNEXPECTED_FAILURE:
    case "unreachable":
    case "notSetUp":
      return NOT_ANSWERING;
    default: {
      const problem = PROBLEM_MESSAGES[failure];
      return { title: "immich.unusable", text: problem, line: problem };
    }
  }
}

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

/** Whether a photo is already in what the browser adds to; such a photo cannot be selected. */
export type AlreadyIn = (photo: ImmichPhoto) => boolean;

export const NOTHING_ALREADY_IN: AlreadyIn = () => false;

/** A photo is already in when it is the same picture (ADR-0016) as one of `pictures`. */
export function alreadyInAmong(pictures: readonly PictureIdentity[]): AlreadyIn {
  return (photo) => {
    const identity = immichPhotoIdentity(photo);
    return pictures.some((picture) => isSamePicture(picture, identity));
  };
}

/** A day heading's button over the photos not already in; null when there are none. */
export function dayToggle(
  photos: readonly ImmichPhoto[],
  isSelected: (photoId: string) => boolean,
  alreadyIn: AlreadyIn,
): "select" | "deselect" | null {
  const selectable = photos.filter((photo) => !alreadyIn(photo));
  if (selectable.length === 0) return null;
  return selectable.every(({ id }) => isSelected(id)) ? "deselect" : "select";
}

/** The photos known to be in an album, by id; `complete` once all of its pages have been read. */
export interface AlbumMembership {
  readonly photos: ReadonlyMap<string, ImmichPhoto>;
  readonly complete: boolean;
}

export interface AlbumPick {
  readonly selected: number;
  /** Every photo not already in is selected. */
  readonly all: boolean;
  /** Known photos already in, which a whole album passes over. */
  readonly alreadyIn: number;
}

export function albumPick(
  membership: AlbumMembership | undefined,
  selectedIds: ReadonlySet<string>,
  alreadyIn: AlreadyIn,
): AlbumPick {
  if (membership === undefined) return { selected: 0, all: false, alreadyIn: 0 };
  let selected = 0;
  let alreadyInCount = 0;
  for (const photo of membership.photos.values()) {
    if (alreadyIn(photo)) alreadyInCount += 1;
    else if (selectedIds.has(photo.id)) selected += 1;
  }
  const selectable = membership.photos.size - alreadyInCount;
  const all = membership.complete && selected > 0 && selected === selectable;
  return { selected, all, alreadyIn: alreadyInCount };
}

/** How many albums hold at least one selected photo, as far as their photos are known. */
export function albumsWithSelection(
  membership: ReadonlyMap<string, AlbumMembership>,
  selectedIds: ReadonlySet<string>,
): number {
  let albums = 0;
  for (const known of membership.values()) {
    if (albumPick(known, selectedIds, NOTHING_ALREADY_IN).selected > 0) albums += 1;
  }
  return albums;
}
