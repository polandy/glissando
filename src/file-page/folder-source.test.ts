import { describe, expect, it } from "vitest";
import { fetchedFolder, FolderUnreadableError, pickedFolder } from "./folder-source";

const entry = (relativePath: string, text = relativePath) => ({
  relativePath,
  file: new Blob([text]),
});

async function textOf(blob: Blob | null): Promise<string | null> {
  return blob === null ? null : blob.text();
}

describe("pickedFolder", () => {
  it("serves each file by its path below the chosen folder", async () => {
    const folder = pickedFolder([
      entry("Herbst/glissando.json"),
      entry("Herbst/pictures/0001.jpg"),
    ]);

    expect(await textOf(await folder.read("pictures/0001.jpg"))).toBe("Herbst/pictures/0001.jpg");
    expect(await folder.has("glissando.json")).toBe(true);
    expect(await folder.read("pictures/0002.jpg")).toBeNull();
    expect(await folder.has("pictures/0002.jpg")).toBe(false);
  });

  it("takes the shallowest glissando.json as the root, so picking the parent folder works", async () => {
    const folder = pickedFolder([
      entry("Downloads/Herbst/old/glissando.json", "old"),
      entry("Downloads/Herbst/glissando.json", "root"),
      entry("Downloads/Herbst/music/track-1.m4a"),
    ]);

    expect(await textOf(await folder.read("glissando.json"))).toBe("root");
    expect(await folder.has("music/track-1.m4a")).toBe(true);
  });

  it("ignores files outside the root", async () => {
    const folder = pickedFolder([
      entry("Downloads/Herbst/glissando.json"),
      entry("Downloads/other.jpg"),
    ]);

    expect(await folder.has("../other.jpg")).toBe(false);
    expect(await folder.has("other.jpg")).toBe(false);
  });

  it("holds no glissando.json where the folder has none", async () => {
    const folder = pickedFolder([entry("Herbst/pictures/0001.jpg")]);

    expect(await folder.read("glissando.json")).toBeNull();
  });
});

describe("fetchedFolder", () => {
  const served = (files: Readonly<Record<string, string>>) =>
    fetchedFolder(async (path) => {
      const text = files[path];
      return text === undefined ? new Response(null, { status: 404 }) : new Response(text);
    });

  it("fetches each file beside the page", async () => {
    const folder = served({ "glissando.json": "{}" });

    expect(await textOf(await folder.read("glissando.json"))).toBe("{}");
    expect(await folder.has("glissando.json")).toBe(true);
  });

  it("finds no file the server does not have", async () => {
    const folder = served({});

    expect(await folder.read("glissando.json")).toBeNull();
    expect(await folder.has("pictures/0001.jpg")).toBe(false);
  });

  it("tells a browser refusing to read beside a file:// page apart from a missing file", async () => {
    const refused = new TypeError("Failed to fetch");
    const folder = fetchedFolder(() => Promise.reject(refused));

    await expect(folder.read("glissando.json")).rejects.toThrow(FolderUnreadableError);
    expect(await folder.has("pictures/0001.jpg")).toBe(false);
  });
});
