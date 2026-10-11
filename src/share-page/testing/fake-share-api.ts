/** A medium the fake share API serves, its bytes as base64 to cross into Node. */
export interface FakeMedium {
  readonly base64: string;
  readonly type: string;
}

/** What the fake share API answers for `token` (`serveFakeShareApi`). */
export interface FakeShareApi {
  readonly token: string;
  /** What `/s/{token}` answers: the built share page. */
  readonly sharePage: string;
  /** The link is shared, turned off (404 `notShared`), or the server answers 503. */
  readonly mode: "shared" | "gone" | "unreachable";
  /** `GET /api/share/{token}`'s body while shared. */
  readonly answer: unknown;
  readonly pictures: readonly FakeMedium[];
  readonly songs: readonly FakeMedium[];
  /** A picture held back until `releaseFakeSharePicture`, as a slow server would. */
  readonly heldPicture?: number;
  /** A picture answered 404 `noSuchPicture`, as one Immich no longer has. */
  readonly missingPicture?: number;
  /**
   * A picture, or every song, answered 404 `notShared` while the document still answers, as
   * when the link is turned off while the page plays.
   */
  readonly gonePicture?: number;
  readonly goneSongs?: boolean;
}

declare module "vitest/browser" {
  interface BrowserCommands {
    serveFakeShareApi: (fake: FakeShareApi) => Promise<void>;
    stopFakeShareApi: (token: string) => Promise<void>;
    releaseFakeSharePicture: (token: string) => Promise<void>;
  }
}
