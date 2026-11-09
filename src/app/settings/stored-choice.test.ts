import { describe, expect, it } from "vitest";
import { createMemoryStorage } from "../testing/memory-storage";
import { createStoredChoice } from "./stored-choice";

const KEY = "glissando.test";
const CHOICES = ["a", "b"] as const;

function setup(initial: Record<string, string>) {
  const warnings: string[] = [];
  const choice = createStoredChoice(createMemoryStorage(initial), KEY, CHOICES, "a", (message) =>
    warnings.push(message),
  );
  return { choice, warnings };
}

describe("stored choice", () => {
  it("reads back a stored choice without a warning", () => {
    const { choice, warnings } = setup({ [KEY]: "b" });

    expect(choice.read()).toBe("b");
    expect(warnings).toEqual([]);
  });

  it("reads the fallback without a warning when nothing is stored", () => {
    const { choice, warnings } = setup({});

    expect(choice.read()).toBe("a");
    expect(warnings).toEqual([]);
  });

  it("warns once, naming the key and value, when the stored value is unknown", () => {
    const { choice, warnings } = setup({ [KEY]: "zzz" });

    expect(choice.read()).toBe("a");
    expect(choice.read()).toBe("a");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(KEY);
    expect(warnings[0]).toContain("zzz");
  });
});
