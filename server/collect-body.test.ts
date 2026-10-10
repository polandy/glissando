import { describe, expect, it } from "vitest";
import { collectBody } from "./collect-body";

/** Chunks of the given sizes, counting how many were read. */
function chunks(...sizes: number[]) {
  const reading = { read: 0 };
  async function* generate() {
    for (const size of sizes) {
      reading.read += 1;
      yield new Uint8Array(size).fill(size);
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
});
