/**
 * How far a frame change has come: a drag under way is stored on release, a wheel tick once the
 * wheel has rested `WHEEL_REST_MS`, and a finished change at once.
 */
export type FramingStep = "dragging" | "wheeling" | "done";

/** One burst of wheel ticks is one stored edit, not dozens of writes per second. */
export const WHEEL_REST_MS = 400;
