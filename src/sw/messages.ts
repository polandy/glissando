/**
 * What the app posts to the service worker. Types only: the worker imports nothing at runtime
 * (ADR-0005), so each side spells the value out and the type keeps them in step.
 */
export interface SkipWaitingMessage {
  readonly type: "SKIP_WAITING";
}
