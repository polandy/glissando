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

    const first = browsers.for(importing, false);

    expect(browsers.for(importing, false)).toBe(first);
    expect(browsers.for(adding, false)).not.toBe(first);
  });

  it("keeps a separate browser for a listing with videos, asking Immich for them", async () => {
    const client = new FakeImmichClient();
    client.photoAnswers.push({ photos: [], nextPage: null });
    const browsers = new ImmichBrowsers({ client, reportUnavailable: () => undefined });
    const importing = {};

    const withVideos = browsers.for(importing, true);
    await withVideos.library.loadMore();

    expect(withVideos).not.toBe(browsers.for(importing, false));
    expect(browsers.for(importing, true)).toBe(withVideos);
    expect(client.photoQueries).toEqual([{ page: 1, withVideos: true }]);
  });
});
