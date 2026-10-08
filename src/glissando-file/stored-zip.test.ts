import { describe, expect, it } from "vitest";
import { crc32 } from "./crc32";
import { entryData, firstEntryName, readZipDirectory, StoredZipWriter } from "./stored-zip";

const MODIFIED = new Date("2025-07-01T10:30:14Z");
const text = (value: string): Blob => new Blob([new TextEncoder().encode(value)]);

async function zipOf(entries: Record<string, string>): Promise<Blob> {
  const writer = new StoredZipWriter(MODIFIED);
  for (const [name, value] of Object.entries(entries)) {
    await writer.add(name, text(value));
  }
  return writer.finish();
}

async function bytesOf(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

describe("StoredZipWriter and readZipDirectory", () => {
  it("reads back every entry's name, size, checksum and bytes in the written order", async () => {
    const zip = await zipOf({ "glissando.json": "{}", "pictures/0001.jpg": "jpeg bytes" });

    const entries = await readZipDirectory(zip);

    expect(entries?.map((entry) => [entry.name, entry.size, entry.crc32])).toEqual([
      ["glissando.json", 2, crc32(new TextEncoder().encode("{}"))],
      ["pictures/0001.jpg", 10, crc32(new TextEncoder().encode("jpeg bytes"))],
    ]);
    const second = entries?.[1];
    expect(second && (await entryData(zip, second).text())).toBe("jpeg bytes");
  });

  it("stores the bytes uncompressed, so the container is entries plus headers only", async () => {
    const zip = await zipOf({ "a.txt": "hello" });
    const localHeader = 30;
    const centralHeader = 46;
    const end = 22;
    expect(zip.size).toBe(localHeader + 5 + 5 + centralHeader + 5 + end);
  });

  it("writes names as UTF-8 and flags them so", async () => {
    const zip = await zipOf({ "Größe ä.txt": "x" });
    const bytes = await bytesOf(zip);
    const flags = (bytes[6] ?? 0) | ((bytes[7] ?? 0) << 8);
    expect(flags & 0x0800).toBe(0x0800);
    expect((await readZipDirectory(zip))?.[0]?.name).toBe("Größe ä.txt");
  });

  it("gives the type asked for to an entry's data", async () => {
    const zip = await zipOf({ "a.jpg": "x" });
    const [entry] = (await readZipDirectory(zip)) ?? [];
    expect(entry && entryData(zip, entry, "image/jpeg").type).toBe("image/jpeg");
  });

  it("names the first entry from its local header", async () => {
    expect(await firstEntryName(await zipOf({ "glissando.json": "{}", b: "" }))).toBe(
      "glissando.json",
    );
  });

  it("finds no first entry in a file that does not start like a ZIP", async () => {
    expect(await firstEntryName(text("\xff\xd8\xff a JPEG, say"))).toBeNull();
  });

  it("finds no directory in a file cut short", async () => {
    const zip = await zipOf({ "glissando.json": "{}", "pictures/0001.jpg": "jpeg bytes" });
    const cut = zip.slice(0, zip.size - 10);
    expect(await firstEntryName(cut)).toBe("glissando.json");
    expect(await readZipDirectory(cut)).toBeNull();
  });

  it("finds no directory when a central header no longer matches its local header", async () => {
    const zip = await zipOf({ "a.txt": "hello" });
    const bytes = await bytesOf(zip);
    bytes[30] = "b".charCodeAt(0);
    expect(await readZipDirectory(new Blob([bytes]))).toBeNull();
  });

  it("finds no directory in a file that is no ZIP at all", async () => {
    expect(await readZipDirectory(text("not a zip"))).toBeNull();
  });

  it("finds no directory for a compressed entry, which it cannot read", async () => {
    const zip = await zipOf({ "a.txt": "hello" });
    const bytes = await bytesOf(zip);
    const centralStart = 30 + 5 + 5;
    bytes[centralStart + 10] = 8;
    expect(await readZipDirectory(new Blob([bytes]))).toBeNull();
  });
});
