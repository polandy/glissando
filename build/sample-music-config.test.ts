import { describe, expect, it } from "vitest";
import { resolveSampleMusicConfig, type SampleMusicConfigSources } from "./sample-music-config.ts";

const DEFAULT_URL = "https://polandy.github.io/glissando-assets/music/";

function sources(overrides: Partial<SampleMusicConfigSources> = {}): SampleMusicConfigSources {
  return { env: {}, ...overrides };
}

describe("resolveSampleMusicConfig", () => {
  it("is enabled and points at the published base URL by default", () => {
    expect(resolveSampleMusicConfig(sources())).toEqual({ enabled: true, baseUrl: DEFAULT_URL });
  });

  it('turns off only where GLISSANDO_SAMPLE_MUSIC is exactly "off"', () => {
    expect(
      resolveSampleMusicConfig(sources({ env: { GLISSANDO_SAMPLE_MUSIC: "off" } })).enabled,
    ).toBe(false);
  });

  it("refuses an unrecognised GLISSANDO_SAMPLE_MUSIC value, naming the remedy", () => {
    expect(() =>
      resolveSampleMusicConfig(sources({ env: { GLISSANDO_SAMPLE_MUSIC: "no" } })),
    ).toThrow(/GLISSANDO_SAMPLE_MUSIC is "no"; set it to "off", or leave it unset\./);
  });

  it("takes the base URL from the environment, e.g. for a LAN preview", () => {
    const url = "http://192.168.1.110:4174/sample-music/";
    expect(
      resolveSampleMusicConfig(sources({ env: { GLISSANDO_SAMPLE_MUSIC_URL: url } })).baseUrl,
    ).toBe(url);
  });

  it("refuses a GLISSANDO_SAMPLE_MUSIC_URL that is no absolute URL, naming the remedy", () => {
    expect(() =>
      resolveSampleMusicConfig(sources({ env: { GLISSANDO_SAMPLE_MUSIC_URL: "not a url" } })),
    ).toThrow(
      /GLISSANDO_SAMPLE_MUSIC_URL is "not a url"; set it to an absolute http\(s\) URL ending in "\/"\./,
    );
  });

  it("refuses a GLISSANDO_SAMPLE_MUSIC_URL with a scheme other than http or https", () => {
    expect(() =>
      resolveSampleMusicConfig(sources({ env: { GLISSANDO_SAMPLE_MUSIC_URL: "file:///music/" } })),
    ).toThrow(/set it to an absolute http\(s\) URL ending in "\/"\./);
  });

  it("refuses a GLISSANDO_SAMPLE_MUSIC_URL that does not end with a slash", () => {
    expect(() =>
      resolveSampleMusicConfig(
        sources({ env: { GLISSANDO_SAMPLE_MUSIC_URL: "https://example.com/music" } }),
      ),
    ).toThrow(/set it to an absolute http\(s\) URL ending in "\/"\./);
  });
});
