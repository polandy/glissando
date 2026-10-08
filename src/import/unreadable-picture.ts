/** A picture file the browser cannot read or decode; the import skips it as unreadable. */
export class UnreadablePictureError extends Error {
  constructor(
    readonly fileName: string,
    options?: ErrorOptions,
  ) {
    super(`the browser cannot read or decode the picture "${fileName}"`, options);
    this.name = "UnreadablePictureError";
  }
}

/**
 * The DOMException name of a file read that fails, e.g. when the picker's permission has lapsed
 * (Android Chrome) or the file was moved after it was picked.
 */
const NOT_READABLE = "NotReadableError";

/** Reads a file's first bytes; a file the browser cannot read rejects with `UnreadablePictureError`. */
export async function readPictureHead(file: File, byteCount: number): Promise<ArrayBuffer> {
  try {
    return await file.slice(0, byteCount).arrayBuffer();
  } catch (error) {
    if (error instanceof DOMException && error.name === NOT_READABLE) {
      throw new UnreadablePictureError(file.name, { cause: error });
    }
    throw error;
  }
}
