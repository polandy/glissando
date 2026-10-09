import { describe, expect, it } from "vitest";
import { ImmichUnavailableError, type ImmichUnavailableKind } from "./immich-client";
import { PhotoFeed, type PhotoFeedState } from "./photo-feed";
import { FakeImmichClient, photo } from "./testing/fake-immich-client";

const FIRST = [photo("a"), photo("b")];
const SECOND = [photo("c")];

function setUp(albumId?: string) {
  const client = new FakeImmichClient();
  const reported: ImmichUnavailableKind[] = [];
  const reportUnavailable = (kind: ImmichUnavailableKind) => reported.push(kind);
  const feed = new PhotoFeed(
    albumId === undefined ? { client, reportUnavailable } : { client, reportUnavailable, albumId },
  );
  const seen: PhotoFeedState[] = [];
  feed.subscribe((state) => seen.push(state));
  return { client, feed, seen, reported };
}

describe("PhotoFeed", () => {
  it("starts empty, not loading, and tells a subscriber at once", () => {
    const { feed, seen } = setUp();

    const empty = { photos: [], loading: false, done: false, failure: null };
    expect(feed.state).toEqual(empty);
    expect(seen).toEqual([empty]);
  });

  it("loads the library page by page, appending each", async () => {
    const { client, feed } = setUp();
    client.photoAnswers.push({ photos: FIRST, nextPage: 2 }, { photos: SECOND, nextPage: null });

    await feed.loadMore();
    await feed.loadMore();

    expect(client.photoQueries).toEqual([{ page: 1 }, { page: 2 }]);
    expect(feed.state).toEqual({
      photos: [...FIRST, ...SECOND],
      loading: false,
      done: true,
      failure: null,
    });
  });

  it("loads one album's photos", async () => {
    const { client, feed } = setUp("album-1");
    client.photoAnswers.push({ photos: FIRST, nextPage: null });

    await feed.loadMore();

    expect(client.photoQueries).toEqual([{ page: 1, albumId: "album-1" }]);
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
    expect(client.photoQueries).toEqual([{ page: 1 }]);
  });

  it("ignores loadMore after the last page", async () => {
    const { client, feed } = setUp();
    client.photoAnswers.push({ photos: FIRST, nextPage: null });
    await feed.loadMore();

    await feed.loadMore();

    expect(feed.state.done).toBe(true);
    expect(client.photoQueries).toEqual([{ page: 1 }]);
  });

  it("fails with the problem Immich met, reports it, keeps what it has, and ignores loadMore", async () => {
    const { client, feed, reported } = setUp();
    client.photoAnswers.push({ photos: FIRST, nextPage: 2 }, new ImmichUnavailableError("offline"));
    await feed.loadMore();

    await feed.loadMore();
    await feed.loadMore();

    expect(feed.state).toEqual({ photos: FIRST, loading: false, done: false, failure: "offline" });
    expect(client.photoQueries).toEqual([{ page: 1 }, { page: 2 }]);
    expect(reported).toEqual(["offline"]);
  });

  it("asks for the failed page again on retry", async () => {
    const { client, feed } = setUp();
    client.photoAnswers.push(new ImmichUnavailableError("unreachable"));
    client.photoAnswers.push({ photos: FIRST, nextPage: null });
    await feed.loadMore();

    await feed.retry();

    expect(client.photoQueries).toEqual([{ page: 1 }, { page: 1 }]);
    expect(feed.state).toEqual({ photos: FIRST, loading: false, done: true, failure: null });
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
