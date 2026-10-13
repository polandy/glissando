import { ServerLibraryUnavailableError } from "../../../server-library/server-library-client";
import { TvRefusedError } from "../../../server-library/tv-client";
import type { TvApi, TvSlideshowCard } from "../tv-session";

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

  constructor(slideshows: readonly TvSlideshowCard[]) {
    this.slideshows = slideshows;
  }

  claim(code: string): Promise<string> {
    return this.#answer("POST /api/library/tv/claim", () => {
      const secret = this.codes.get(code);
      if (secret === undefined) throw new TvRefusedError("claim", "noSuchCode");
      this.codes.delete(code);
      return secret;
    });
  }

  show(remoteSecret: string, slideshowId: string): Promise<void> {
    return this.#answer("POST /api/library/tv/show", () => {
      if (this.ended.has(remoteSecret)) throw new TvRefusedError("show", "noSuchTv");
      if (!this.slideshows.some(({ id }) => id === slideshowId)) {
        throw new TvRefusedError("show", "notFound");
      }
      this.shown.push({ remoteSecret, slideshowId });
    });
  }

  disconnect(remoteSecret: string): Promise<void> {
    return this.#answer("POST /api/tv/remote/command", () => {
      this.disconnected.push(remoteSecret);
    });
  }

  listSlideshows(): Promise<readonly TvSlideshowCard[]> {
    return this.#answer("GET /api/library/slideshows", () => {
      if (this.listDown) throw new ServerLibraryUnavailableError("GET /api/library/slideshows");
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
    const result = Promise.resolve().then(() => {
      if (this.down) throw new ServerLibraryUnavailableError(request);
      return answer();
    });
    this.#last = result;
    return result;
  }
}
