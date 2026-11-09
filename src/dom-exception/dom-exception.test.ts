import { describe, expect, it } from "vitest";
import { DOM_EXCEPTION, isDomException } from "./dom-exception";

describe("isDomException", () => {
  it("matches a DOMException of that name", () => {
    expect(isDomException(new DOMException("x", "AbortError"), DOM_EXCEPTION.aborted)).toBe(true);
  });

  it("rejects a DOMException of another name", () => {
    expect(isDomException(new DOMException("x", "NotFoundError"), DOM_EXCEPTION.aborted)).toBe(
      false,
    );
  });

  it("rejects a plain Error that merely carries the name", () => {
    const error = new Error("x");
    error.name = DOM_EXCEPTION.aborted;
    expect(isDomException(error, DOM_EXCEPTION.aborted)).toBe(false);
  });

  it("names the browser's own strings", () => {
    expect(DOM_EXCEPTION).toEqual({
      aborted: "AbortError",
      quotaExceeded: "QuotaExceededError",
      notFound: "NotFoundError",
    });
  });
});
