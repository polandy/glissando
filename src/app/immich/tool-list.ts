import {
  browseFailureOf,
  UNEXPECTED_FAILURE,
  type BrowseFailure,
  type ReportUnavailable,
} from "../../immich/browse-failure";
import { ImmichUnavailableError } from "../../immich/immich-client";

export interface ToolListState<T> {
  /** Null until the list has arrived. */
  readonly items: readonly T[] | null;
  /** Why the last request failed, or null; `retry()` asks again. */
  readonly failure: BrowseFailure | null;
  /** The server's key lacks the permission: the tool is hidden, nothing is reported. */
  readonly unavailable: boolean;
}

export const NOT_LOADED: ToolListState<never> = { items: null, failure: null, unavailable: false };

export interface ToolListOptions<T> {
  readonly fetch: () => Promise<readonly T[]>;
  readonly reportUnavailable: ReportUnavailable;
  /** An optional tool is hidden on a 403; a required list reports it like any problem. */
  readonly optional: boolean;
  readonly onChange: (state: ToolListState<T>) => void;
}

/** One list read once, e.g. the albums or the people: loading, failed, hidden or here. */
export class ToolList<T> {
  readonly #options: ToolListOptions<T>;
  #state: ToolListState<T> = NOT_LOADED;
  #inFlight: Promise<void> | null = null;

  constructor(options: ToolListOptions<T>) {
    this.#options = options;
  }

  get state(): ToolListState<T> {
    return this.#state;
  }

  /** Asks unless the list is here, on its way, failed (see `retry`) or hidden. */
  load(): Promise<void> {
    const { items, failure, unavailable } = this.#state;
    if (items !== null || failure !== null || unavailable) return Promise.resolve();
    this.#inFlight ??= this.#fetch().finally(() => (this.#inFlight = null));
    return this.#inFlight;
  }

  retry(): Promise<void> {
    if (this.#state.failure !== null) this.#publish({ ...this.#state, failure: null });
    return this.load();
  }

  async #fetch(): Promise<void> {
    try {
      this.#publish({ items: await this.#options.fetch(), failure: null, unavailable: false });
    } catch (error) {
      if (this.#options.optional && isPermissionMissing(error)) {
        this.#publish({ items: null, failure: null, unavailable: true });
        return;
      }
      const failure = browseFailureOf(error, this.#options.reportUnavailable);
      this.#publish({ ...this.#state, failure });
      // An Immich problem is shown as the failure; anything else is a bug to surface, not hide.
      if (failure === UNEXPECTED_FAILURE) throw error;
    }
  }

  #publish(state: ToolListState<T>): void {
    this.#state = state;
    this.#options.onChange(state);
  }
}

function isPermissionMissing(error: unknown): boolean {
  return error instanceof ImmichUnavailableError && error.kind === "permissionMissing";
}
