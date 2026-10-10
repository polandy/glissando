/**
 * What tells one picture from another before it is downscaled: its file name, capture date and
 * origin (see ADR-0016). A `StoredPicture` is one; older records carry no origin.
 */
export interface PictureIdentity {
  readonly fileName: string;
  /** ISO 8601 date-time, as stored. */
  readonly capturedAt: string;
  /** The Immich asset the picture was downloaded from. */
  readonly immichAssetId?: string;
  /** The size of the original file in bytes. */
  readonly fileBytes?: number;
}

/** Same Immich asset, or else same name and capture date and, where both know it, same size. */
export function isSamePicture(a: PictureIdentity, b: PictureIdentity): boolean {
  if (a.immichAssetId !== undefined && b.immichAssetId !== undefined) {
    return a.immichAssetId === b.immichAssetId;
  }
  if (a.fileName !== b.fileName || a.capturedAt !== b.capturedAt) {
    return false;
  }
  return a.fileBytes === undefined || b.fileBytes === undefined || a.fileBytes === b.fileBytes;
}
