import { describe, expect, it } from "vitest";
import { filesOfEntries, type DroppedEntry } from "./dropped-files";

const fileEntry = (name: string): DroppedEntry => ({
  isFile: true,
  isDirectory: false,
  file: (resolve) => resolve(new File([name], name)),
});

/** A folder whose reader hands out its children in batches of two, as browsers page them. */
const folder = (...children: DroppedEntry[]): DroppedEntry => ({
  isFile: false,
  isDirectory: true,
  createReader: () => {
    const rest = [...children];
    return { readEntries: (resolve) => resolve(rest.splice(0, 2)) };
  },
});

describe("filesOfEntries", () => {
  it("collects dropped files and every file inside dropped folders, depth first", async () => {
    const files = await filesOfEntries([
      fileEntry("a.jpg"),
      folder(fileEntry("b.jpg"), folder(fileEntry("c.jpg")), fileEntry("d.jpg")),
    ]);
    expect(files.map((file) => file.name)).toEqual(["a.jpg", "b.jpg", "c.jpg", "d.jpg"]);
  });
});
