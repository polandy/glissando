import { describe, expect, it } from "vitest";
import type { PersistentStorageResult } from "../../library/persistent-storage";
import { PersistencePrompt, type RefusalNoticeStore } from "./persistence-prompt";

function promptAnswering(result: PersistentStorageResult, shownBefore = false) {
  const requests: string[] = [];
  let shown = shownBefore;
  const notice: RefusalNoticeStore = {
    wasShown: () => shown,
    recordShown: () => (shown = true),
  };
  const prompt = new PersistencePrompt(() => {
    requests.push("persist");
    return Promise.resolve(result);
  }, notice);
  return { prompt, requests };
}

describe("PersistencePrompt", () => {
  it("asks for persistent storage after the first slideshow created in this tab", async () => {
    const { prompt, requests } = promptAnswering("granted");
    expect(await prompt.afterCreate()).toBe(false);
    expect(requests).toEqual(["persist"]);
  });

  it("asks only once per tab", async () => {
    const { prompt, requests } = promptAnswering("granted");
    await prompt.afterCreate();
    await prompt.afterCreate();
    expect(requests).toEqual(["persist"]);
  });

  it("tells the user about a refusal", async () => {
    const { prompt } = promptAnswering("refused");
    expect(await prompt.afterCreate()).toBe(true);
  });

  it("tells the user about a refusal only once, across reloads", async () => {
    const { prompt, requests } = promptAnswering("refused", true);
    expect(await prompt.afterCreate()).toBe(false);
    expect(requests).toEqual(["persist"]);
  });

  it("stays quiet where the browser has no persistent storage", async () => {
    const { prompt } = promptAnswering("unsupported");
    expect(await prompt.afterCreate()).toBe(false);
  });
});
