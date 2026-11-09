import { describe, expect, it } from "vitest";
import { isQuotaExceeded } from "./is-quota-exceeded";

const quota = () => new DOMException("full", "QuotaExceededError");

describe("isQuotaExceeded", () => {
  it("recognises a quota DOMException", () => {
    expect(isQuotaExceeded(quota())).toBe(true);
  });

  it("recognises a quota error wrapped as the cause of another error", () => {
    expect(
      isQuotaExceeded(new Error("write failed", { cause: new Error("x", { cause: quota() }) })),
    ).toBe(true);
  });

  it("rejects other errors and non-errors", () => {
    expect(isQuotaExceeded(new Error("QuotaExceededError"))).toBe(false);
    expect(isQuotaExceeded(new DOMException("x", "AbortError"))).toBe(false);
    expect(isQuotaExceeded("QuotaExceededError")).toBe(false);
  });
});
