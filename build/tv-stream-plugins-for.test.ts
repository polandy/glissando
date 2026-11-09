import { describe, expect, it } from "vitest";
import { E2E_TV_STREAM_ENV, tvStreamPluginsFor } from "../e2e/support/tv-stream-plugin.ts";

describe("tvStreamPluginsFor", () => {
  it("registers nothing for a plain preview", () => {
    expect(tvStreamPluginsFor({})).toEqual([]);
  });

  it("registers the stream plugin when the Playwright web server asks for it", () => {
    const plugins = tvStreamPluginsFor({ [E2E_TV_STREAM_ENV]: "1" });
    expect(plugins).toHaveLength(1);
  });
});
