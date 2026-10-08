import type { Toaster } from "../toast/toaster";

export type ErrorReporter = (error: unknown) => void;

/** An unexpected error is never swallowed: it is logged and the user sees that something failed. */
export function createErrorReporter(options: {
  readonly log: (error: unknown) => void;
  readonly toaster: Toaster;
  /** The user-language line of the coral toast. */
  readonly text: string;
}): ErrorReporter {
  return (error) => {
    options.log(error);
    options.toaster.show({ text: options.text, tone: "error" });
  };
}
