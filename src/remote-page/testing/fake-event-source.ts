import {
  EVENT_SOURCE_CLOSED,
  EVENT_SOURCE_CONNECTING,
  type EventSourcePort,
} from "../remote-stream";

/** An `EventSource` the test drives: it delivers what the test sends, as a browser would. */
export class FakeEventSource implements EventSourcePort {
  readyState = EVENT_SOURCE_CONNECTING;
  closed = false;
  private readonly listeners = new Map<string, ((event: Event) => void)[]>();

  constructor(readonly url: string) {}

  addEventListener(type: string, listener: (event: Event) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  close(): void {
    this.closed = true;
    this.readyState = EVENT_SOURCE_CLOSED;
  }

  /** An `event: <type>` with `data: <data>` from the server. */
  send(type: string, data: string): void {
    this.dispatch(type, new MessageEvent(type, { data }));
  }

  /** The connection broke: the browser retries (`CONNECTING`) or has given up (`CLOSED`). */
  fail(readyState: number): void {
    this.readyState = readyState;
    this.dispatch("error", new Event("error"));
  }

  private dispatch(type: string, event: Event): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}
