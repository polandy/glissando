import { describe, expect, it } from "vitest";
import { folderCrumbs, rootFolders, subfolders } from "./folder-tree";

const PATHS = ["photos/2020/summer", "photos/2021", "photos/2020/winter/snow", "scans"];

describe("rootFolders", () => {
  it.each([
    [[], []],
    [
      PATHS,
      [
        { name: "photos", path: "photos", subfolderCount: 5 },
        { name: "scans", path: "scans", subfolderCount: 0 },
      ],
    ],
    [["only"], [{ name: "only", path: "only", subfolderCount: 0 }]],
  ])("lists the top folders of %j", (paths, expected) => {
    expect(rootFolders(paths)).toEqual(expected);
  });
});

describe("subfolders", () => {
  it.each([
    [
      "photos",
      [
        { name: "2020", path: "photos/2020", subfolderCount: 3 },
        { name: "2021", path: "photos/2021", subfolderCount: 0 },
      ],
    ],
    ["photos/2020/summer", []],
    ["scans", []],
    ["photo", []],
    ["missing", []],
  ])("lists what lies directly below %s", (parent, expected) => {
    expect(subfolders(PATHS, parent)).toEqual(expected);
  });
});

describe("folderCrumbs", () => {
  it("names each folder on the way down with the path that opens it", () => {
    expect(folderCrumbs("photos/2020/summer")).toEqual([
      { name: "photos", path: "photos" },
      { name: "2020", path: "photos/2020" },
      { name: "summer", path: "photos/2020/summer" },
    ]);
  });

  it("is empty for the top", () => {
    expect(folderCrumbs(null)).toEqual([]);
  });
});
