import type { FakeMedium } from "./fake-share-api";

/** What the fake TV API answers for the TV page at `/tv` (`serveFakeTvApi`). */
export interface FakeTvApi {
  /** What `/tv` answers: the built share page. */
  readonly sharePage: string;
  /** The codes of the sessions made, in order; the session's key is `key-<code>`. */
  readonly codes: readonly string[];
  /** `GET /api/tv/{tvKey}/show`'s body: the slideshow the phone chose. */
  readonly answer: unknown;
  readonly pictures: readonly FakeMedium[];
  readonly songs: readonly FakeMedium[];
}

declare module "vitest/browser" {
  interface BrowserCommands {
    serveFakeTvApi: (fake: FakeTvApi) => Promise<void>;
    /** Sends an event down the TV's stream, with its next answer. */
    sendFakeTvEvent: (type: string, data: unknown) => Promise<void>;
    /** The next playback state the TV page `PUT`, waiting for it. */
    nextFakeTvReport: () => Promise<unknown>;
    stopFakeTvApi: () => Promise<void>;
  }
}
