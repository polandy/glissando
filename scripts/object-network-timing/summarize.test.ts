import { describe, expect, it } from "vitest";
import { summarize, timingTable } from "./summarize";

describe("summarize", () => {
  it("reports the fastest run, the median and the 95th percentile of the samples", () => {
    const samples = Array.from({ length: 20 }, (_, index) => 20 - index);
    expect(summarize(samples)).toEqual({ runs: 20, min: 1, median: 10.5, p95: 19 });
  });

  it("takes the middle sample of an odd count as the median", () => {
    expect(summarize([30, 10, 20]).median).toBe(20);
  });

  it("refuses an empty sample list", () => {
    expect(() => summarize([])).toThrow("No samples");
  });
});

describe("timingTable", () => {
  it("lists one row per runner and throttle, in milliseconds", () => {
    const table = timingTable([
      { runner: "wasm", throttle: 4, summary: { runs: 5, min: 100, median: 120.04, p95: 130 } },
    ]);
    expect(table).toBe(
      [
        "| runner | CPU throttle | runs | min ms | median ms | p95 ms |",
        "| --- | --- | --- | --- | --- | --- |",
        "| wasm | 4× | 5 | 100.0 | 120.0 | 130.0 |",
      ].join("\n"),
    );
  });
});
