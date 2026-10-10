import type { ImmichAvailabilityState } from "../immich/immich-availability";
import { ServerLibraryUnavailableError, type ServerLibraryClient } from "./server-library-client";
import type { ServerLibraryMemory } from "./server-library-memory";

/**
 * Whether the app offers server slideshows (`dev-docs/SERVER_LIBRARY.md`, Availability):
 * - `on`: the server answers the library's discovery and Immich is available;
 * - `offline`: the device is offline, and the last answer was the discovery — this session's, or
 *   before it, the one this device remembers;
 * - `off`: otherwise; the app is as without server slideshows;
 * - `checking`: until Immich and the first discovery have answered.
 */
export type ServerLibraryState =
  | { readonly kind: "checking" }
  | { readonly kind: "on" }
  | { readonly kind: "offline" }
  | { readonly kind: "off" };

/** Immich's availability, replayed on subscribe (`ImmichAvailability`). */
export interface ImmichAvailabilitySource {
  subscribe(listener: (state: ImmichAvailabilityState) => void): () => void;
}

export interface ServerLibraryAvailabilityOptions {
  readonly client: Pick<ServerLibraryClient, "discover">;
  readonly immich: ImmichAvailabilitySource;
  /** Whether the library was on, kept across app starts. */
  readonly memory: Pick<ServerLibraryMemory, "wasOn" | "rememberOn">;
  /** Logs a discovery that failed unexpectedly. */
  log(error: unknown): void;
}

/** What the discovery answered last; `unknown` before its first answer. */
type Discovery = "unknown" | "discovered" | "absent";

/** A discovery that could not reach the server, which keeps the last answer. */
const UNREACHABLE = Symbol("unreachable");
/** A discovery that failed unexpectedly, which counts as no library. */
const FAILED = Symbol("failed");

/** Immich states that need no discovery: no answer yet, or the server out of reach. */
const NOT_ASKING: ReadonlySet<ImmichAvailabilityState["kind"]> = new Set(["checking", "offline"]);

/**
 * Asks the discovery whenever Immich's availability answers, and publishes the server library's
 * state with the Svelte store contract.
 */
export class ServerLibraryAvailability {
  readonly #client: Pick<ServerLibraryClient, "discover">;
  readonly #log: (error: unknown) => void;
  readonly #memory: Pick<ServerLibraryMemory, "wasOn" | "rememberOn">;
  /** The answer this device remembers from before this session; counts only while offline. */
  readonly #remembered: Discovery;
  readonly #listeners = new Set<(state: ServerLibraryState) => void>();
  readonly #pending = new Set<Promise<void>>();
  readonly #stopFollowingImmich: () => void;
  #immich: ImmichAvailabilityState = { kind: "checking" };
  #discovery: Discovery = "unknown";
  #state: ServerLibraryState = { kind: "checking" };
  /** Bumped by every discovery started, so only the latest one's answer counts. */
  #generation = 0;

  constructor(options: ServerLibraryAvailabilityOptions) {
    this.#client = options.client;
    this.#log = options.log;
    this.#memory = options.memory;
    this.#remembered = options.memory.wasOn() ? "discovered" : "unknown";
    this.#stopFollowingImmich = options.immich.subscribe((state) => {
      this.#immich = state;
      if (!NOT_ASKING.has(state.kind)) this.#ask();
      this.#update();
    });
  }

  get state(): ServerLibraryState {
    return this.#state;
  }

  subscribe(listener: (state: ServerLibraryState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  /** Resolves once every discovery under way has answered. */
  async settled(): Promise<void> {
    while (this.#pending.size > 0) await Promise.all(this.#pending);
  }

  dispose(): void {
    this.#stopFollowingImmich();
  }

  #ask(): void {
    const generation = ++this.#generation;
    const asking = this.#discover().then((answer) => {
      if (generation !== this.#generation) return;
      if (answer === UNREACHABLE) {
        if (this.#discovery === "unknown") this.#discovery = "absent";
      } else if (answer === FAILED) {
        this.#discovery = "absent";
      } else {
        this.#memory.rememberOn(answer);
        this.#discovery = answer ? "discovered" : "absent";
      }
      this.#update();
    });
    this.#pending.add(asking);
    void asking.finally(() => this.#pending.delete(asking));
  }

  /** Whether the server answered the discovery, or why it did not answer. */
  async #discover(): Promise<boolean | typeof UNREACHABLE | typeof FAILED> {
    try {
      return await this.#client.discover();
    } catch (error) {
      if (error instanceof ServerLibraryUnavailableError) return UNREACHABLE;
      this.#log(error);
      return FAILED;
    }
  }

  #update(): void {
    const state = this.#derive();
    if (state.kind === this.#state.kind) return;
    this.#state = state;
    for (const listener of this.#listeners) listener(state);
  }

  #derive(): ServerLibraryState {
    const immich = this.#immich.kind;
    if (immich === "checking" || (this.#discovery === "unknown" && this.#pending.size > 0)) {
      return { kind: "checking" };
    }
    if (immich === "offline" && this.#discovery === "unknown") {
      return this.#remembered === "discovered" ? { kind: "offline" } : { kind: "off" };
    }
    if (this.#discovery !== "discovered") return { kind: "off" };
    if (immich === "available") return { kind: "on" };
    return immich === "offline" ? { kind: "offline" } : { kind: "off" };
  }
}
