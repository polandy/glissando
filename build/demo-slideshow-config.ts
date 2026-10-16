import { loadEnv, type Plugin } from "vite";
import type { DemoSlideshowConfig } from "../src/app/start/demo-slideshow-config.ts";

/** The constant the app reads its config from; declared in demo-slideshow-config-constant.d.ts. */
const DEMO_SLIDESHOW_CONSTANT = "__GLISSANDO_DEMO_SLIDESHOW__";
const PUBLIC_INSTALL_VARIABLE = "GLISSANDO_PUBLIC_INSTALL";
const URL_VARIABLE = "GLISSANDO_DEMO_URL";
const ENV_PREFIX = "GLISSANDO_";
/** The demo file published alongside the mockup, next to the other public assets. */
const DEFAULT_URL = "https://polandy.github.io/glissando-assets/demo/glissando-demo.glissando";

export interface DemoSlideshowConfigSources {
  readonly env: Readonly<Record<string, string | undefined>>;
}

/**
 * The flag is set only by the `pages` job in `.github/workflows/release-please.yml`; a
 * self-hosted build (`deploy/Dockerfile`) never sets it. The URL defaults to the published demo
 * but can be overridden, e.g. to a LAN address for a preview build.
 */
export function resolveDemoSlideshowConfig(
  sources: DemoSlideshowConfigSources,
): DemoSlideshowConfig {
  const publicInstallValue = sources.env[PUBLIC_INSTALL_VARIABLE];
  if (publicInstallValue !== undefined && publicInstallValue !== "true") {
    throw new Error(
      `${PUBLIC_INSTALL_VARIABLE} is "${publicInstallValue}"; set it to "true", or leave it unset.`,
    );
  }
  const url = sources.env[URL_VARIABLE] ?? DEFAULT_URL;
  if (!isAbsoluteUrl(url)) {
    throw new Error(`${URL_VARIABLE} is "${url}"; set it to an absolute URL.`);
  }
  return { publicInstall: publicInstallValue === "true", url };
}

function isAbsoluteUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/** Makes this build's DemoSlideshowConfig available to the app as a compile-time constant. */
export function demoSlideshowConfigPlugin(): Plugin {
  return {
    name: "glissando:demo-slideshow-config",
    config: (_config, { mode }) => {
      const config = resolveDemoSlideshowConfig({ env: loadEnv(mode, ".", ENV_PREFIX) });
      return { define: { [DEMO_SLIDESHOW_CONSTANT]: JSON.stringify(config) } };
    },
  };
}
