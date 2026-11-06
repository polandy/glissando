import { describe, expect, it } from "vitest";
import {
  WorkerRequestClient,
  type ReplyReading,
  type RequestWorker,
} from "./worker-request-client";

interface TestRequest {
  readonly id: number;
  readonly payload: string;
}
type TestReply =
  | { readonly id: number; readonly kind: "answer"; readonly text: string }
  | { readonly id: number; readonly kind: "failure"; readonly message: string }
  | { readonly id: number; readonly kind: "gone"; readonly message: string };

class TestGoneError extends Error {}
class TestFailureError extends Error {}

const CRASH_MESSAGE = "the worker crashed";
const UNREADABLE_MESSAGE = "a reply could not be read";

function readReply(reply: TestReply): ReplyReading<string> {
  switch (reply.kind) {
    case "answer":
      return { kind: "settled", id: reply.id, result: reply.text };
    case "failure":
      return { kind: "failed", id: reply.id, error: new TestFailureError(reply.message) };
    case "gone":
      return { kind: "gone", message: reply.message };
  }
}

/** Stands in for the worker: records requests, replies and fails only when the test says so. */
class FakeWorker implements RequestWorker<TestRequest, TestReply> {
  readonly requests: TestRequest[] = [];
  readonly transfers: Transferable[][] = [];
  onmessage: ((event: MessageEvent<TestReply>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;

  postMessage(request: TestRequest, transfer: Transferable[]): void {
    this.requests.push(request);
    this.transfers.push(transfer);
  }

  reply(reply: TestReply): void {
    this.onmessage?.(new MessageEvent("message", { data: reply }));
  }

  answer(index: number, text: string): void {
    this.reply({ id: this.idAt(index), kind: "answer", text });
  }

  idAt(index: number): number {
    const request = this.requests[index];
    if (request === undefined) throw new Error(`no request ${index}; ${this.requests.length} sent`);
    return request.id;
  }

  crash(): void {
    this.onerror?.(new ErrorEvent("error"));
  }

  unreadableReply(): void {
    this.onmessageerror?.(new MessageEvent("messageerror"));
  }
}

function clientWithFakeWorker(): {
  client: WorkerRequestClient<TestRequest, TestReply, string>;
  workers: FakeWorker[];
} {
  const workers: FakeWorker[] = [];
  const client = new WorkerRequestClient<TestRequest, TestReply, string>({
    startWorker: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
    readReply,
    goneError: (message) => new TestGoneError(message),
    crashMessage: CRASH_MESSAGE,
    unreadableReplyMessage: UNREADABLE_MESSAGE,
  });
  return { client, workers };
}

const ask = (client: WorkerRequestClient<TestRequest, TestReply, string>, payload: string) =>
  client.request((id) => ({ id, payload }));

describe("WorkerRequestClient", () => {
  it("starts no worker before the first request", () => {
    const { workers } = clientWithFakeWorker();

    expect(workers).toHaveLength(0);
  });

  it("runs every request in one worker", async () => {
    const { client, workers } = clientWithFakeWorker();

    const first = ask(client, "a");
    const second = ask(client, "b");
    workers[0]?.answer(0, "A");
    workers[0]?.answer(1, "B");
    await Promise.all([first, second]);

    expect(workers).toHaveLength(1);
    expect(workers[0]?.requests.map((request) => request.payload)).toEqual(["a", "b"]);
  });

  it("gives each request its own id", async () => {
    const { client, workers } = clientWithFakeWorker();

    const first = ask(client, "a");
    const second = ask(client, "b");
    workers[0]?.answer(0, "A");
    workers[0]?.answer(1, "B");
    await Promise.all([first, second]);

    expect(workers[0]?.idAt(0)).not.toBe(workers[0]?.idAt(1));
  });

  it("matches replies to requests by id, whatever order they arrive in", async () => {
    const { client, workers } = clientWithFakeWorker();
    const first = ask(client, "a");
    const second = ask(client, "b");

    workers[0]?.answer(1, "B");
    workers[0]?.answer(0, "A");

    await expect(first).resolves.toBe("A");
    await expect(second).resolves.toBe("B");
  });

  it("rejects only the request whose reply is a failure", async () => {
    const { client, workers } = clientWithFakeWorker();
    const broken = ask(client, "a");
    const fine = ask(client, "b");
    const worker = workers[0];

    worker?.reply({ id: worker.idAt(0), kind: "failure", message: "cannot do it" });
    worker?.answer(1, "B");

    await expect(broken).rejects.toThrow(TestFailureError);
    await expect(broken).rejects.toThrow("cannot do it");
    await expect(fine).resolves.toBe("B");
    expect(client.gone).toBeUndefined();
  });

  it("ignores a reply for an id nobody is waiting on", async () => {
    const { client, workers } = clientWithFakeWorker();
    const waiting = ask(client, "a");
    const worker = workers[0];

    worker?.reply({ id: 999, kind: "answer", text: "stray" });
    worker?.answer(0, "A");

    await expect(waiting).resolves.toBe("A");
    expect(client.gone).toBeUndefined();
  });

  it("passes the transfer list to the worker", async () => {
    const { client, workers } = clientWithFakeWorker();
    const buffer = new ArrayBuffer(8);

    const transferring = client.request((id) => ({ id, payload: "a" }), [buffer]);
    const plain = ask(client, "b");
    workers[0]?.answer(0, "A");
    workers[0]?.answer(1, "B");
    await Promise.all([transferring, plain]);

    expect(workers[0]?.transfers).toEqual([[buffer], []]);
  });

  it("rejects every pending request with the gone error when the worker crashes", async () => {
    const { client, workers } = clientWithFakeWorker();
    const first = ask(client, "a");
    const second = ask(client, "b");

    workers[0]?.crash();

    await expect(first).rejects.toThrow(TestGoneError);
    await expect(first).rejects.toThrow(CRASH_MESSAGE);
    await expect(second).rejects.toThrow(CRASH_MESSAGE);
    expect(client.gone).toBeInstanceOf(TestGoneError);
  });

  it("rejects later requests at once after a crash with the same error, without a new worker", async () => {
    const { client, workers } = clientWithFakeWorker();
    const before = ask(client, "a");
    workers[0]?.crash();
    const error = await before.catch((caught: unknown) => caught);

    await expect(ask(client, "b")).rejects.toBe(error);
    expect(client.gone).toBe(error);
    expect(workers).toHaveLength(1);
    expect(workers[0]?.requests).toHaveLength(1);
  });

  it("rejects pending and later requests when a reply cannot be read", async () => {
    const { client, workers } = clientWithFakeWorker();
    const first = ask(client, "a");
    const second = ask(client, "b");

    workers[0]?.unreadableReply();

    await expect(first).rejects.toThrow(UNREADABLE_MESSAGE);
    await expect(second).rejects.toThrow(UNREADABLE_MESSAGE);
    await expect(ask(client, "c")).rejects.toThrow(TestGoneError);
    expect(workers).toHaveLength(1);
    expect(workers[0]?.requests).toHaveLength(2);
  });

  it("is gone with the worker's own message when a reply says so", async () => {
    const { client, workers } = clientWithFakeWorker();
    const first = ask(client, "a");
    const second = ask(client, "b");
    const worker = workers[0];

    worker?.reply({ id: worker.idAt(0), kind: "gone", message: "cannot work at all" });

    await expect(first).rejects.toThrow("cannot work at all");
    await expect(second).rejects.toThrow(TestGoneError);
    await expect(ask(client, "c")).rejects.toThrow("cannot work at all");
    expect(worker?.requests).toHaveLength(2);
  });

  it("keeps the first gone error when the worker goes wrong again", async () => {
    const { client, workers } = clientWithFakeWorker();
    const before = ask(client, "a");
    workers[0]?.crash();
    const error = await before.catch((caught: unknown) => caught);

    workers[0]?.unreadableReply();

    expect(client.gone).toBe(error);
  });
});
