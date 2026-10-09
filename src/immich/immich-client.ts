/**
 * What Glissando reads from Immich, through the self-hosted Glissando's `/immich/` route
 * (ADR-0013). The route sets the API key; the app never holds one.
 */

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
  /** Immich's `localDateTime`: the capture time as wall time with a `Z`, as `captureDate()`. */
  readonly takenAt: string;
}

/** One page of photos, newest first; `nextPage` is null on the last one. */
export interface ImmichPhotoPage {
  readonly photos: readonly ImmichPhoto[];
  readonly nextPage: number | null;
}

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
  | { readonly kind: "available"; readonly version: string; readonly albumCount: number }
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
 * Every method but `status()` and `thumbnailUrl()` rejects with `ImmichUnavailableError` when
 * Immich cannot be used, and with a plain `Error` for an answer that does not match the measured
 * Immich API (fail loud).
 */
export interface ImmichClient {
  status(): Promise<ImmichStatus>;
  albums(): Promise<readonly ImmichAlbum[]>;
  /** Photos only (no videos), newest first; all of the library, or of one album. */
  photos(query: { readonly page: number; readonly albumId?: string }): Promise<ImmichPhotoPage>;
  /** Same origin and keyless, so an `<img src>` can load it lazily. */
  thumbnailUrl(photoId: string): string;
  thumbnail(photoId: string, size: ImmichThumbnailSize): Promise<Blob>;
  original(photoId: string): Promise<Blob>;
  faces(photoId: string): Promise<readonly ImmichFace[]>;
}
