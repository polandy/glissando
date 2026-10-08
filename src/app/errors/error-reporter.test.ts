import { describe, expect, it } from "vitest";
import { FakeScheduler } from "../testing/fake-scheduler";
import { Toaster } from "../toast/toaster";
import { createErrorReporter } from "./error-reporter";

describe("createErrorReporter", () => {
  it("logs an unexpected error and shows it as a coral toast", () => {
    const toaster = new Toaster(new FakeScheduler());
    const logged: unknown[] = [];
    const report = createErrorReporter({
      log: (error) => logged.push(error),
      toaster,
      text: () => "Etwas ist schiefgegangen.",
    });
    const failure = new Error("boom");

    report(failure);

    expect(logged).toEqual([failure]);
    expect(toaster.current).toEqual({ text: "Etwas ist schiefgegangen.", tone: "error" });
  });

  it("words the toast in the language in effect when the error happens", () => {
    const toaster = new Toaster(new FakeScheduler());
    let text = "Etwas ist schiefgegangen.";
    const report = createErrorReporter({ log: () => {}, toaster, text: () => text });

    text = "Something went wrong.";
    report(new Error("boom"));

    expect(toaster.current?.text).toBe("Something went wrong.");
  });
});
