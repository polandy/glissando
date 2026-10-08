import { describe, expect, it } from "vitest";
import {
  registerServiceWorker,
  SERVICE_WORKER_URL,
  type ContainerPort,
  type RegistrationPort,
  type WorkerPort,
} from "./service-worker-updates";

class FakeWorker extends EventTarget implements WorkerPort {
  state: ServiceWorkerState = "installing";
  readonly messages: unknown[] = [];

  postMessage(message: unknown): void {
    this.messages.push(message);
  }

  become(state: ServiceWorkerState): void {
    this.state = state;
    this.dispatchEvent(new Event("statechange"));
  }
}

class FakeRegistration extends EventTarget implements RegistrationPort {
  waiting: FakeWorker | null = null;
  installing: FakeWorker | null = null;

  findUpdate(): FakeWorker {
    const worker = new FakeWorker();
    this.installing = worker;
    this.dispatchEvent(new Event("updatefound"));
    return worker;
  }
}

class FakeContainer extends EventTarget implements ContainerPort {
  readonly registered: string[] = [];
  readonly registration = new FakeRegistration();
  failure: Error | null = null;
  resolvesToNothing = false;

  constructor(public controller: object | null) {
    super();
  }

  register(url: string): Promise<RegistrationPort | undefined> {
    this.registered.push(url);
    if (this.resolvesToNothing) {
      return Promise.resolve(undefined);
    }
    return this.failure === null
      ? Promise.resolve(this.registration)
      : Promise.reject(this.failure);
  }

  changeController(): void {
    this.controller = {};
    this.dispatchEvent(new Event("controllerchange"));
  }
}

function setUp(controlled = true) {
  const container = new FakeContainer(controlled ? {} : null);
  const reloads: string[] = [];
  const errors: unknown[] = [];
  const start = () =>
    registerServiceWorker({
      container,
      reload: () => reloads.push("reload"),
      onError: (error) => errors.push(error),
    });
  return { container, reloads, errors, start };
}

function waitingCount(updates: { onWaiting(listener: () => void): void }): () => number {
  let count = 0;
  updates.onWaiting(() => (count += 1));
  return () => count;
}

describe("registerServiceWorker", () => {
  it("registers the worker next to the app", async () => {
    const { container, start } = setUp();
    await start().registered;
    expect(container.registered).toEqual([SERVICE_WORKER_URL]);
    expect(SERVICE_WORKER_URL).toBe("./sw.js");
  });

  it("reports a version that already waits", async () => {
    const { container, start } = setUp();
    container.registration.waiting = new FakeWorker();
    const updates = start();
    await updates.registered;
    expect(waitingCount(updates)()).toBe(1);
  });

  it("reports a new version once it has installed", async () => {
    const { container, start } = setUp();
    const updates = start();
    const waiting = waitingCount(updates);
    await updates.registered;
    const worker = container.registration.findUpdate();
    expect(waiting()).toBe(0);
    worker.become("installed");
    expect(waiting()).toBe(1);
  });

  it("reports no update for the first install, which has nothing to replace", async () => {
    const { container, start } = setUp(false);
    const updates = start();
    const waiting = waitingCount(updates);
    await updates.registered;
    const worker = container.registration.findUpdate();
    worker.become("installed");
    expect(worker.state).toBe("installed");
    expect(waiting()).toBe(0);
  });

  it("asks the waiting version to take over and reloads once it has", async () => {
    const { container, reloads, start } = setUp();
    const worker = new FakeWorker();
    container.registration.waiting = worker;
    const updates = start();
    await updates.registered;
    updates.apply();
    expect(worker.messages).toEqual([{ type: "SKIP_WAITING" }]);
    expect(reloads).toEqual([]);
    container.changeController();
    expect(reloads).toEqual(["reload"]);
  });

  it("does not reload a tab that did not ask when another tab updates", async () => {
    const { container, reloads, start } = setUp();
    container.registration.waiting = new FakeWorker();
    const updates = start();
    await updates.registered;
    container.changeController();
    expect(container.controller).not.toBeNull();
    expect(reloads).toEqual([]);
  });

  it("just reloads once another tab let the new version take over", async () => {
    const { container, reloads, start } = setUp();
    const worker = new FakeWorker();
    container.registration.waiting = worker;
    const updates = start();
    await updates.registered;
    container.changeController();
    updates.apply();
    expect(worker.messages).toEqual([]);
    expect(reloads).toEqual(["reload"]);
  });

  it("refuses to apply an update when none waits", async () => {
    const { start } = setUp();
    const updates = start();
    await updates.registered;
    expect(() => updates.apply()).toThrow(/no new version/);
  });

  it("reports a failed registration", async () => {
    const { container, errors, start } = setUp();
    const failure = new Error("blocked");
    container.failure = failure;
    await start().registered;
    expect(errors).toEqual([failure]);
  });

  it("reports a registration that resolved to nothing, as a blocked one does", async () => {
    const { container, errors, start } = setUp();
    container.resolvesToNothing = true;
    const updates = start();
    await updates.registered;
    expect(errors).toHaveLength(1);
    expect(() => updates.apply()).toThrow(/no new version/);
  });
});
