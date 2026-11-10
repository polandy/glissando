/**
 * What Glissando reads from Immich, through the self-hosted Glissando's `/immich/` route
 * (ADR-0013). The route sets the API key; the app never holds one.
 */

import type { ExifGps } from "../import/exif-gps";

export interface ImmichAlbum {
  readonly id: string;
  readonly name: string;
  readonly photoCount: number;
  /** The asset whose thumbnail is the album's cover; null for an empty album. */
  readonly coverId: string | null;
  /** The first and last capture instants of the album's assets; null for an empty album. */
  readonly startDate: string | null;
  readonly endDate: string | null;
}

export interface ImmichPhoto {
  readonly id: string;
  readonly fileName: string;
  /** Immich's `localDateTime` cut to whole seconds: the wall time with a `Z` of `readPictureExif()`. */
  readonly takenAt: string;
  /** Immich's `width`/`height` in pixels; null while Immich has not read them. */
  readonly size: { readonly width: number; readonly height: number } | null;
  /** The city of the capture from Immich's EXIF data; null where Immich has none. */
  readonly place?: string | null;
  /** The GPS coordinate from Immich's EXIF data; null where it has none `gpsCoordinate()` accepts. */
  readonly gps?: ExifGps | null;
  /** Present for a video (only listed with `withVideos`); its length when Immich knows it. */
  readonly video?: { readonly durationMs: number | null };
}

/** One page of photos, newest first; `nextPage` is null on the last one. */
export interface ImmichPhotoPage {
  readonly photos: readonly ImmichPhoto[];
  /** The `takenAt` of each image of the page left out because it is not a JPEG. */
  readonly hiddenTakenAt: readonly string[];
  readonly nextPage: number | null;
}

export interface TimelineMonth {
  /** `YYYY-MM`. */
  readonly month: string;
  /** Immich's count of assets of every format, so only approximately the photos listed. */
  readonly count: number;
}

export interface ImmichPerson {
  readonly id: string;
  readonly name: string;
}

/** Where a listing of photos comes from. */
export type PhotoSource =
  | {
      readonly kind: "library";
      readonly favoritesOnly: boolean;
      /** An ISO instant: only photos taken before it; null for no limit. */
      readonly takenBefore: string | null;
    }
  | { readonly kind: "album"; readonly albumId: string }
  | { readonly kind: "person"; readonly personId: string }
  | { readonly kind: "folder"; readonly path: string };

export const WHOLE_LIBRARY: PhotoSource = {
  kind: "library",
  favoritesOnly: false,
  takenBefore: null,
};

/** Key permissions beyond the required ones; a key without one answers 403 on its calls only. */
export const TIMELINE_READ_PERMISSION = "timeline.read";
export const PERSON_READ_PERMISSION = "person.read";
export const FOLDER_READ_PERMISSION = "folder.read";
export type OptionalImmichPermission =
  typeof TIMELINE_READ_PERMISSION | typeof PERSON_READ_PERMISSION | typeof FOLDER_READ_PERMISSION;

/** A face box in pixels of an `imageWidth × imageHeight` image in display orientation. */
export interface ImmichFace {
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export type ImmichThumbnailSize = "thumbnail" | "preview";

/**
 * Whether Immich can be used right now:
 * - `notSetUp`: this Glissando has no Immich route (a static host, or no `IMMICH_URL`);
 * - `offline`: the Glissando server itself cannot be reached;
 * - `unreachable`: the server answers, but cannot reach Immich;
 * - `keyRejected` / `permissionMissing`: Immich refuses the server's key (401 / 403);
 * - `signInExpired`: the owner's proxy in front of Glissando wants a new sign-in.
 */
export type ImmichStatus =
  | {
      readonly kind: "available";
      readonly version: string;
      readonly albumCount: number;
      readonly missingPermissions: readonly OptionalImmichPermission[];
    }
  | { readonly kind: "notSetUp" }
  | { readonly kind: "offline" }
  | { readonly kind: "unreachable" }
  | { readonly kind: "keyRejected" }
  | { readonly kind: "permissionMissing" }
  | { readonly kind: "signInExpired" };

export type ImmichUnavailableKind = Exclude<ImmichStatus["kind"], "available">;

/** A request failed for a reason the user is told as an `ImmichStatus`. */
export class ImmichUnavailableError extends Error {
  readonly kind: ImmichUnavailableKind;

  constructor(kind: ImmichUnavailableKind, options?: ErrorOptions) {
    super(`Immich is not available: ${kind}`, options);
    this.name = "ImmichUnavailableError";
    this.kind = kind;
  }
}

/**
 * A request Immich answered with an HTTP status that names no `ImmichStatus`, e.g. a 404 for a
 * photo deleted in Immich after it was listed: that one request failed, Immich itself is fine.
 */
export class ImmichRequestFailedError extends Error {
  readonly status: number;

  constructor(request: string, status: number) {
    super(`${request} answered ${String(status)}`);
    this.name = "ImmichRequestFailedError";
    this.status = status;
  }
}

/** A download Immich announces (its `Content-Length`) as bigger than the caller takes. */
export class ImmichDownloadTooLargeError extends Error {
  constructor(request: string, announcedBytes: number, maxBytes: number) {
    super(
      `${request} announces ${String(announcedBytes)} bytes, over the ${String(maxBytes)} taken`,
    );
    this.name = "ImmichDownloadTooLargeError";
  }
}

/**
 * Every method but `status()` and `thumbnailUrl()` rejects with `ImmichUnavailableError` when
 * Immich cannot be used, with `ImmichRequestFailedError` for another failing HTTP status, and with
 * a plain `Error` for an answer that does not match the measured Immich API (fail loud).
 */
export interface ImmichClient {
  status(): Promise<ImmichStatus>;
  albums(): Promise<readonly ImmichAlbum[]>;
  /** Photos newest first, JPEG images only, and videos only when `withVideos` is set. */
  photos(query: {
    readonly page: number;
    readonly source: PhotoSource;
    readonly withVideos?: boolean;
  }): Promise<ImmichPhotoPage>;
  /** The months that hold assets, newest first. */
  timelineMonths(): Promise<readonly TimelineMonth[]>;
  /** Named, visible people in Immich's order. */
  people(): Promise<readonly ImmichPerson[]>;
  folderPaths(): Promise<readonly string[]>;
  /** Same origin and keyless, so an `<img src>` can load it lazily. */
  thumbnailUrl(photoId: string): string;
  /** Same origin and keyless, like `thumbnailUrl`. */
  personThumbnailUrl(personId: string): string;
  /** `signal` cancels the download; it then rejects with the signal's reason. */
  thumbnail(photoId: string, size: ImmichThumbnailSize, signal?: AbortSignal): Promise<Blob>;
  /** `signal` cancels the download; it then rejects with the signal's reason. */
  original(photoId: string, signal?: AbortSignal): Promise<Blob>;
  /**
   * A video's playable version, as Immich plays it (its transcoded copy, else the original),
   * downloaded whole. Rejects with `ImmichDownloadTooLargeError`, before its bytes are read, when
   * Immich announces more than `maxBytes`. `signal` cancels it; it then rejects with its reason.
   */
  video(photoId: string, maxBytes: number, signal?: AbortSignal): Promise<Blob>;
  faces(photoId: string): Promise<readonly ImmichFace[]>;
}
