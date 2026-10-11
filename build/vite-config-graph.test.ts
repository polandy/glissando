import { createLogger, loadConfigFromFile, type Logger } from "vite";
import { afterEach, describe, expect, it, vi } from "vitest";

/** The opening of Vite's warning about a config graph the native config loader cannot load. */
const NATIVE_LOADER_WARNING = "unsupported by `configLoader: 'native'`";
/** Setting it switches Vite's check off, which would let this guard pass without looking. */
const IGNORE_WARNING_ENV = "VITE_CONFIG_NATIVE_IGNORE_WARNING";

/** A file path beside this test, without Node's own types, which the app's tsconfig leaves out. */
function besideThisTest(relative: string): string {
  return decodeURIComponent(new URL(relative, import.meta.url).pathname);
}

const GLISSANDO_CONFIG = besideThisTest("../vite.config.ts");
const EXTENSIONLESS_CONFIG = besideThisTest("./testing/extensionless-config/vite.config.ts");

async function loadCollectingWarnings(configFile: string) {
  const warnings: string[] = [];
  const logger: Logger = {
    ...createLogger("silent"),
    warn: (message) => warnings.push(message),
  };
  const loaded = await loadConfigFromFile(
    { command: "serve", mode: "test" },
    configFile,
    undefined,
    undefined,
    logger,
  );
  return { loaded, warnings };
}

describe("the Vite config's import graph (ADR-0026)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is checked by Vite, which warns about a config importing without a file extension", async () => {
    vi.stubEnv(IGNORE_WARNING_ENV, undefined);

    const { loaded, warnings } = await loadCollectingWarnings(EXTENSIONLESS_CONFIG);

    expect(loaded?.config.base).toBe("./");
    expect(warnings.join("\n")).toContain(NATIVE_LOADER_WARNING);
  });

  it("loads Glissando's config without the native config loader warning", async () => {
    vi.stubEnv(IGNORE_WARNING_ENV, undefined);

    const { loaded, warnings } = await loadCollectingWarnings(GLISSANDO_CONFIG);

    expect(loaded?.config.plugins?.length).toBeGreaterThan(0);
    expect(warnings.join("\n")).not.toContain(NATIVE_LOADER_WARNING);
  });
});
