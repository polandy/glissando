import type { MusicBeats } from "../beats";
import type { MusicLoudness } from "../loudness";
import type { StoredFocus } from "../library/picture-focus";
import type { ServerDocument } from "./server-document";

/**
 * The Glissando server's library API as the app uses it (`dev-docs/server_library/HTTP_API.md`).
 * Every method rejects with `ServerLibraryUnavailableError` when the server cannot be
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
  /** The beats a device found in the music (ADR-0021); `undefined` while none has listened yet. */
  musicBeats(musicId: string): Promise<MusicBeats | undefined>;
  /** Keeps the beats found beside the music, replacing any found before. */
  putMusicBeats(musicId: string, beats: MusicBeats): Promise<void>;
  /** The loudness a device measured for the music; `undefined` while none has measured it yet. */
  musicLoudness(musicId: string): Promise<MusicLoudness | undefined>;
  /** Keeps the loudness measured beside the music, replacing any found before. */
  putMusicLoudness(musicId: string, loudness: MusicLoudness): Promise<void>;
  /** The stored focus of a slideshow's pictures that have one (ADR-0041). */
  slideshowFocus(slideshowId: string): Promise<ReadonlyMap<string, StoredFocus>>;
  /**
   * Stores a picture's focus, replacing any found before unless it is newer; `"newerKept"` when
   * the server already holds a focus from a detector at least as new.
   */
  putPictureFocus(
    slideshowId: string,
    assetId: string,
    stored: StoredFocus,
  ): Promise<"stored" | "newerKept">;
}

/** A slideshow as the server keeps it. */
export interface ServerSlideshowRecord {
  readonly id: string;
  /** 1 on create, +1 on every accepted replace. */
  readonly revision: number;
  readonly document: ServerDocument;
}

/** A slideshow's link as the private API answers it (share_link/HTTP_API.md, Private). */
export interface ShareLink {
  /** 22 characters of base64url: the link's last path segment. */
  readonly token: string;
  /** ISO 8601 date-time. */
  readonly createdAt: string;
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

export type RefusedContent = "slideshow" | "music" | "focus";

/** The server refused a request as invalid, e.g. `invalidDocument`, `musicMissing`, `tooLarge`. */
export class ServerLibraryRefusedError extends Error {
  constructor(
    request: string,
    readonly status: number,
    readonly code: string,
    readonly detail: string,
    /** What the refused request carried or asked for. */
    readonly refused: RefusedContent,
  ) {
    super(`the Glissando server refused ${request} (${String(status)} ${code}): ${detail}`);
    this.name = "ServerLibraryRefusedError";
  }
}
