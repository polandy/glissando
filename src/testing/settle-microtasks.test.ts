import { describe, expect, it } from "vitest";
import { settleMicrotasks } from "./settle-microtasks";

describe("settleMicrotasks", () => {
  it("runs a reaction many promise hops deep, which a fixed count of ticks would miss", async () => {
    let reached = false;
    let chain: Promise<void> = Promise.resolve();
    for (let hop = 0; hop < 25; hop++) {
      chain = chain.then(() => undefined);
    }
    void chain.then(() => (reached = true));

    await settleMicrotasks();

    expect(reached).toBe(true);
  });
});
