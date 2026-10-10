import {
  ImmichRequestFailedError,
  ImmichUnavailableError,
  type ImmichClient,
  type ImmichFace,
  type ImmichThumbnailSize,
  type ImmichUnavailableKind,
} from "../../immich/immich-client";
import type { DecodedPicture } from "../../import/downscale";
import { UnreadablePictureError } from "../../import/unreadable-picture";

/** Bytes `decodeAsText` refuses, as the browser refuses e.g. HEIC. */
export const UNDECODABLE = "undecodable";

const HTTP_NOT_FOUND = 404;

/**
 * Immich's media of the assets a test adds: an original holding "original <id>", a thumbnail
 * and a preview likewise; an asset never added answers 404 as a deleted one does.
 */
export class FakeImmichMedia implements Pick<ImmichClient, "original" | "thumbnail" | "faces"> {
  readonly calls: string[] = [];
  readonly #originals = new Map<string, string>();
  readonly #faces = new Map<string, readonly ImmichFace[]>();
  /** Every request rejects with this kind while set. */
  unavailable: ImmichUnavailableKind | null = null;
  /** `faces()` rejects with this while set. */
  facesError: Error | null = null;

  add(assetId: string, options: { original?: string; faces?: readonly ImmichFace[] } = {}): this {
    this.#originals.set(assetId, options.original ?? `original ${assetId}`);
    this.#faces.set(assetId, options.faces ?? []);
    return this;
  }

  readonly original = (assetId: string): Promise<Blob> =>
    this.#answer(`original ${assetId}`, assetId, (original) => new Blob([original]));

  readonly thumbnail = (assetId: string, size: ImmichThumbnailSize): Promise<Blob> =>
    this.#answer(`${size} ${assetId}`, assetId, () => new Blob([`${size} ${assetId}`]));

  readonly faces = (assetId: string): Promise<readonly ImmichFace[]> => {
    if (this.facesError !== null) {
      this.calls.push(`faces ${assetId}`);
      return Promise.reject(this.facesError);
    }
    return this.#answer(`faces ${assetId}`, assetId, () => this.#faces.get(assetId) ?? []);
  };

  #answer<T>(call: string, assetId: string, answer: (original: string) => T): Promise<T> {
    this.calls.push(call);
    if (this.unavailable !== null) {
      return Promise.reject(new ImmichUnavailableError(this.unavailable));
    }
    const original = this.#originals.get(assetId);
    return original === undefined
      ? Promise.reject(new ImmichRequestFailedError(call, HTTP_NOT_FOUND))
      : Promise.resolve(answer(original));
  }
}

/** Decodes a file into renditions naming its bytes; bytes holding `UNDECODABLE` fail. */
export async function decodeAsText(file: File): Promise<DecodedPicture> {
  const bytes = await file.text();
  if (bytes.includes(UNDECODABLE)) throw new UnreadablePictureError(file.name);
  return {
    width: 300,
    height: 200,
    display: new Blob([`display of ${bytes}`]),
    thumbnail: new Blob([`thumbnail of ${bytes}`]),
  };
}
