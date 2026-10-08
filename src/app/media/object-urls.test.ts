import { describe, expect, it } from "vitest";
import { ObjectUrls, type ObjectUrlPorts } from "./object-urls";

/** Loads resolve only when the test releases them; URLs are "url:<blob text>:<n>". */
class FakePorts implements ObjectUrlPorts {
  readonly revoked: string[] = [];
  readonly errors: unknown[] = [];
  /** Loads in flight per id, oldest first. */
  readonly #pending = new Map<
    string,
    { resolve: (blob: Blob) => void; reject: (e: unknown) => void }[]
  >();
  #created = 0;

  readonly load = (id: string): Promise<Blob> =>
    new Promise((resolve, reject) =>
      this.#pending.set(id, [...(this.#pending.get(id) ?? []), { resolve, reject }]),
    );

  get created(): number {
    return this.#created;
  }

  readonly create = (blob: Blob): string => {
    this.#created += 1;
    return `url:${(blob as Blob & { label: string }).label}:${this.#created}`;
  };

  readonly revoke = (url: string): void => {
    this.revoked.push(url);
  };

  readonly onError = (error: unknown): void => {
    this.errors.push(error);
  };

  release(id: string): void {
    const blob = Object.assign(new Blob([id]), { label: id });
    this.#take(id).resolve(blob);
  }

  fail(id: string, error: unknown): void {
    this.#take(id).reject(error);
  }

  get loading(): string[] {
    return [...this.#pending.keys()];
  }

  #take(id: string) {
    const [pending, ...rest] = this.#pending.get(id) ?? [];
    if (pending === undefined) {
      throw new Error(`nothing is loading "${id}"`);
    }
    if (rest.length === 0) {
      this.#pending.delete(id);
    } else {
      this.#pending.set(id, rest);
    }
    return pending;
  }
}

describe("ObjectUrls", () => {
  it("an id dropped and wanted again while its first load is pending holds exactly one URL", async () => {
    const ports = new FakePorts();
    const urls = new ObjectUrls(ports);

    urls.sync(["a"]);
    urls.sync([]);
    urls.sync(["a"]);
    ports.release("a");
    ports.release("a");
    await urls.settled();

    expect(urls.get("a")).toBeDefined();
    expect(ports.created - ports.revoked.length).toBe(1);
  });

  it("loads each new id once and publishes its URL when it arrives", async () => {
    const ports = new FakePorts();
    const urls = new ObjectUrls(ports);
    const seen: ReadonlyMap<string, string>[] = [];
    urls.subscribe((map) => seen.push(map));

    urls.sync(["a", "b"]);
    urls.sync(["a", "b"]);
    expect(ports.loading).toEqual(["a", "b"]);
    ports.release("a");
    ports.release("b");
    await urls.settled();

    expect(urls.get("a")).toBe("url:a:1");
    expect(urls.get("b")).toBe("url:b:2");
    expect(seen.at(-1)?.size).toBe(2);
  });

  it("revokes the URL of an id that is no longer wanted", async () => {
    const ports = new FakePorts();
    const urls = new ObjectUrls(ports);
    urls.sync(["a", "b"]);
    ports.release("a");
    ports.release("b");
    await urls.settled();

    urls.sync(["b"]);

    expect(urls.get("b")).toBe("url:b:2");
    expect(urls.get("a")).toBeUndefined();
    expect(ports.revoked).toEqual(["url:a:1"]);
  });

  it("creates no URL for a blob that arrives after its id was dropped", async () => {
    const ports = new FakePorts();
    const urls = new ObjectUrls(ports);
    urls.sync(["a", "b"]);
    urls.sync(["b"]);
    ports.release("a");
    ports.release("b");
    await urls.settled();

    expect(urls.get("b")).toBe("url:b:1");
    expect(urls.get("a")).toBeUndefined();
    expect(ports.created).toBe(1);
    expect(ports.revoked).toEqual([]);
  });

  it("revokes every URL once disposed and creates none for a late blob", async () => {
    const ports = new FakePorts();
    const urls = new ObjectUrls(ports);
    urls.sync(["a"]);
    ports.release("a");
    await urls.settled();
    urls.sync(["a", "b"]);

    urls.dispose();
    ports.release("b");
    await urls.settled();

    expect(ports.revoked).toEqual(["url:a:1"]);
    expect(ports.created).toBe(1);
    expect(urls.get("b")).toBeUndefined();
  });

  it("reports a failed load and keeps the other URLs", async () => {
    const ports = new FakePorts();
    const urls = new ObjectUrls(ports);
    const failure = new Error("gone");
    urls.sync(["a", "b"]);
    ports.release("a");
    ports.fail("b", failure);
    await urls.settled();

    expect(urls.get("a")).toBe("url:a:1");
    expect(ports.errors).toEqual([failure]);
  });
});
