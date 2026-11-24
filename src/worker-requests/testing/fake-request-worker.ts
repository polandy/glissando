import {
  WorkerRequestClient,
  type IdleEnd,
  type ReplyReading,
  type RequestWorker,
} from "../worker-request-client";

export interface TestRequest {
  readonly id: number;
  readonly payload: string;
}
export type TestReply =
  | { readonly id: number; readonly kind: "answer"; readonly text: string }
  | { readonly id: number; readonly kind: "failure"; readonly message: string }
  | { readonly id: number; readonly kind: "gone"; readonly message: string };

export class TestGoneError extends Error {}
export class TestFailureError extends Error {}

export const CRASH_MESSAGE = "the worker crashed";
export const UNREADABLE_MESSAGE = "a reply could not be read";

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
  terminated = false;

  postMessage(request: TestRequest, transfer: Transferable[]): void {
    this.requests.push(request);
    this.transfers.push(transfer);
  }

  terminate(): void {
    this.terminated = true;
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

export function clientWithFakeWorker(idleEnd?: IdleEnd): {
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
    ...(idleEnd && { idleEnd }),
  });
  return { client, workers };
}

export const ask = (client: WorkerRequestClient<TestRequest, TestReply, string>, payload: string) =>
  client.request((id) => ({ id, payload }));
