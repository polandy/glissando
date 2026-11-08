import { describe, expect, it } from "vitest";
import { createPlaceResolver } from "./place-resolver";
import { parsePlaceList } from "./nearest-place";

const LISBON = { latitude: 38.7, longitude: -9.1 };

describe("createPlaceResolver", () => {
  it("resolves the nearest place while loading works", async () => {
    const index = parsePlaceList("Lisbon\t38.717\t-9.133");
    const resolve = createPlaceResolver(
      () => Promise.resolve(index),
      () => undefined,
    );
    expect((await resolve(LISBON))?.name).toBe("Lisbon");
  });

  it("loads and logs once, then answers null without loading again after a failure", async () => {
    let loads = 0;
    const logged: unknown[] = [];
    const resolve = createPlaceResolver(
      () => {
        loads += 1;
        return Promise.reject(new Error("404"));
      },
      (error) => logged.push(error),
    );
    expect(await resolve(LISBON)).toBeNull();
    expect(await resolve(LISBON)).toBeNull();
    expect(loads).toBe(1);
    expect(logged).toHaveLength(1);
  });
});
