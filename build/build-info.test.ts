import { describe, expect, it } from "vitest";
import { resolveBuildInfo, type BuildInfoSources } from "./build-info.ts";

const FULL_COMMIT = "87dd486c0ffee0123456789abcdef0123456789a";
const COMMIT_DATE = "2026-10-12T18:30:00+02:00";

function sources(overrides: Partial<BuildInfoSources> = {}): BuildInfoSources {
  return {
    packageVersion: "0.0.2",
    env: {},
    git: (args) => (args.includes("rev-parse") ? FULL_COMMIT : COMMIT_DATE),
    ...overrides,
  };
}

describe("resolveBuildInfo", () => {
  it("takes the commit and its date from git, abbreviated and in UTC", () => {
    expect(resolveBuildInfo(sources())).toEqual({
      version: "0.0.2",
      commit: "87dd486",
      commitDate: "2026-10-12T16:30:00.000Z",
    });
  });

  it("prefers the commit named in the environment, as a Docker build without .git passes it", () => {
    const info = resolveBuildInfo(
      sources({
        env: { GLISSANDO_COMMIT: "abcdef1234567", GLISSANDO_COMMIT_DATE: "2026-01-02T03:04:05Z" },
        git: () => {
          throw new Error("git must not be asked");
        },
      }),
    );
    expect(info).toEqual({
      version: "0.0.2",
      commit: "abcdef1",
      commitDate: "2026-01-02T03:04:05.000Z",
    });
  });

  it.each([
    { rule: "only the commit is set", env: { GLISSANDO_COMMIT: FULL_COMMIT } },
    { rule: "only the date is set", env: { GLISSANDO_COMMIT_DATE: COMMIT_DATE } },
  ])("refuses a half-set environment: $rule", ({ env }) => {
    expect(() => resolveBuildInfo(sources({ env }))).toThrow(
      /GLISSANDO_COMMIT and GLISSANDO_COMMIT_DATE/,
    );
  });

  it("refuses to build without git and without the environment, naming the remedy", () => {
    expect(() => resolveBuildInfo(sources({ git: () => null }))).toThrow(
      /--build-arg GLISSANDO_COMMIT/,
    );
  });

  it.each([
    {
      rule: "a commit that is no hash",
      env: { GLISSANDO_COMMIT: "main", GLISSANDO_COMMIT_DATE: COMMIT_DATE },
    },
    {
      rule: "a date that is no date",
      env: { GLISSANDO_COMMIT: FULL_COMMIT, GLISSANDO_COMMIT_DATE: "yesterday" },
    },
  ])("refuses $rule", ({ env }) => {
    expect(() => resolveBuildInfo(sources({ env }))).toThrow(/GLISSANDO_COMMIT/);
  });
});
