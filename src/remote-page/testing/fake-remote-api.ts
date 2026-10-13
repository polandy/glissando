/** What the fake remote API serves for `secret` (`serveFakeRemoteApi`). */
export interface FakeRemoteApi {
  readonly secret: string;
  /** What `/r/{secret}` answers: the built remote page. */
  readonly remotePage: string;
  /** The `snapshot` event's data, sent first on every stream that opens. */
  readonly snapshot: unknown;
}

declare module "vitest/browser" {
  interface BrowserCommands {
    serveFakeRemoteApi: (fake: FakeRemoteApi) => Promise<void>;
    /** Sends an event on the open stream, waiting for one to open first. */
    sendFakeRemoteEvent: (secret: string, type: string, data: unknown) => Promise<void>;
    /** The body of the next command the page POSTs, which the fake answers 204. */
    nextFakeRemoteCommand: (secret: string) => Promise<unknown>;
    stopFakeRemoteApi: (secret: string) => Promise<void>;
  }
}
