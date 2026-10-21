import { loadEnv, type Plugin } from "vite";
import type { SampleMusicConfig } from "../src/sample-music/sample-music-config.ts";

/** The constant the app reads its config from; declared in sample-music-config-constant.d.ts. */
const SAMPLE_MUSIC_CONSTANT = "__GLISSANDO_SAMPLE_MUSIC__";
const ENABLED_VARIABLE = "GLISSANDO_SAMPLE_MUSIC";
const URL_VARIABLE = "GLISSANDO_SAMPLE_MUSIC_URL";
const ENV_PREFIX = "GLISSANDO_";
const OFF_VALUE = "off";
/** Where the tracks and covers are published alongside the mockup (ADR-0042). */
const DEFAULT_URL = "https://polandy.github.io/glissando-assets/music/";

export interface SampleMusicConfigSources {
  readonly env: Readonly<Record<string, string | undefined>>;
}

/**
 * Sample music is on in every build, the self-hosted Docker image included;
 * GLISSANDO_SAMPLE_MUSIC=off builds without it. The URL defaults to the published assets but can
 * be overridden, e.g. to a LAN address for a preview build or a mirror (ADR-0042).
 */
export function resolveSampleMusicConfig(sources: SampleMusicConfigSources): SampleMusicConfig {
  const enabledValue = sources.env[ENABLED_VARIABLE];
  if (enabledValue !== undefined && enabledValue !== OFF_VALUE) {
    throw new Error(
      `${ENABLED_VARIABLE} is "${enabledValue}"; set it to "${OFF_VALUE}", or leave it unset.`,
    );
  }
  const baseUrl = sources.env[URL_VARIABLE] ?? DEFAULT_URL;
  if (!isHttpUrlEndingInSlash(baseUrl)) {
    throw new Error(
      `${URL_VARIABLE} is "${baseUrl}"; set it to an absolute http(s) URL ending in "/".`,
    );
  }
  return { enabled: enabledValue !== OFF_VALUE, baseUrl };
}

const HTTP_PROTOCOLS: readonly string[] = ["http:", "https:"];

function isHttpUrlEndingInSlash(value: string): boolean {
  return HTTP_PROTOCOLS.includes(URL.parse(value)?.protocol ?? "") && value.endsWith("/");
}

/** Makes this build's SampleMusicConfig available to the app as a compile-time constant. */
export function sampleMusicConfigPlugin(): Plugin {
  return {
    name: "glissando:sample-music-config",
    config: (_config, { mode }) => {
      const config = resolveSampleMusicConfig({ env: loadEnv(mode, ".", ENV_PREFIX) });
      return { define: { [SAMPLE_MUSIC_CONSTANT]: JSON.stringify(config) } };
    },
  };
}
