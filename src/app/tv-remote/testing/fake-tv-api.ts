import { ServerLibraryUnavailableError } from "../../../server-library/server-library-client";
import { TvRefusedError } from "../../../server-library/tv-client";
import type { TvApi, TvSlideshowCard } from "../tv-session";

const REQUESTS = {
  claim: "POST /api/library/tv/claim",
  show: "POST /api/library/tv/show",
  list: "GET /api/library/slideshows",
  disconnect: "POST /api/tv/remote/command",
} as const;

/**
 * The server's TV sessions in memory: `codes` maps the codes TVs show to their remote secrets.
 * `down` makes every call fail as a server that does not answer does.
 */
export class FakeTvApi implements TvApi {
  readonly codes = new Map<string, string>();
  slideshows: readonly TvSlideshowCard[];
  down = false;
  /** Only the list of slideshows fails as a server that does not answer. */
  listDown = false;
  /** Secrets whose session ended, as a TV that was closed. */
  readonly ended = new Set<string>();
  readonly shown: { remoteSecret: string; slideshowId: string }[] = [];
  readonly disconnected: string[] = [];
  #last: Promise<unknown> = Promise.resolve();
  readonly #held = new Map<string, Promise<void>>();

  constructor(slideshows: readonly TvSlideshowCard[]) {
    this.slideshows = slideshows;
  }

  /**
   * The next `request` is decided when it is made but answered only once the returned function is
   * called, as an answer that is still on its way; `settled` does not wait for it.
   */
  hold(request: "claim" | "show" | "list"): () => void {
    let release = () => {};
    this.#held.set(
      REQUESTS[request],
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    return release;
  }

  claim(code: string): Promise<string> {
    return this.#answer(REQUESTS.claim, () => {
      const secret = this.codes.get(code);
      if (secret === undefined) throw new TvRefusedError("claim", "noSuchCode");
      this.codes.delete(code);
      return secret;
    });
  }

  show(remoteSecret: string, slideshowId: string): Promise<void> {
    return this.#answer(REQUESTS.show, () => {
      if (this.ended.has(remoteSecret)) throw new TvRefusedError("show", "noSuchTv");
      if (!this.slideshows.some(({ id }) => id === slideshowId)) {
        throw new TvRefusedError("show", "notFound");
      }
      this.shown.push({ remoteSecret, slideshowId });
    });
  }

  disconnect(remoteSecret: string): Promise<void> {
    return this.#answer(REQUESTS.disconnect, () => {
      this.disconnected.push(remoteSecret);
    });
  }

  listSlideshows(): Promise<readonly TvSlideshowCard[]> {
    return this.#answer(REQUESTS.list, () => {
      if (this.listDown) throw new ServerLibraryUnavailableError(REQUESTS.list);
      return this.slideshows;
    });
  }

  /** Settles once the last call made has. */
  async settled(): Promise<void> {
    for (let last = this.#last; ; last = this.#last) {
      await last.catch(() => undefined);
      if (last === this.#last) return;
    }
  }

  #answer<Answer>(request: string, answer: () => Answer): Promise<Answer> {
    const gate = this.#held.get(request);
    if (gate !== undefined) {
      this.#held.delete(request);
      return this.#decide(request, answer).then(
        (value) => gate.then(() => value),
        (error: unknown) => gate.then(() => Promise.reject(error)),
      );
    }
    const result = Promise.resolve().then(() => {
      if (this.down) throw new ServerLibraryUnavailableError(request);
      return answer();
    });
    this.#last = result;
    return result;
  }

  #decide<Answer>(request: string, answer: () => Answer): Promise<Answer> {
    try {
      if (this.down) throw new ServerLibraryUnavailableError(request);
      return Promise.resolve(answer());
    } catch (error) {
      return Promise.reject(error);
    }
  }
}
