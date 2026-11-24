import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const PROJECT_ROOT = new URL("../", import.meta.url);
const ENGINE_RANGE = /^>=(\d+\.\d+\.\d+) <(\d+)$/;

function projectFile(path: string): string {
  return readFileSync(new URL(path, PROJECT_ROOT), "utf8");
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("missing value");
  return value;
}

function parseVersion(version: string): number[] {
  return version.split(".").map(Number);
}

function compareVersions(a: number[], b: number[]): number {
  return a.reduce((diff, part, index) => diff || part - (b[index] ?? 0), 0);
}

// Handles only the `>=X.Y.Z <M` form that engines.node uses.
function satisfies(version: string, range: string): boolean {
  const match = ENGINE_RANGE.exec(range);
  if (!match) throw new Error(`unsupported engines.node range: ${range}`);
  const parsed = parseVersion(version);
  return (
    compareVersions(parsed, parseVersion(required(match[1]))) >= 0 &&
    required(parsed[0]) < Number(match[2])
  );
}

function enginesNode(): string {
  return (JSON.parse(projectFile("package.json")) as { engines: { node: string } }).engines.node;
}

function dockerfileNodeVersions(dockerfile: string): string[] {
  return [...dockerfile.matchAll(/^FROM node:(\S+?)-/gm)].map((image) => required(image[1]));
}

it("rejects a version outside the range", () => {
  expect(satisfies("26.9.0", ">=26.9.0 <27")).toBe(true);
  expect(satisfies("26.10.1", ">=26.9.0 <27")).toBe(true);
  expect(satisfies("26.8.9", ">=26.9.0 <27")).toBe(false);
  expect(satisfies("27.0.0", ">=26.9.0 <27")).toBe(false);
});

it("names the same Node version in both stages of the server image", () => {
  const versions = dockerfileNodeVersions(projectFile("deploy/Dockerfile"));

  expect(versions).toHaveLength(2);
  expect(new Set(versions).size).toBe(1);
});

it("builds and runs the server image on a Node inside engines.node", () => {
  for (const version of dockerfileNodeVersions(projectFile("deploy/Dockerfile"))) {
    expect(satisfies(version, enginesNode())).toBe(true);
  }
});

it("flags a Dockerfile Node outside engines.node", () => {
  const outside = dockerfileNodeVersions("FROM node:27.0.0-alpine@sha256:x AS build");

  expect(satisfies(required(outside[0]), enginesNode())).toBe(false);
});

it("pins .node-version inside engines.node", () => {
  expect(satisfies(projectFile(".node-version").trim(), enginesNode())).toBe(true);
});
