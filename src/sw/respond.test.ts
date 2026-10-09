import { describe, expect, it } from "vitest";
import { answersRequest, respond, type CachePort, type RespondPorts } from "./respond";

const ORIGIN = "https://example.org";
const INDEX_URL = `${ORIGIN}/app/index.html`;
const HASHED_URL = `${ORIGIN}/app/assets/index-1.js`;

type TestRequest = Pick<Request, "url" | "mode">;

function cache(entries: Record<string, string>): CachePort {
  return {
    match: (url) => Promise.resolve(url in entries ? new Response(entries[url]) : undefined),
  };
}

/** `caches` in search order, the current version's first. */
function ports(...caches: CachePort[]) {
  const fetched: string[] = [];
  const respondPorts: RespondPorts<TestRequest> = {
    indexUrl: INDEX_URL,
    caches: () => Promise.resolve(caches),
    fetch: (request) => {
      fetched.push(request.url);
      return Promise.resolve(new Response("network"));
    },
  };
  return { respondPorts, fetched };
}

function request(url: string, mode: RequestMode): TestRequest {
  return { url, mode };
}

describe("respond", () => {
  it("answers a navigation with the cached index.html, whatever its path", async () => {
    const { respondPorts, fetched } = ports(cache({ [INDEX_URL]: "app" }));
    const response = await respond(request(`${ORIGIN}/app/`, "navigate"), respondPorts);
    expect(await response.text()).toBe("app");
    expect(fetched).toEqual([]);
  });

  it("answers a navigation to a cached file with that file, e.g. the licences from the settings", async () => {
    const licences = `${ORIGIN}/app/third-party-licenses.md`;
    const { respondPorts, fetched } = ports(
      cache({ [INDEX_URL]: "app", [licences]: "# Licenses" }),
    );
    const response = await respond(request(licences, "navigate"), respondPorts);
    expect(await response.text()).toBe("# Licenses");
    expect(fetched).toEqual([]);
  });

  it("answers a cached file from the cache", async () => {
    const { respondPorts, fetched } = ports(cache({ [HASHED_URL]: "code" }));
    const response = await respond(request(HASHED_URL, "cors"), respondPorts);
    expect(await response.text()).toBe("code");
    expect(fetched).toEqual([]);
  });

  it("answers from the current version when the previous one holds the same file", async () => {
    const current = cache({ [INDEX_URL]: "new version" });
    const previous = cache({ [INDEX_URL]: "old version" });
    const { respondPorts } = ports(current, previous);
    const response = await respond(request(`${ORIGIN}/app/`, "navigate"), respondPorts);
    expect(await response.text()).toBe("new version");
  });

  it("finds a file only the previous version has, for a tab still running it", async () => {
    const current = cache({ [INDEX_URL]: "new version" });
    const previous = cache({ [HASHED_URL]: "old code" });
    const { respondPorts, fetched } = ports(current, previous);
    const response = await respond(request(HASHED_URL, "cors"), respondPorts);
    expect(await response.text()).toBe("old code");
    expect(fetched).toEqual([]);
  });

  it("goes to the network for what is not cached", async () => {
    const url = `${ORIGIN}/app/elsewhere.js`;
    const { respondPorts, fetched } = ports(cache({ [INDEX_URL]: "app" }));
    const response = await respond(request(url, "cors"), respondPorts);
    expect(await response.text()).toBe("network");
    expect(fetched).toEqual([url]);
  });

  it("goes to the network for a navigation before index.html is cached", async () => {
    const url = `${ORIGIN}/app/`;
    const { respondPorts, fetched } = ports(cache({}));
    await respond(request(url, "navigate"), respondPorts);
    expect(fetched).toEqual([url]);
  });
});

describe("answersRequest", () => {
  const SCOPE = `${ORIGIN}/app/`;

  it.each([
    { what: "a GET of the app's origin", method: "GET", url: HASHED_URL, answers: true },
    {
      what: "a GET through the app's Immich route",
      method: "GET",
      url: `${ORIGIN}/app/immich/api/albums`,
      answers: false,
    },
    {
      what: "a navigation to the app's Immich route itself",
      method: "GET",
      url: `${ORIGIN}/app/immich/`,
      answers: false,
    },
    {
      what: "a GET of a file whose name merely starts with immich",
      method: "GET",
      url: `${ORIGIN}/app/immich-logo.svg`,
      answers: true,
    },
    {
      what: "a GET of an immich path outside the app",
      method: "GET",
      url: `${ORIGIN}/immich/api/albums`,
      answers: true,
    },
    { what: "a POST", method: "POST", url: HASHED_URL, answers: false },
    {
      what: "a request to another origin",
      method: "GET",
      url: "https://cdn.example.com/font.woff2",
      answers: false,
    },
  ])("answers $what: $answers", ({ method, url, answers }) => {
    expect(answersRequest({ method, url }, SCOPE)).toBe(answers);
  });
});
