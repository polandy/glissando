import { describe, expect, it } from "vitest";
import { crc32 } from "./crc32";
import { StoredZipWriter } from "./stored-zip";
import { readEntry, readZipDirectory } from "./zip-reader";

const MODIFIED = new Date("2025-07-01T10:30:14Z");
const text = (value: string): Blob => new Blob([new TextEncoder().encode(value)]);

async function zipOf(entries: Record<string, string>): Promise<Blob> {
  const writer = new StoredZipWriter(MODIFIED);
  for (const [name, value] of Object.entries(entries)) {
    await writer.add(name, text(value));
  }
  return writer.finish();
}

async function bytesOf(blob: Blob): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await blob.arrayBuffer());
}

describe("StoredZipWriter", () => {
  it("reads back every entry's name, size, checksum and bytes in the written order", async () => {
    const zip = await zipOf({ "glissando.json": "{}", "pictures/0001.jpg": "jpeg bytes" });

    const entries = await readZipDirectory(zip);

    expect(entries?.map((entry) => [entry.name, entry.size, entry.crc32])).toEqual([
      ["glissando.json", 2, crc32(new TextEncoder().encode("{}"))],
      ["pictures/0001.jpg", 10, crc32(new TextEncoder().encode("jpeg bytes"))],
    ]);
    const second = entries?.[1];
    const read = second && (await readEntry(zip, second));
    expect(read?.kind === "ok" && (await read.data.text())).toBe("jpeg bytes");
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
});
