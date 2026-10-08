export interface ObjectUrlPorts {
  load(id: string): Promise<Blob>;
  create(blob: Blob): string;
  revoke(url: string): void;
  /** A load that failed; its id stays without a URL. */
  onError(error: unknown): void;
}

/** The browser's object URL functions, for `ObjectUrlPorts`. */
export const browserObjectUrls: Pick<ObjectUrlPorts, "create" | "revoke"> = {
  create: (blob) => URL.createObjectURL(blob),
  revoke: (url) => URL.revokeObjectURL(url),
};

/**
 * Object URLs for stored media, kept in step with the ids a screen shows: new ids are loaded,
 * dropped ids revoked, so a blob is held only while it is on screen. The Svelte store contract
 * publishes the id → URL map.
 */
export class ObjectUrls {
  readonly #ports: ObjectUrlPorts;
  readonly #listeners = new Set<(urls: ReadonlyMap<string, string>) => void>();
  #urls = new Map<string, string>();
  readonly #wanted = new Set<string>();
  readonly #loading = new Set<Promise<void>>();
  #disposed = false;

  constructor(ports: ObjectUrlPorts) {
    this.#ports = ports;
  }

  get(id: string): string | undefined {
    return this.#urls.get(id);
  }

  subscribe(listener: (urls: ReadonlyMap<string, string>) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#urls);
    return () => this.#listeners.delete(listener);
  }

  sync(ids: readonly string[]): void {
    if (this.#disposed) {
      throw new Error("these object URLs were disposed; create a new ObjectUrls to show media");
    }
    const next = new Set(ids);
    for (const id of [...this.#wanted]) {
      if (!next.has(id)) {
        this.#wanted.delete(id);
        this.#drop(id);
      }
    }
    for (const id of next) {
      if (!this.#wanted.has(id)) {
        this.#wanted.add(id);
        this.#track(this.#load(id));
      }
    }
  }

  /** Resolves once every load started so far has arrived or failed. */
  async settled(): Promise<void> {
    while (this.#loading.size > 0) {
      await Promise.all(this.#loading);
    }
  }

  dispose(): void {
    this.#disposed = true;
    for (const id of [...this.#wanted]) {
      this.#wanted.delete(id);
      this.#drop(id);
    }
  }

  async #load(id: string): Promise<void> {
    let blob: Blob;
    try {
      blob = await this.#ports.load(id);
    } catch (error) {
      this.#ports.onError(error);
      return;
    }
    const url = this.#ports.create(blob);
    if (!this.#wanted.has(id)) {
      this.#ports.revoke(url);
      return;
    }
    this.#publish(new Map(this.#urls).set(id, url));
  }

  #drop(id: string): void {
    const url = this.#urls.get(id);
    if (url === undefined) {
      return;
    }
    this.#ports.revoke(url);
    const next = new Map(this.#urls);
    next.delete(id);
    this.#publish(next);
  }

  #track(loading: Promise<void>): void {
    this.#loading.add(loading);
    void loading.finally(() => this.#loading.delete(loading));
  }

  #publish(urls: Map<string, string>): void {
    this.#urls = urls;
    for (const listener of this.#listeners) {
      listener(urls);
    }
  }
}
