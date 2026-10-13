import { describe, expect, it } from "vitest";
import { HttpTvClient } from "./http-tv-client";
import { ServerLibraryUnavailableError } from "./server-library-client";
import { TvRefusedError } from "./tv-client";

const APP_URL = "https://glissando.example/";
const SECRET = "r7Rk2vN8xT4mWp1Lc9Hb3A";

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
  return { client: new HttpTvClient({ appUrl: APP_URL, fetch }), seen };
}

const refusing = (status: number, error: string) => () =>
  Response.json({ error, detail: "x" }, { status });

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => new Error("expected the request to fail"),
    (error: unknown) => error,
  );
}

describe("HttpTvClient (tv_remote/HTTP_API.md, Private)", () => {
  it("claims a code with a JSON POST and answers the remote's secret", async () => {
    const { client, seen } = answering(() => Response.json({ remoteSecret: SECRET }));

    expect(await client.claim("KXQM")).toBe(SECRET);
    expect(seen).toEqual([
      {
        method: "POST",
        url: "https://glissando.example/api/library/tv/claim",
        contentType: "application/json",
        body: JSON.stringify({ code: "KXQM" }),
      },
    ]);
  });

  it("refuses a claim answer whose secret is no secret, naming the field", async () => {
    const { client } = answering(() => Response.json({ remoteSecret: "a/b" }));

    expect(await rejection(client.claim("KXQM"))).toMatchObject({
      message: expect.stringContaining('"remoteSecret"') as unknown,
    });
  });

  it("shows a slideshow with a JSON POST under the secret", async () => {
    const { client, seen } = answering(() => new Response(null, { status: 204 }));

    await client.show(SECRET, "a b");

    expect(seen).toEqual([
      {
        method: "POST",
        url: `https://glissando.example/api/library/tv/${SECRET}/show`,
        contentType: "application/json",
        body: JSON.stringify({ slideshowId: "a b" }),
      },
    ]);
  });

  it("disconnects with the remote's disconnect command", async () => {
    const { client, seen } = answering(() => new Response(null, { status: 204 }));

    await client.disconnect(SECRET);

    expect(seen).toEqual([
      {
        method: "POST",
        url: `https://glissando.example/api/tv/remote/${SECRET}/command`,
        contentType: "application/json",
        body: JSON.stringify({ type: "disconnect" }),
      },
    ]);
  });

  it.each([
    { status: 404, error: "noSuchTv" },
    { status: 409, error: "tvAway" },
  ])("counts a disconnect answered $status $error as done", async ({ status, error }) => {
    const { client, seen } = answering(refusing(status, error));

    await client.disconnect(SECRET);

    expect(seen).toHaveLength(1);
  });

  it.each([
    { call: "claim", status: 404, error: "noSuchCode" },
    { call: "show", status: 404, error: "noSuchTv" },
    { call: "show", status: 404, error: "notFound" },
    { call: "show", status: 409, error: "boundToLink" },
  ] as const)("rejects $call answered $status $error as that refusal", async (refused) => {
    const { client } = answering(refusing(refused.status, refused.error));
    const call = refused.call === "claim" ? client.claim("KXQM") : client.show(SECRET, "s");

    const error = await rejection(call);

    expect(error).toBeInstanceOf(TvRefusedError);
    expect(error).toMatchObject({ refusal: refused.error });
  });

  it("fails loud on a refusal the app does not act on, naming it", async () => {
    const { client } = answering(refusing(400, "invalidCode"));

    const error = await rejection(client.claim("KXQM"));

    expect(error).not.toBeInstanceOf(TvRefusedError);
    expect(error).toMatchObject({ message: expect.stringContaining("400 invalidCode") as unknown });
  });

  it.each([
    { what: "a 502", fetch: () => Promise.resolve(new Response("", { status: 502 })) },
    { what: "a network failure", fetch: () => Promise.reject(new TypeError("Failed to fetch")) },
  ])("rejects $what as the server not answering", async ({ fetch }) => {
    const client = new HttpTvClient({ appUrl: APP_URL, fetch });

    expect(await rejection(client.claim("KXQM"))).toBeInstanceOf(ServerLibraryUnavailableError);
  });
});
