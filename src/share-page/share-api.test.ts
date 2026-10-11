import { describe, expect, it } from "vitest";
import {
  createShareApi,
  ShareMediumMissingError,
  ShareGoneError,
  ShareUnreachableError,
  type FetchPort,
  type ShareApi,
} from "./share-api";

const TOKEN = "AbCdEfGhIjKlMnOpQrStUv";

const ANSWER = {
  revision: 3,
  slideshow: {
    title: "Lake Garda",
    createdAt: "2026-07-02T10:00:00Z",
    secondsPerPicture: 4,
    pictures: [{ capturedAt: "2026-07-01T00:00:00Z", width: 1600, height: 900 }],
    songs: [],
  },
  beats: [],
};

/** Answers each URL from `routes`; any other URL is a test failure. */
function fakeFetch(routes: Record<string, () => Response | Promise<Response>>) {
  const asked: string[] = [];
  const fetch: FetchPort = (url) => {
    asked.push(url);
    const route = routes[url];
    if (route === undefined) return Promise.reject(new Error(`unexpected fetch of ${url}`));
    return Promise.resolve(route());
  };
  return { fetch, asked };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const offline = () => Promise.reject(new TypeError("Failed to fetch"));

/** A response whose connection drops while its body is read, as `fetch` reports it. */
function dropped(status: number): Response {
  const body = new ReadableStream({
    start(controller) {
      controller.error(new TypeError("network error"));
    },
  });
  return new Response(body, { status });
}

describe("the share API as the page uses it", () => {
  it("reads the slideshow from /api/share/{token}", async () => {
    const { fetch, asked } = fakeFetch({ [`/api/share/${TOKEN}`]: () => json(200, ANSWER) });

    const answer = await createShareApi(fetch, TOKEN).answer();

    expect(answer.revision).toBe(3);
    expect(answer.slideshow.title).toBe("Lake Garda");
    expect(asked).toEqual([`/api/share/${TOKEN}`]);
  });

  it.each([
    { what: "notShared", response: () => json(404, { error: "notShared", detail: "" }) },
    { what: "a 404 without a code", response: () => new Response("Not Found", { status: 404 }) },
  ])("reports a link turned off on $what", async ({ response }) => {
    const { fetch } = fakeFetch({ [`/api/share/${TOKEN}`]: response });

    await expect(createShareApi(fetch, TOKEN).answer()).rejects.toThrow(ShareGoneError);
  });

  it.each([
    { what: "a 502 from the proxy", response: () => new Response("", { status: 502 }) },
    { what: "a 503", response: () => json(503, { error: "unavailable", detail: "" }) },
    { what: "no network", response: offline },
  ])("reports the server unreachable on $what", async ({ response }) => {
    const { fetch } = fakeFetch({ [`/api/share/${TOKEN}`]: response });

    await expect(createShareApi(fetch, TOKEN).answer()).rejects.toThrow(ShareUnreachableError);
  });

  it.each([
    { what: "the document", url: `/api/share/${TOKEN}`, fetchIt: (api: ShareApi) => api.answer() },
    {
      what: "a picture",
      url: `/api/share/${TOKEN}/3/pictures/0`,
      fetchIt: (api: ShareApi) => api.picture(3, 0),
    },
    { what: "a song", url: `/api/share/${TOKEN}/songs/0`, fetchIt: (api: ShareApi) => api.song(0) },
  ])(
    "reports the server unreachable when the connection drops while $what downloads",
    async ({ url, fetchIt }) => {
      const api = createShareApi(fakeFetch({ [url]: () => dropped(200) }).fetch, TOKEN);

      await expect(fetchIt(api)).rejects.toThrow(ShareUnreachableError);
    },
  );

  it("reports the server unreachable, not the link gone, when a 404's body drops", async () => {
    const api = createShareApi(
      fakeFetch({ [`/api/share/${TOKEN}`]: () => dropped(404) }).fetch,
      TOKEN,
    );

    await expect(api.answer()).rejects.toThrow(ShareUnreachableError);
  });

  it("fails loud on an answer that is no share answer, e.g. a sign-in page", async () => {
    const { fetch } = fakeFetch({
      [`/api/share/${TOKEN}`]: () => new Response("<!doctype html>", { status: 200 }),
    });

    const failure = createShareApi(fetch, TOKEN).answer();

    await expect(failure).rejects.toThrow();
    await expect(failure).rejects.not.toThrow(ShareUnreachableError);
  });

  it("fetches picture n of the revision and song n by their position", async () => {
    const picture = new Blob(["jpeg"], { type: "image/jpeg" });
    const song = new Blob(["mp3"], { type: "audio/mpeg" });
    const { fetch } = fakeFetch({
      [`/api/share/${TOKEN}/3/pictures/2`]: () => new Response(picture),
      [`/api/share/${TOKEN}/songs/1`]: () => new Response(song),
    });
    const api = createShareApi(fetch, TOKEN);

    expect(await (await api.picture(3, 2)).text()).toBe("jpeg");
    expect(await (await api.song(1)).text()).toBe("mp3");
  });

  it.each([
    { what: "a picture", code: "noSuchPicture", url: `/api/share/${TOKEN}/3/pictures/0` },
    { what: "a song", code: "noSuchSong", url: `/api/share/${TOKEN}/songs/0` },
  ])("tells $what the server no longer has apart from a link turned off", async ({ code, url }) => {
    const missing = createShareApi(
      fakeFetch({ [url]: () => json(404, { error: code }) }).fetch,
      TOKEN,
    );
    const off = createShareApi(
      fakeFetch({ [url]: () => json(404, { error: "notShared" }) }).fetch,
      TOKEN,
    );
    const fetchIt = (api: typeof missing) =>
      code === "noSuchSong" ? api.song(0) : api.picture(3, 0);

    await expect(fetchIt(missing)).rejects.toThrow(ShareMediumMissingError);
    await expect(fetchIt(off)).rejects.toThrow(ShareGoneError);
  });

  it("puts the token into the path escaped", async () => {
    const { fetch, asked } = fakeFetch({ "/api/share/a%2Fb": () => json(200, ANSWER) });

    await createShareApi(fetch, "a/b").answer();

    expect(asked).toEqual(["/api/share/a%2Fb"]);
  });
});
