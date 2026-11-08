import { describe, expect, it } from "vitest";
import { collectBody, DRAIN_BUDGET_BYTES } from "./collect-body";

/** Chunks of the given sizes, counting how many were read and whether the stream was closed. */
function chunks(...sizes: number[]) {
  const reading = { read: 0, closed: false };
  async function* generate() {
    try {
      for (const size of sizes) {
        reading.read += 1;
        yield new Uint8Array(size).fill(size);
      }
    } finally {
      reading.closed = true;
    }
  }
  return { body: generate(), reading };
}

describe("collectBody", () => {
  it("joins the chunks into the bytes received", async () => {
    const { body } = chunks(2, 3);
    expect(await collectBody(body, 10)).toEqual({
      kind: "received",
      bytes: new Uint8Array([2, 2, 3, 3, 3]),
    });
  });

  it("receives a body of exactly the limit", async () => {
    const { body } = chunks(4, 6);
    expect((await collectBody(body, 10)).kind).toBe("received");
  });

  it("is too large once the chunks pass the limit, still reading them all", async () => {
    const { body, reading } = chunks(6, 6, 6);
    expect(await collectBody(body, 10)).toEqual({ kind: "tooLarge" });
    expect(reading.read).toBe(3);
  });

  it("stops reading once the drain budget past the limit is spent, leaving the stream open", async () => {
    const { body, reading } = chunks(6, 6, DRAIN_BUDGET_BYTES, 6);
    expect(await collectBody(body, 10)).toEqual({ kind: "tooLargeUnread" });
    expect(reading.read).toBe(3);
    expect(reading.closed).toBe(false);
  });

  it("drains a body that passes the limit by exactly the budget", async () => {
    const { body, reading } = chunks(10, DRAIN_BUDGET_BYTES);
    expect(await collectBody(body, 10)).toEqual({ kind: "tooLarge" });
    expect(reading.closed).toBe(true);
  });
});
