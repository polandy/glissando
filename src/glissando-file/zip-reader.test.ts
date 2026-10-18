import { describe, expect, it } from "vitest";
import { crc32 } from "./crc32";
import { StoredZipWriter } from "./stored-zip";
import { rawZip } from "./testing/raw-zip";
import { readEntry, readZipDirectory, startsLikeZip, type ZipEntry } from "./zip-reader";

const MODIFIED = new Date("2025-07-01T10:30:14Z");
const text = (value: string): Blob => new Blob([new TextEncoder().encode(value)]);

async function storedZipOf(entries: Record<string, string>): Promise<Blob> {
  const writer = new StoredZipWriter(MODIFIED);
  for (const [name, value] of Object.entries(entries)) {
    await writer.add(name, text(value));
  }
  return writer.finish();
}

async function bytesOf(blob: Blob): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await blob.arrayBuffer());
}

async function onlyEntry(zip: Blob): Promise<ZipEntry> {
  const [entry] = (await readZipDirectory(zip)) ?? [];
  if (entry === undefined) {
    throw new Error("expected one entry");
  }
  return entry;
}

/** The reason an entry was refused, or a thrown failure when it was read. */
async function refusal(zip: Blob): Promise<string> {
  const read = await readEntry(zip, await onlyEntry(zip));
  if (read.kind !== "damaged") {
    throw new Error("expected the entry to be refused");
  }
  return read.reason;
}

describe("readZipDirectory", () => {
  it("reads back every entry's name, unpacked size and checksum in the written order", async () => {
    const zip = await storedZipOf({ "glissando.json": "{}", "pictures/0001.jpg": "jpeg bytes" });

    const entries = await readZipDirectory(zip);

    expect(entries?.map((entry) => [entry.name, entry.size, entry.crc32])).toEqual([
      ["glissando.json", 2, crc32(new TextEncoder().encode("{}"))],
      ["pictures/0001.jpg", 10, crc32(new TextEncoder().encode("jpeg bytes"))],
    ]);
  });

  it("reads a UTF-8 name", async () => {
    const zip = await storedZipOf({ "Größe ä.txt": "x" });
    expect((await readZipDirectory(zip))?.[0]?.name).toBe("Größe ä.txt");
  });

  it("gives a deflated entry its unpacked size, not its packed one", async () => {
    const zip = await rawZip([{ name: "a.txt", content: "a".repeat(1000) }]);
    expect((await onlyEntry(zip)).size).toBe(1000);
  });

  it("finds no directory in a file cut short", async () => {
    const zip = await storedZipOf({ "glissando.json": "{}", "pictures/0001.jpg": "jpeg bytes" });
    expect(await readZipDirectory(zip.slice(0, zip.size - 10))).toBeNull();
  });

  it("finds no directory when a central header no longer matches its local header", async () => {
    const bytes = await bytesOf(await storedZipOf({ "a.txt": "hello" }));
    bytes[30] = "b".charCodeAt(0);
    expect(await readZipDirectory(new Blob([bytes]))).toBeNull();
  });

  it("finds no directory in a file that is no ZIP at all", async () => {
    expect(await readZipDirectory(text("not a zip"))).toBeNull();
  });

  it("finds no directory when a stored entry's packed and unpacked sizes differ", async () => {
    const zip = await rawZip([
      { name: "a.txt", content: "hello", method: "stored", declaredSize: 9 },
    ]);
    expect(await readZipDirectory(zip)).toBeNull();
  });

  it("finds no directory when two entries share a name", async () => {
    const zip = await rawZip([
      { name: "a.txt", content: "one" },
      { name: "a.txt", content: "two" },
    ]);
    expect(await readZipDirectory(zip)).toBeNull();
  });
});

describe("startsLikeZip", () => {
  it("tells a ZIP from a file that does not start like one", async () => {
    expect(await startsLikeZip(await storedZipOf({ "a.txt": "x" }))).toBe(true);
    expect(await startsLikeZip(text("\xff\xd8\xff a JPEG, say"))).toBe(false);
  });
});

describe("readEntry", () => {
  it("reads a stored entry as a slice of the file, with the type asked for", async () => {
    const zip = await storedZipOf({ "a.jpg": "jpeg bytes" });
    const read = await readEntry(zip, await onlyEntry(zip), { type: "image/jpeg" });
    expect(read.kind === "ok" && (await read.data.text())).toBe("jpeg bytes");
    expect(read.kind === "ok" && read.data.type).toBe("image/jpeg");
  });

  it("unpacks a deflated entry, with the type asked for", async () => {
    const content = "deflated bytes ".repeat(100);
    const zip = await rawZip([{ name: "a.txt", content }]);
    const read = await readEntry(zip, await onlyEntry(zip), { type: "text/plain" });
    expect(read.kind === "ok" && (await read.data.text())).toBe(content);
    expect(read.kind === "ok" && read.data.type).toBe("text/plain");
  });

  it("refuses a stored entry whose bytes do not match its checksum, naming it", async () => {
    const zip = await rawZip([{ name: "a.txt", content: "hello", method: "stored", crc32: 1 }]);
    expect(await refusal(zip)).toBe('"a.txt" does not match its checksum');
  });

  it("checks a deflated entry again even when it was checked before", async () => {
    const zip = await rawZip([{ name: "a.txt", content: "hello", crc32: 1 }]);
    const read = await readEntry(zip, await onlyEntry(zip), { checkedBefore: true });
    expect(read.kind).toBe("damaged");
  });

  it("refuses a deflated entry whose unpacked bytes do not match its checksum", async () => {
    const zip = await rawZip([{ name: "a.txt", content: "hello", crc32: 1 }]);
    expect(await refusal(zip)).toBe('"a.txt" does not match its checksum');
  });

  it("refuses a deflated entry that unpacks beyond its declared size, a ZIP bomb", async () => {
    const zip = await rawZip([
      { name: "bomb.txt", content: new Uint8Array(4 * 1024 * 1024), declaredSize: 10 },
    ]);
    expect(await refusal(zip)).toBe('"bomb.txt" unpacks to more than its declared 10 bytes');
  });

  it("refuses a deflated entry that unpacks short of its declared size", async () => {
    const zip = await rawZip([{ name: "a.txt", content: "hello", declaredSize: 9 }]);
    expect(await refusal(zip)).toBe('"a.txt" unpacks to 5 bytes, not its declared 9');
  });

  it("refuses an entry whose deflated bytes are broken", async () => {
    const zip = await rawZip([{ name: "a.txt", content: "not deflate at all", method: 8 }]);
    expect(await refusal(zip)).toBe('"a.txt" does not unpack: its deflated bytes are broken');
  });

  it("refuses an entry packed with another method, naming the method and the two it reads", async () => {
    const zip = await rawZip([{ name: "a.txt", content: "lzma bytes", method: 14 }]);
    expect(await refusal(zip)).toBe(
      '"a.txt" is packed with ZIP method 14; only stored (0) and deflated (8) entries open',
    );
  });

  it("refuses an encrypted entry", async () => {
    const zip = await rawZip([{ name: "a.txt", content: "secret", flags: 0x0001 }]);
    expect(await refusal(zip)).toBe('"a.txt" is encrypted');
  });
});
