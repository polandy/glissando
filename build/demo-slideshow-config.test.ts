import { describe, expect, it } from "vitest";
import {
  resolveDemoSlideshowConfig,
  type DemoSlideshowConfigSources,
} from "./demo-slideshow-config.ts";

function sources(overrides: Partial<DemoSlideshowConfigSources> = {}): DemoSlideshowConfigSources {
  return { env: {}, ...overrides };
}

describe("resolveDemoSlideshowConfig", () => {
  it("is off the public install and points at the published demo by default", () => {
    expect(resolveDemoSlideshowConfig(sources())).toEqual({
      publicInstall: false,
      url: "https://polandy.github.io/glissando-assets/demo/glissando-demo.glissando",
    });
  });

  it('turns on only where GLISSANDO_PUBLIC_INSTALL is exactly "true"', () => {
    expect(
      resolveDemoSlideshowConfig(sources({ env: { GLISSANDO_PUBLIC_INSTALL: "true" } }))
        .publicInstall,
    ).toBe(true);
  });

  it("refuses an unrecognised GLISSANDO_PUBLIC_INSTALL value, naming the remedy", () => {
    expect(() =>
      resolveDemoSlideshowConfig(sources({ env: { GLISSANDO_PUBLIC_INSTALL: "yes" } })),
    ).toThrow(/GLISSANDO_PUBLIC_INSTALL is "yes"; set it to "true", or leave it unset\./);
  });

  it("takes the demo's URL from the environment, e.g. for a LAN preview", () => {
    const url = "http://192.168.1.110:4174/glissando-demo.glissando";
    expect(resolveDemoSlideshowConfig(sources({ env: { GLISSANDO_DEMO_URL: url } })).url).toBe(url);
  });

  it("refuses a GLISSANDO_DEMO_URL that is no absolute URL, naming the remedy", () => {
    expect(() =>
      resolveDemoSlideshowConfig(sources({ env: { GLISSANDO_DEMO_URL: "not a url" } })),
    ).toThrow(/GLISSANDO_DEMO_URL is "not a url"; set it to an absolute http\(s\) URL\./);
  });

  it("refuses a GLISSANDO_DEMO_URL with a scheme other than http or https", () => {
    expect(() =>
      resolveDemoSlideshowConfig(
        sources({ env: { GLISSANDO_DEMO_URL: "file:///demo.glissando" } }),
      ),
    ).toThrow(/set it to an absolute http\(s\) URL\./);
  });
});
