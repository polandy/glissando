import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { loadEnv, type Plugin } from "vite";
import type { BuildInfo } from "../src/app/settings/build-info.ts";

/** The constant the app reads its BuildInfo from; declared in src/app/settings/build-info-constant.d.ts. */
const BUILD_INFO_CONSTANT = "__GLISSANDO_BUILD_INFO__";
const COMMIT_VARIABLE = "GLISSANDO_COMMIT";
const COMMIT_DATE_VARIABLE = "GLISSANDO_COMMIT_DATE";
const ENV_PREFIX = "GLISSANDO_";
const SHORT_COMMIT_LENGTH = 7;
const COMMIT_PATTERN = /^[0-9a-f]{7,40}$/;

export interface BuildInfoSources {
  readonly packageVersion: string;
  readonly env: Readonly<Record<string, string | undefined>>;
  /** Runs git with these arguments and returns its trimmed output; null where git cannot answer. */
  readonly git: (args: readonly string[]) => string | null;
}

/**
 * The commit comes from the environment where it is set (a Docker build has no .git), otherwise
 * from git; a build that can name neither fails rather than ship an unknown version.
 */
export function resolveBuildInfo(sources: BuildInfoSources): BuildInfo {
  const { commit, commitDate } = commitFrom(sources);
  if (!COMMIT_PATTERN.test(commit)) {
    throw new Error(`${COMMIT_VARIABLE} is "${commit}"; set it to the commit's hex hash.`);
  }
  const date = new Date(commitDate);
  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `${COMMIT_DATE_VARIABLE} is "${commitDate}"; set it to an ISO 8601 date (git log -1 --format=%cI).`,
    );
  }
  return {
    version: sources.packageVersion,
    commit: commit.slice(0, SHORT_COMMIT_LENGTH),
    commitDate: date.toISOString(),
  };
}

function commitFrom(sources: BuildInfoSources): { commit: string; commitDate: string } {
  const commit = sources.env[COMMIT_VARIABLE];
  const commitDate = sources.env[COMMIT_DATE_VARIABLE];
  if (commit !== undefined && commitDate !== undefined) {
    return { commit, commitDate };
  }
  if (commit !== undefined || commitDate !== undefined) {
    throw new Error(`Set both ${COMMIT_VARIABLE} and ${COMMIT_DATE_VARIABLE}, or neither.`);
  }
  const fromGit = {
    commit: sources.git(["rev-parse", "HEAD"]),
    commitDate: sources.git(["log", "-1", "--format=%cI"]),
  };
  if (fromGit.commit === null || fromGit.commitDate === null) {
    throw new Error(
      `Cannot tell which commit this build is: build from a git checkout, or pass ` +
        `--build-arg ${COMMIT_VARIABLE}=<hash> --build-arg ${COMMIT_DATE_VARIABLE}=<ISO date>.`,
    );
  }
  return { commit: fromGit.commit, commitDate: fromGit.commitDate };
}

function runGit(args: readonly string[]): string | null {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    // No git, or no repository here: the caller names the remedy.
    return null;
  }
}

function packageVersion(): string {
  const manifest: unknown = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  if (typeof manifest !== "object" || manifest === null || !("version" in manifest)) {
    throw new Error("package.json has no version");
  }
  return String(manifest.version);
}

/** Makes this build's BuildInfo available to the app as a compile-time constant. */
export function buildInfoPlugin(): Plugin {
  return {
    name: "glissando:build-info",
    config: (_config, { mode }) => {
      const info = resolveBuildInfo({
        packageVersion: packageVersion(),
        // The process environment, plus .env files: the prefix keeps the rest out.
        env: loadEnv(mode, ".", ENV_PREFIX),
        git: runGit,
      });
      return { define: { [BUILD_INFO_CONSTANT]: JSON.stringify(info) } };
    },
  };
}
