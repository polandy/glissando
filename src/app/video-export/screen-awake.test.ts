import { describe, expect, it } from "vitest";
import { keepScreenAwake, type ScreenAwakePorts } from "./screen-awake";

class FakeWakeLock implements ScreenAwakePorts {
  visible = true;
  requests = 0;
  readonly held: { released: boolean }[] = [];
  refusal: Error | null = null;
  readonly logged: unknown[] = [];
  #listener: (() => void) | null = null;
  #pending: (() => void)[] = [];

  request(): Promise<{ release(): Promise<void> }> {
    this.requests += 1;
    if (this.refusal !== null) {
      return Promise.reject(this.refusal);
    }
    const lock = { released: false };
    return new Promise((resolve) =>
      this.#pending.push(() => {
        this.held.push(lock);
        resolve({
          release: () => {
            lock.released = true;
            return Promise.resolve();
          },
        });
      }),
    );
  }
  /** Lets the browser grant every lock asked for so far. */
  async grant(): Promise<void> {
    const pending = this.#pending;
    this.#pending = [];
    pending.forEach((grant) => grant());
    await Promise.resolve();
  }
  isVisible(): boolean {
    return this.visible;
  }
  onVisibilityChange(listener: () => void): () => void {
    this.#listener = listener;
    return () => (this.#listener = null);
  }
  show(visible: boolean): void {
    this.visible = visible;
    this.#listener?.();
  }
  log(error: unknown): void {
    this.logged.push(error);
  }
}

describe("keepScreenAwake", () => {
  it("holds a wake lock until released", async () => {
    const lock = new FakeWakeLock();
    const awake = keepScreenAwake(lock);
    await lock.grant();
    expect(lock.held).toEqual([{ released: false }]);

    awake.release();
    await Promise.resolve();

    expect(lock.held).toEqual([{ released: true }]);
  });

  it("asks again when the page becomes visible, since the browser drops the lock on hiding", async () => {
    const lock = new FakeWakeLock();
    keepScreenAwake(lock);
    await lock.grant();

    lock.show(false);
    expect(lock.requests).toBe(1);
    lock.show(true);
    await lock.grant();

    expect(lock.requests).toBe(2);
  });

  it("asks no more once released", async () => {
    const lock = new FakeWakeLock();
    const awake = keepScreenAwake(lock);
    await lock.grant();

    awake.release();
    lock.show(true);

    expect(lock.requests).toBe(1);
  });

  it("releases a lock granted only after the release", async () => {
    const lock = new FakeWakeLock();
    const awake = keepScreenAwake(lock);

    awake.release();
    await lock.grant();
    await Promise.resolve();

    expect(lock.held).toEqual([{ released: true }]);
  });

  it("logs a refused lock and carries on, since the export runs without one", async () => {
    const lock = new FakeWakeLock();
    const refused = new DOMException("battery saver", "NotAllowedError");
    lock.refusal = refused;

    keepScreenAwake(lock);
    await Promise.resolve();
    await Promise.resolve();

    expect(lock.logged).toEqual([refused]);
  });

  it("does not ask while the page is hidden", () => {
    const lock = new FakeWakeLock();
    lock.visible = false;

    keepScreenAwake(lock);

    expect(lock.requests).toBe(0);
  });
});
