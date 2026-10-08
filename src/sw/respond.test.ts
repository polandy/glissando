import { describe, expect, it } from "vitest";
import { respond, type RespondPorts } from "./respond";

const INDEX_URL = "https://example.org/app/index.html";

function ports(cached: Record<string, string>) {
  const fetched: string[] = [];
  const respondPorts: RespondPorts<Pick<Request, "url" | "mode">> = {
    indexUrl: INDEX_URL,
    match: (url) => Promise.resolve(url in cached ? new Response(cached[url]) : undefined),
    fetch: (request) => {
      fetched.push(request.url);
      return Promise.resolve(new Response("network"));
    },
  };
  return { respondPorts, fetched };
}

function request(url: string, mode: RequestMode): Pick<Request, "url" | "mode"> {
  return { url, mode };
}

describe("respond", () => {
  it("answers a navigation with the cached index.html, whatever its path", async () => {
    const { respondPorts, fetched } = ports({ [INDEX_URL]: "app" });
    const response = await respond(request("https://example.org/app/", "navigate"), respondPorts);
    expect(await response.text()).toBe("app");
    expect(fetched).toEqual([]);
  });

  it("answers a cached file from the cache", async () => {
    const url = "https://example.org/app/assets/index-1.js";
    const { respondPorts, fetched } = ports({ [url]: "code" });
    const response = await respond(request(url, "cors"), respondPorts);
    expect(await response.text()).toBe("code");
    expect(fetched).toEqual([]);
  });

  it("goes to the network for what is not cached", async () => {
    const url = "https://example.org/elsewhere.js";
    const { respondPorts, fetched } = ports({ [INDEX_URL]: "app" });
    const response = await respond(request(url, "cors"), respondPorts);
    expect(await response.text()).toBe("network");
    expect(fetched).toEqual([url]);
  });

  it("goes to the network for a navigation before index.html is cached", async () => {
    const url = "https://example.org/app/";
    const { respondPorts, fetched } = ports({});
    await respond(request(url, "navigate"), respondPorts);
    expect(fetched).toEqual([url]);
  });
});
