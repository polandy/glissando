import { describe, expect, it } from "vitest";
import { glissandoEntries, type EntryLayout } from "./entry-layout";
import type { ZipEntry } from "./zip-reader";

function entry(name: string, size = 1): ZipEntry {
  return { name, dataOffset: 0, packedSize: size, size, crc32: 0, method: 8, encrypted: false };
}

function layoutOf(...names: (string | ZipEntry)[]): EntryLayout {
  return glissandoEntries(names.map((name) => (typeof name === "string" ? entry(name) : name)));
}

/** The format names a layout found, each with the entry's own name in the ZIP. */
function namesOf(layout: EntryLayout): [string, string][] {
  if (layout.kind !== "glissando") {
    throw new Error(`expected a .glissando layout, got ${layout.kind}`);
  }
  return [...layout.entries].map(([name, zipEntry]) => [name, zipEntry.name]);
}

describe("glissandoEntries", () => {
  it("keeps every entry of a file packed as the export packs it", () => {
    expect(namesOf(layoutOf("glissando.json", "pictures/0001.jpg"))).toEqual([
      ["glissando.json", "glissando.json"],
      ["pictures/0001.jpg", "pictures/0001.jpg"],
    ]);
  });

  it("finds glissando.json anywhere among the entries", () => {
    expect(namesOf(layoutOf("pictures/0001.jpg", "glissando.json"))).toEqual([
      ["pictures/0001.jpg", "pictures/0001.jpg"],
      ["glissando.json", "glissando.json"],
    ]);
  });

  it.each([
    ["an empty directory entry", entry("pictures/", 0)],
    ["the macOS resource fork folder", entry("__MACOSX/", 0)],
    ["a macOS resource fork", "__MACOSX/._glissando.json"],
    ["a nested macOS resource fork", "__MACOSX/pictures/._0001.jpg"],
    ["an AppleDouble file beside its own", "pictures/._0001.jpg"],
    ["a Finder folder setting", ".DS_Store"],
    ["a nested Finder folder setting", "pictures/.DS_Store"],
    ["a Windows thumbnail cache", "Thumbs.db"],
    ["a Windows folder setting", "pictures/desktop.ini"],
    ["a Windows folder setting, capitalised", "Desktop.ini"],
  ])("skips %s that a ZIP tool adds", (_, toolEntry) => {
    expect(namesOf(layoutOf("glissando.json", toolEntry, "pictures/0001.jpg"))).toEqual([
      ["glissando.json", "glissando.json"],
      ["pictures/0001.jpg", "pictures/0001.jpg"],
    ]);
  });

  it("keeps a directory entry with content, for the name check to refuse", () => {
    expect(namesOf(layoutOf("glissando.json", "pictures/"))).toEqual([
      ["glissando.json", "glissando.json"],
      ["pictures/", "pictures/"],
    ]);
  });

  it.each(["../.DS_Store", "/.DS_Store", "pictures/../Thumbs.db", "pictures\\.DS_Store"])(
    'keeps the tool-like name "%s" that leaves its folder, for the name check to refuse',
    (name) => {
      expect(namesOf(layoutOf("glissando.json", name))).toContainEqual([name, name]);
    },
  );

  it("takes off one folder every entry shares, as zipping a folder adds it", () => {
    const layout = layoutOf(
      entry("Herbst in Wien/", 0),
      entry("Herbst in Wien/pictures/", 0),
      "Herbst in Wien/pictures/0001.jpg",
      "Herbst in Wien/glissando.json",
      "__MACOSX/Herbst in Wien/._glissando.json",
      "Herbst in Wien/.DS_Store",
    );
    expect(namesOf(layout)).toEqual([
      ["pictures/0001.jpg", "Herbst in Wien/pictures/0001.jpg"],
      ["glissando.json", "Herbst in Wien/glissando.json"],
    ]);
  });

  it("keeps the shared folder when glissando.json is at the top, for the name check to refuse", () => {
    expect(namesOf(layoutOf("glissando.json", "Album/pictures/0001.jpg"))).toContainEqual([
      "Album/pictures/0001.jpg",
      "Album/pictures/0001.jpg",
    ]);
  });

  it.each([
    ["an entry no format uses", "notes.txt"],
    ["one the stripped folder also holds", "pictures/0001.jpg"],
  ])("refuses %s outside the shared folder, naming it and the folder", (_, outside) => {
    expect(layoutOf("Album/glissando.json", "Album/pictures/0001.jpg", outside)).toEqual({
      kind: "damaged",
      reason: `"${outside}" is outside the folder "Album/" that holds glissando.json`,
    });
  });

  it.each([
    ["no glissando.json at all", ["pictures/0001.jpg", "notes.txt"]],
    ["glissando.json two folders deep", ["a/b/glissando.json", "a/b/pictures/0001.jpg"]],
    ["two folders that each hold one", ["a/glissando.json", "b/glissando.json"]],
    ["only tool entries", [".DS_Store", "__MACOSX/._x"]],
    ["no entries", []],
  ])("finds a foreign file with %s", (_, names) => {
    expect(layoutOf(...names).kind).toBe("foreign");
  });
});
