import { describe, expect, it } from "vitest";
import { FakeScheduler } from "../ui-kit/testing/fake-scheduler";
import { ask, clientWithFakeWorker } from "./testing/fake-request-worker";

const IDLE_MS = 1_000;

function clientEndingIdleWorkers() {
  const scheduler = new FakeScheduler();
  return { scheduler, ...clientWithFakeWorker({ afterMs: IDLE_MS, scheduler }) };
}

describe("WorkerRequestClient, ending an idle worker", () => {
  it("terminates the worker once it has had no request for the idle time", async () => {
    const { client, scheduler, workers } = clientEndingIdleWorkers();
    const answered = ask(client, "a");
    workers[0]?.answer(0, "A");
    await answered;

    scheduler.advance(IDLE_MS - 1);
    expect(workers[0]?.terminated).toBe(false);
    scheduler.advance(1);

    expect(workers[0]?.terminated).toBe(true);
  });

  it("keeps the worker while a request is still pending", async () => {
    const { client, scheduler, workers } = clientEndingIdleWorkers();
    const first = ask(client, "a");
    const second = ask(client, "b");
    workers[0]?.answer(0, "A");
    await first;

    scheduler.advance(IDLE_MS);
    expect(workers[0]?.terminated).toBe(false);
    workers[0]?.answer(1, "B");
    await second;
    scheduler.advance(IDLE_MS);

    expect(workers[0]?.terminated).toBe(true);
  });

  it("counts the idle time from the last reply, so a new request keeps the worker", async () => {
    const { client, scheduler, workers } = clientEndingIdleWorkers();
    const first = ask(client, "a");
    workers[0]?.answer(0, "A");
    await first;
    scheduler.advance(IDLE_MS - 1);
    const second = ask(client, "b");
    workers[0]?.answer(1, "B");
    await second;

    scheduler.advance(IDLE_MS - 1);
    expect(workers[0]?.terminated).toBe(false);
    scheduler.advance(1);

    expect(workers).toHaveLength(1);
    expect(workers[0]?.terminated).toBe(true);
  });

  it("starts a fresh worker for the first request after an idle end", async () => {
    const { client, scheduler, workers } = clientEndingIdleWorkers();
    const first = ask(client, "a");
    workers[0]?.answer(0, "A");
    await first;
    scheduler.advance(IDLE_MS);

    const second = ask(client, "b");
    workers[1]?.answer(0, "B");

    await expect(second).resolves.toBe("B");
    expect(workers).toHaveLength(2);
    expect(workers[0]?.requests).toHaveLength(1);
  });

  it("lets a stray reply start no idle end of its own, which a later request could not cancel", async () => {
    const { client, scheduler, workers } = clientEndingIdleWorkers();
    const first = ask(client, "a");
    workers[0]?.answer(0, "A");
    await first;
    workers[0]?.reply({ id: 999, kind: "answer", text: "stray" });

    const second = ask(client, "b");
    scheduler.advance(IDLE_MS);
    expect(workers[0]?.terminated).toBe(false);
    workers[0]?.answer(1, "B");

    await expect(second).resolves.toBe("B");
  });

  it("counts a failed request as ended too", async () => {
    const { client, scheduler, workers } = clientEndingIdleWorkers();
    const failing = ask(client, "a");
    const worker = workers[0];
    worker?.reply({ id: worker.idAt(0), kind: "failure", message: "cannot do it" });
    await failing.catch(() => undefined);

    scheduler.advance(IDLE_MS);

    expect(worker?.terminated).toBe(true);
  });

  it("never ends a worker unless asked to", async () => {
    const { client, workers } = clientWithFakeWorker();
    const answered = ask(client, "a");
    workers[0]?.answer(0, "A");
    await answered;

    expect(workers[0]?.terminated).toBe(false);
  });
});
