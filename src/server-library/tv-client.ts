/**
 * Showing a server slideshow on a TV (dev-docs/tv_remote/HTTP_API.md). Every method rejects
 * with `ServerLibraryUnavailableError` when the server cannot be reached or fails, and with
 * `TvRefusedError` for a refusal the app acts on.
 */
export interface TvClient {
  /** Claims the code a TV shows and answers the remote's secret. */
  claim(code: string): Promise<string>;
  /** Makes the TV play the slideshow from the start. */
  show(remoteSecret: string, slideshowId: string): Promise<void>;
  /** Ends the session; one that already ended stays ended. */
  disconnect(remoteSecret: string): Promise<void>;
}

/**
 * `noSuchCode`: no TV shows that code; `noSuchTv`: the session ended; `notFound`: no such
 * slideshow; `boundToLink`: the session plays a shared link and shows nothing else.
 */
export type TvRefusal = "noSuchCode" | "noSuchTv" | "notFound" | "boundToLink";

export class TvRefusedError extends Error {
  constructor(
    request: string,
    readonly refusal: TvRefusal,
  ) {
    super(`the Glissando server refused ${request}: ${refusal}`);
    this.name = "TvRefusedError";
  }
}
