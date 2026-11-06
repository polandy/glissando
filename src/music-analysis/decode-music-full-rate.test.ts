import { describe, expect, it } from "vitest";
import { onceProbed } from "./decode-music-full-rate";

describe("onceProbed", () => {
  it("does not probe until asked, then probes once however often it is asked", async () => {
    let probes = 0;
    const rate = onceProbed(() => {
      probes += 1;
      return Promise.resolve(48_000);
    });
    expect(probes).toBe(0);

    const answers = await Promise.all([rate(), rate()]);
    answers.push(await rate());

    expect(answers).toEqual([48_000, 48_000, 48_000]);
    expect(probes).toBe(1);
  });
});
