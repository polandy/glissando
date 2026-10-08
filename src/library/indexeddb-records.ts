/** How media sits in the IndexedDB object stores, and the request plumbing around it. */

/**
 * Media is kept as bytes plus MIME type, not as a Blob: WebKit refuses Blobs in IndexedDB in
 * ephemeral sessions (private browsing), bytes it stores everywhere.
 */
export interface StoredMedia {
  readonly bytes: ArrayBuffer;
  readonly type: string;
}

export interface StoredPictureMedia {
  readonly display: StoredMedia;
  readonly thumbnail: StoredMedia;
}

export async function toStoredMedia(blob: Blob): Promise<StoredMedia> {
  return { bytes: await blob.arrayBuffer(), type: blob.type };
}

export function toBlob(media: StoredMedia): Blob {
  return new Blob([media.bytes], { type: media.type });
}

export function requestResult(request: IDBRequest): Promise<unknown> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("an IndexedDB request failed"));
  });
}
