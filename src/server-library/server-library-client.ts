import type { ServerDocument } from "./server-document";

/**
 * The Glissando server's library API as the app uses it (`dev-docs/SERVER_LIBRARY.md`, The HTTP
 * API). Every method rejects with `ServerLibraryUnavailableError` when the server cannot be
 * reached or fails, `ServerLibraryNotFoundError` for an unknown id, and
 * `ServerLibraryRefusedError` for a request it refuses.
 */
export interface ServerLibraryClient {
  /** Whether `./api/library` answers the library service's discovery. */
  discover(): Promise<boolean>;
  /** Newest first. */
  listSlideshows(): Promise<readonly ServerSlideshowRecord[]>;
  getSlideshow(id: string): Promise<ServerSlideshowRecord>;
  createSlideshow(document: ServerDocument): Promise<ServerSlideshowCreated>;
  /**
   * Replaces the slideshow if `revision` is still its current one and answers the new revision;
   * rejects with `ServerRevisionChangedError` carrying the current version otherwise.
   */
  replaceSlideshow(id: string, revision: number, document: ServerDocument): Promise<number>;
  deleteSlideshow(id: string): Promise<void>;
  /** Stores the audio and answers its `musicId`. */
  uploadMusic(audio: Blob, mimeType: string): Promise<string>;
  music(musicId: string): Promise<Blob>;
}

/** A slideshow as the server keeps it. */
export interface ServerSlideshowRecord {
  readonly id: string;
  /** 1 on create, +1 on every accepted replace. */
  readonly revision: number;
  readonly document: ServerDocument;
}

export interface ServerSlideshowCreated {
  readonly id: string;
  readonly revision: number;
}

/** The server cannot be reached, or failed (5xx). */
export class ServerLibraryUnavailableError extends Error {
  constructor(request: string, options?: ErrorOptions) {
    super(`the Glissando server did not answer ${request}`, options);
    this.name = "ServerLibraryUnavailableError";
  }
}

/** No slideshow or music with that id on the server. */
export class ServerLibraryNotFoundError extends Error {
  constructor(request: string) {
    super(`the Glissando server has nothing for ${request}`);
    this.name = "ServerLibraryNotFoundError";
  }
}

/** The slideshow changed on the server since the revision an edit named. */
export class ServerRevisionChangedError extends Error {
  constructor(readonly current: ServerSlideshowRecord) {
    super(
      `slideshow "${current.id}" changed on the Glissando server; its revision is now ${String(current.revision)}`,
    );
    this.name = "ServerRevisionChangedError";
  }
}

/** The server refused a request as invalid, e.g. `invalidDocument`, `musicMissing`, `tooLarge`. */
export class ServerLibraryRefusedError extends Error {
  constructor(
    request: string,
    readonly status: number,
    readonly code: string,
    readonly detail: string,
  ) {
    super(`the Glissando server refused ${request} (${String(status)} ${code}): ${detail}`);
    this.name = "ServerLibraryRefusedError";
  }
}
