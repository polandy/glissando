import { describe, expect, it } from "vitest";
import { InvalidLibraryConfigError, parseLibraryConfig } from "./config";

const VALID = { GLISSANDO_DATA_DIR: "/data", GLISSANDO_LIBRARY_PORT: "8081" };

describe("parseLibraryConfig", () => {
  it("reads the data directory and the loopback port", () => {
    expect(parseLibraryConfig(VALID)).toEqual({ dataDir: "/data", port: 8081 });
  });

  it("ignores settings that are not Glissando's or Immich's", () => {
    expect(parseLibraryConfig({ ...VALID, PATH: "/usr/bin", HOME: "/" })).toEqual({
      dataDir: "/data",
      port: 8081,
    });
  });

  it.each([
    ["GLISSANDO_DATA_DIR", { GLISSANDO_LIBRARY_PORT: "8081" }],
    ["GLISSANDO_LIBRARY_PORT", { GLISSANDO_DATA_DIR: "/data" }],
  ])("refuses to start without %s, naming it", (name, env) => {
    expect(() => parseLibraryConfig(env)).toThrow(InvalidLibraryConfigError);
    expect(() => parseLibraryConfig(env)).toThrow(name);
  });

  it.each(["0", "65536", "80a", "8081.5", ""])("refuses the port %j", (port) => {
    expect(() => parseLibraryConfig({ ...VALID, GLISSANDO_LIBRARY_PORT: port })).toThrow(
      `GLISSANDO_LIBRARY_PORT=${JSON.stringify(port)}`,
    );
  });

  it("refuses a relative data directory", () => {
    expect(() => parseLibraryConfig({ ...VALID, GLISSANDO_DATA_DIR: "data" })).toThrow(
      'GLISSANDO_DATA_DIR="data"',
    );
  });

  it.each(["GLISSANDO_DATADIR", "IMMICH_API_KEY"])("refuses the unknown setting %s", (name) => {
    expect(() => parseLibraryConfig({ ...VALID, [name]: "x" })).toThrow(`unknown setting ${name}`);
  });
});
