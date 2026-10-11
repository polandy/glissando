import {
  ServerLibraryUnavailableError,
  type ShareLink,
} from "../../../server-library/server-library-client";
import type { ShareLinkApi } from "../share-link-session";

/**
 * One slideshow's link as the server keeps it, in memory. `down` makes every call fail as a
 * server that does not answer does; `failWith` rejects every call with that error.
 */
export class FakeShareLinkApi implements ShareLinkApi {
  shared: ShareLink | null;
  down = false;
  failWith: Error | null = null;
  readonly #slideshowId: string;
  #tokens = 0;
  #last: Promise<unknown> = Promise.resolve();

  constructor(slideshowId: string, shared: ShareLink | null) {
    this.#slideshowId = slideshowId;
    this.shared = shared;
  }

  shareOf(slideshowId: string): Promise<ShareLink | null> {
    return this.#answer("GET", slideshowId, () => this.shared);
  }

  share(slideshowId: string): Promise<ShareLink> {
    return this.#answer("POST", slideshowId, () => {
      this.#tokens += 1;
      this.shared ??= {
        token: `token-${String(this.#tokens)}`,
        createdAt: "2026-10-11T12:00:00.000Z",
      };
      return this.shared;
    });
  }

  unshare(slideshowId: string): Promise<void> {
    return this.#answer("DELETE", slideshowId, () => {
      this.shared = null;
    });
  }

  /** Settles once the last call made has. */
  async settled(): Promise<void> {
    await this.#last.catch(() => undefined);
  }

  #answer<Answer>(method: string, slideshowId: string, answer: () => Answer): Promise<Answer> {
    const request = `${method} /api/library/slideshows/${slideshowId}/share`;
    const result = Promise.resolve().then(() => {
      if (slideshowId !== this.#slideshowId) throw new Error(`no slideshow "${slideshowId}"`);
      if (this.failWith !== null) throw this.failWith;
      if (this.down) throw new ServerLibraryUnavailableError(request);
      return answer();
    });
    this.#last = result;
    return result;
  }
}
