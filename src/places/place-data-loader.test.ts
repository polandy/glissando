import { describe, expect, it } from "vitest";
import { createPlaceDataLoader } from "./place-data-loader";
import { nearestPlace } from "./nearest-place";

const SAMPLE_TSV = "Lisbon\t38.717\t-9.133";

/** Counts calls and resolves with `text`, independent of any mocking framework. */
function countingFetchText(text: string): {
  fetchText: () => Promise<string>;
  callCount: () => number;
} {
  let callCount = 0;
  return {
    fetchText: () => {
      callCount += 1;
      return Promise.resolve(text);
    },
    callCount: () => callCount,
  };
}

/** Rejects every call until `succeedAfter` calls have happened, then resolves with `text`. */
function flakyFetchText(
  text: string,
  succeedAfter: number,
): { fetchText: () => Promise<string>; callCount: () => number } {
  let callCount = 0;
  return {
    fetchText: () => {
      callCount += 1;
      if (callCount < succeedAfter) {
        return Promise.reject(new Error(`transient failure on call ${callCount}`));
      }
      return Promise.resolve(text);
    },
    callCount: () => callCount,
  };
}

describe("createPlaceDataLoader", () => {
  it("returns the parsed index from the injected fetchText", async () => {
    const { fetchText } = countingFetchText(SAMPLE_TSV);
    const loader = createPlaceDataLoader(fetchText);

    const index = await loader.load();

    expect(nearestPlace(index, 38.717, -9.133)).toEqual({
      name: "Lisbon",
      latitude: 38.717,
      longitude: -9.133,
    });
  });

  it("shares one fetchText call between two concurrent load() calls", async () => {
    const { fetchText, callCount } = countingFetchText(SAMPLE_TSV);
    const loader = createPlaceDataLoader(fetchText);

    const [first, second] = await Promise.all([loader.load(), loader.load()]);

    expect(callCount()).toBe(1);
    expect(first).toEqual(second);
  });

  it("does not call fetchText again on a later load() after the first succeeded", async () => {
    const { fetchText, callCount } = countingFetchText(SAMPLE_TSV);
    const loader = createPlaceDataLoader(fetchText);

    await loader.load();
    await loader.load();

    expect(callCount()).toBe(1);
  });

  it("rejects load() when fetchText rejects, and retries (not a cached failure) on the next call", async () => {
    const { fetchText, callCount } = flakyFetchText(SAMPLE_TSV, 2);
    const loader = createPlaceDataLoader(fetchText);

    await expect(loader.load()).rejects.toThrow("transient failure on call 1");
    expect(callCount()).toBe(1);

    const index = await loader.load();

    expect(callCount()).toBe(2);
    expect(nearestPlace(index, 38.717, -9.133)).toEqual({
      name: "Lisbon",
      latitude: 38.717,
      longitude: -9.133,
    });
  });

  it("gives each call to the factory its own independent, freshly-memoised loader", async () => {
    const first = countingFetchText(SAMPLE_TSV);
    const second = countingFetchText(SAMPLE_TSV);
    const loaderA = createPlaceDataLoader(first.fetchText);
    const loaderB = createPlaceDataLoader(second.fetchText);

    await loaderA.load();
    await loaderB.load();

    expect(first.callCount()).toBe(1);
    expect(second.callCount()).toBe(1);
  });
});
