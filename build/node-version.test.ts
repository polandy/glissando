import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const PROJECT_ROOT = new URL("../", import.meta.url);

function projectFile(path: string): string {
  return readFileSync(new URL(path, PROJECT_ROOT), "utf8");
}

const NODE_VERSION = projectFile(".node-version").trim();

it("names the Node of .node-version as package.json's engine", () => {
  const engines = (JSON.parse(projectFile("package.json")) as { engines: { node: string } })
    .engines;

  expect(engines.node).toBe(NODE_VERSION);
});

it("builds and runs the server image on the Node of .node-version", () => {
  const nodeImages = [...projectFile("deploy/Dockerfile").matchAll(/^FROM node:(\S+?)-/gm)];

  expect(nodeImages.map((image) => image[1])).toEqual([NODE_VERSION, NODE_VERSION]);
});
