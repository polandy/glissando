import { describe, expect, it } from "vitest";
import {
  ImmichUnavailableError,
  WHOLE_LIBRARY,
  type PhotoSource,
  type ImmichUnavailableKind,
} from "./immich-client";
import { PhotoFeed, type PhotoFeedState } from "./photo-feed";
import { FakeImmichClient, photo } from "./testing/fake-immich-client";

const FIRST = [photo("a"), photo("b")];
const SECOND = [photo("c")];

function setUp(albumId?: string) {
  const client = new FakeImmichClient();
  const reported: ImmichUnavailableKind[] = [];
  const reportUnavailable = (kind: ImmichUnavailableKind) => reported.push(kind);
  const source: PhotoSource = albumId === undefined ? WHOLE_LIBRARY : { kind: "album", albumId };
  const feed = new PhotoFeed({ client, reportUnavailable, source });
  const seen: PhotoFeedState[] = [];
  feed.subscribe((state) => seen.push(state));
  return { client, feed, seen, reported };
}

describe("PhotoFeed", () => {
  it("asks for videos too only when told to", async () => {
    const client = new FakeImmichClient();
    client.photoAnswers.push({ photos: [], nextPage: null });

    await new PhotoFeed({
      client,
      reportUnavailable: () => undefined,
      source: WHOLE_LIBRARY,
      withVideos: true,
    }).loadMore();

    expect(client.photoQueries).toEqual([{ page: 1, source: WHOLE_LIBRARY, withVideos: true }]);
  });

  it("starts empty, not loading, and tells a subscriber at once", () => {
    const { feed, seen } = setUp();

    const empty = { photos: [], hiddenTakenAt: [], loading: false, done: false, failure: null };
    expect(feed.state).toEqual(empty);
    expect(seen).toEqual([empty]);
  });

  it("loads the library page by page, appending each", async () => {
    const { client, feed } = setUp();
    client.photoAnswers.push({ photos: FIRST, nextPage: 2 }, { photos: SECOND, nextPage: null });

    await feed.loadMore();
    await feed.loadMore();

    expect(client.photoQueries).toEqual([
      { page: 1, source: WHOLE_LIBRARY },
      { page: 2, source: WHOLE_LIBRARY },
    ]);
    expect(feed.state).toEqual({
      photos: [...FIRST, ...SECOND],
      hiddenTakenAt: [],
      loading: false,
      done: true,
      failure: null,
    });
  });

  it("loads one album's photos", async () => {
    const { client, feed } = setUp("album-1");
    client.photoAnswers.push({ photos: FIRST, nextPage: null });

    await feed.loadMore();

    expect(client.photoQueries).toEqual([
      { page: 1, source: { kind: "album", albumId: "album-1" } },
    ]);
  });

  it("reads on past pages without a JPEG until it finds photos", async () => {
    const { client, feed, seen } = setUp();
    client.photoAnswers.push(
      { photos: [], hiddenTakenAt: ["2025-07-12T10:00:00Z", "2025-07-12T09:00:00Z"], nextPage: 2 },
      { photos: [], hiddenTakenAt: ["2025-07-11T10:00:00Z"], nextPage: 3 },
      { photos: FIRST, hiddenTakenAt: ["2025-07-10T10:00:00Z"], nextPage: null },
    );

    await feed.loadMore();

    expect(client.photoQueries.map(({ page }) => page)).toEqual([1, 2, 3]);
    expect(feed.state).toEqual({
      photos: FIRST,
      hiddenTakenAt: [
        "2025-07-12T10:00:00Z",
        "2025-07-12T09:00:00Z",
        "2025-07-11T10:00:00Z",
        "2025-07-10T10:00:00Z",
      ],
      loading: false,
      done: true,
      failure: null,
    });
    expect(seen.map((state) => state.loading)).toEqual([false, true, true, true, false]);
  });

  it("keeps the photos and offers the failed page again when a page fails mid-way", async () => {
    const { client, feed } = setUp();
    client.photoAnswers.push(
      { photos: [], hiddenTakenAt: ["2025-07-12T10:00:00Z"], nextPage: 2 },
      new ImmichUnavailableError("offline"),
      { photos: FIRST, nextPage: null },
    );

    await feed.loadMore();
    expect(feed.state.failure).toBe("offline");
    expect(feed.state.hiddenTakenAt).toEqual(["2025-07-12T10:00:00Z"]);
    await feed.retry();

    expect(client.photoQueries.map(({ page }) => page)).toEqual([1, 2, 2]);
    expect(feed.state.photos).toEqual(FIRST);
    expect(feed.state.done).toBe(true);
  });

  it("is loading while a page is under way", async () => {
    const { client, feed, seen } = setUp();
    const answer = client.holdPhotos();

    const loading = feed.loadMore();
    expect(feed.state.loading).toBe(true);
    answer({ photos: FIRST, nextPage: 2 });
    await loading;

    expect(seen.map((state) => state.loading)).toEqual([false, true, false]);
  });

  it("ignores loadMore while a page is under way", async () => {
    const { client, feed } = setUp();
    const answer = client.holdPhotos();

    const first = feed.loadMore();
    const second = feed.loadMore();
    answer({ photos: FIRST, nextPage: 2 });
    await Promise.all([first, second]);

    expect(feed.state.photos).toEqual(FIRST);
    expect(client.photoQueries).toEqual([{ page: 1, source: WHOLE_LIBRARY }]);
  });

  it("ignores loadMore after the last page", async () => {
    const { client, feed } = setUp();
    client.photoAnswers.push({ photos: FIRST, nextPage: null });
    await feed.loadMore();

    await feed.loadMore();

    expect(feed.state.done).toBe(true);
    expect(client.photoQueries).toEqual([{ page: 1, source: WHOLE_LIBRARY }]);
  });

  it("fails with the problem Immich met, reports it, keeps what it has, and ignores loadMore", async () => {
    const { client, feed, reported } = setUp();
    client.photoAnswers.push({ photos: FIRST, nextPage: 2 }, new ImmichUnavailableError("offline"));
    await feed.loadMore();

    await feed.loadMore();
    await feed.loadMore();

    expect(feed.state).toEqual({
      photos: FIRST,
      hiddenTakenAt: [],
      loading: false,
      done: false,
      failure: "offline",
    });
    expect(client.photoQueries).toEqual([
      { page: 1, source: WHOLE_LIBRARY },
      { page: 2, source: WHOLE_LIBRARY },
    ]);
    expect(reported).toEqual(["offline"]);
  });

  it("asks for the failed page again on retry", async () => {
    const { client, feed } = setUp();
    client.photoAnswers.push(new ImmichUnavailableError("unreachable"));
    client.photoAnswers.push({ photos: FIRST, nextPage: null });
    await feed.loadMore();

    await feed.retry();

    expect(client.photoQueries).toEqual([
      { page: 1, source: WHOLE_LIBRARY },
      { page: 1, source: WHOLE_LIBRARY },
    ]);
    expect(feed.state).toEqual({
      photos: FIRST,
      hiddenTakenAt: [],
      loading: false,
      done: true,
      failure: null,
    });
  });

  it("fails as unexpected and rethrows an answer that does not match Immich's API", async () => {
    const { client, feed, reported } = setUp();
    const mismatch = new Error('POST api/search/metadata answered with "assets" that is not ...');
    client.photoAnswers.push(mismatch);

    await expect(feed.loadMore()).rejects.toBe(mismatch);
    expect(feed.state.failure).toBe("unexpected");
    expect(reported).toEqual([]);
  });
});
