import { describe, expect, it } from "vitest";
import { HttpServerLibraryClient } from "./http-server-library-client";
import { ServerLibraryNotFoundError, ServerLibraryUnavailableError } from "./server-library-client";

const APP_URL = "https://glissando.example/";
const LINK = { token: "q7Rk2vN8xT4mWp1Lc9Hb3A", createdAt: "2026-10-11T09:30:00.000Z" };

interface SeenRequest {
  readonly method: string;
  readonly url: string;
  readonly contentType: string | null;
  readonly body: string;
}

/** Answers every request with `answer` and records what the client sent. */
function answering(answer: () => Response) {
  const seen: SeenRequest[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    seen.push({
      method: request.method,
      url: request.url,
      contentType: request.headers.get("content-type"),
      body: await request.text(),
    });
    return answer();
  };
  return { client: new HttpServerLibraryClient({ appUrl: APP_URL, fetch }), seen };
}

const notFound = (error: string) => () => Response.json({ error, detail: "x" }, { status: 404 });

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => new Error("expected the request to fail"),
    (error: unknown) => error,
  );
}

describe("HttpServerLibraryClient's share link (SHARE_LINK.md, Private)", () => {
  it("reads a slideshow's link from its share field", async () => {
    const { client, seen } = answering(() =>
      Response.json({ id: "a b", revision: 2, document: {}, share: LINK }),
    );

    expect(await client.shareOf("a b")).toEqual(LINK);
    expect(seen.map(({ method, url }) => `${method} ${url}`)).toEqual([
      "GET https://glissando.example/api/library/slideshows/a%20b",
    ]);
  });

  it("reads share null as not shared", async () => {
    const { client } = answering(() => Response.json({ id: "s", share: null }));

    expect(await client.shareOf("s")).toBeNull();
  });

  it.each([
    { what: "no share field", share: undefined },
    { what: "a token that is no base64url", share: { ...LINK, token: "a/b?c" } },
    { what: "a token of the wrong length", share: { ...LINK, token: "abc" } },
    { what: "no creation date", share: { token: LINK.token } },
    { what: "a creation date that is none", share: { ...LINK, createdAt: "yesterday" } },
  ])("refuses an answer with $what, naming the field", async ({ share }) => {
    const { client } = answering(() => Response.json({ id: "s", share }));

    expect(await rejection(client.shareOf("s"))).toMatchObject({
      message: expect.stringMatching(/"(share|token|createdAt)"/) as unknown,
    });
  });

  it.each([201, 200])("creates the link with a JSON POST, answered %i", async (status) => {
    const { client, seen } = answering(() => Response.json(LINK, { status }));

    expect(await client.share("s")).toEqual(LINK);
    expect(seen).toEqual([
      {
        method: "POST",
        url: "https://glissando.example/api/library/slideshows/s/share",
        contentType: "application/json",
        body: "{}",
      },
    ]);
  });

  it("turns the link off with a DELETE", async () => {
    const { client, seen } = answering(() => new Response(null, { status: 204 }));

    await client.unshare("s");

    expect(seen.map(({ method, url }) => `${method} ${url}`)).toEqual([
      "DELETE https://glissando.example/api/library/slideshows/s/share",
    ]);
  });

  it("takes a link that is already off as turned off", async () => {
    const { client, seen } = answering(notFound("notShared"));

    await client.unshare("s");

    expect(seen).toHaveLength(1);
  });

  it("rejects turning off the link of a slideshow the server does not have", async () => {
    const { client } = answering(notFound("notFound"));

    expect(await rejection(client.unshare("s"))).toBeInstanceOf(ServerLibraryNotFoundError);
  });

  it.each([{ call: "shareOf" as const }, { call: "share" as const }, { call: "unshare" as const }])(
    "rejects $call with ServerLibraryUnavailableError behind a 502",
    async ({ call }) => {
      const { client } = answering(() => new Response("Bad Gateway", { status: 502 }));

      expect(await rejection(client[call]("s"))).toBeInstanceOf(ServerLibraryUnavailableError);
    },
  );
});
