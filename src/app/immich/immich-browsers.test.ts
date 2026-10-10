import { describe, expect, it } from "vitest";
import { FakeImmichClient } from "../../immich/testing/fake-immich-client";
import { ImmichBrowsers } from "./immich-browsers";

describe("ImmichBrowsers", () => {
  it("keeps one browser per intake, so its selection lives as long as that intake", () => {
    const browsers = new ImmichBrowsers({
      client: new FakeImmichClient(),
      reportUnavailable: () => undefined,
    });
    const importing = {};
    const adding = {};

    const first = browsers.for(importing);

    expect(browsers.for(importing)).toBe(first);
    expect(browsers.for(adding)).not.toBe(first);
  });
});
