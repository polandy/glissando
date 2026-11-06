/** The part of a `Worker` that a `WorkerRequestClient` talks to. */
export interface RequestWorker<Request, Reply> {
  postMessage(request: Request, transfer: Transferable[]): void;
  onmessage: ((event: MessageEvent<Reply>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
}

/** What one reply means: an answer or a failure for one request, or the end of the worker. */
export type ReplyReading<Result> =
  | { readonly kind: "settled"; readonly id: number; readonly result: Result }
  | { readonly kind: "failed"; readonly id: number; readonly error: Error }
  | { readonly kind: "gone"; readonly message: string };

export interface WorkerRequestClientOptions<Request, Reply, Result> {
  startWorker(): RequestWorker<Request, Reply>;
  readReply(reply: Reply): ReplyReading<Result>;
  goneError(message: string): Error;
  crashMessage: string;
  unreadableReplyMessage: string;
}

interface Pending<Result> {
  resolve(result: Result): void;
  reject(error: Error): void;
}

/**
 * Sends id-tagged requests to one worker, started on the first request, and settles each by the
 * id of its reply. Once the worker has crashed, sent a reply that cannot be read or been read as
 * gone, every pending and later request rejects with one and the same error.
 */
export class WorkerRequestClient<Request, Reply, Result> {
  readonly #options: WorkerRequestClientOptions<Request, Reply, Result>;
  readonly #pending = new Map<number, Pending<Result>>();
  #worker: RequestWorker<Request, Reply> | undefined;
  #gone: Error | undefined;
  #nextId = 0;

  constructor(options: WorkerRequestClientOptions<Request, Reply, Result>) {
    this.#options = options;
  }

  /** Set once the worker can serve no request any more. */
  get gone(): Error | undefined {
    return this.#gone;
  }

  request(build: (id: number) => Request, transfer: Transferable[] = []): Promise<Result> {
    if (this.#gone) return Promise.reject(this.#gone);
    const id = this.#nextId++;
    const { promise, resolve, reject } = Promise.withResolvers<Result>();
    this.#pending.set(id, { resolve, reject });
    this.#workerStarted().postMessage(build(id), transfer);
    return promise;
  }

  #workerStarted(): RequestWorker<Request, Reply> {
    if (this.#worker) return this.#worker;
    const worker = this.#options.startWorker();
    worker.onmessage = (event) => this.#settle(this.#options.readReply(event.data));
    worker.onerror = () => this.#goneWith(this.#options.crashMessage);
    worker.onmessageerror = () => this.#goneWith(this.#options.unreadableReplyMessage);
    this.#worker = worker;
    return worker;
  }

  #settle(reading: ReplyReading<Result>): void {
    if (reading.kind === "gone") {
      this.#goneWith(reading.message);
      return;
    }
    const pending = this.#pending.get(reading.id);
    this.#pending.delete(reading.id);
    if (reading.kind === "settled") pending?.resolve(reading.result);
    else pending?.reject(reading.error);
  }

  #goneWith(message: string): void {
    this.#gone ??= this.#options.goneError(message);
    for (const pending of this.#pending.values()) pending.reject(this.#gone);
    this.#pending.clear();
  }
}
