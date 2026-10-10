import { describe, expect, it } from "vitest";
import type { PictureDecoder } from "./bitmap-loader";
import { FallbackPictureDecoder } from "./fallback-picture-decoder";
import { PictureDecodeError } from "./worker-picture-decoder";

/** A decoder whose decodes stay pending until the test settles them, in any order. */
class FakeDecoder implements PictureDecoder {
  readonly decodes: {
    readonly bytes: Blob;
    resolve(bitmap: ImageBitmap): void;
    reject(error: Error): void;
  }[] = [];
  disposed = false;

  decode(bytes: Blob): Promise<ImageBitmap> {
    const { promise, resolve, reject } = Promise.withResolvers<ImageBitmap>();
    this.decodes.push({ bytes, resolve, reject });
    return promise;
  }

  dispose(): void {
    this.disposed = true;
  }

  succeed(index: number, bitmap: ImageBitmap): void {
    this.decodes[index]?.resolve(bitmap);
  }

  fail(index: number): void {
    this.decodes[index]?.reject(new PictureDecodeError("unreadable"));
  }
}

/** A decoder that cannot even be asked: its decode throws instead of rejecting. */
const throwingDecoder: PictureDecoder = {
  decode() {
    throw new PictureDecodeError("the worker cannot be started");
  },
  dispose() {
    // Nothing to release.
  },
};

const FIRST = new Blob(["first"]);
const SECOND = new Blob(["second"]);
const BITMAP = { width: 4, height: 3 } as ImageBitmap;
const OTHER_BITMAP = { width: 2, height: 1 } as ImageBitmap;

/** Lets every already-settled promise run its reactions. */
async function settled(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("FallbackPictureDecoder", () => {
  it("decodes with the primary decoder while it succeeds", async () => {
    const primary = new FakeDecoder();
    const fallback = new FakeDecoder();
    const decoder = new FallbackPictureDecoder(primary, fallback);

    const decoded = decoder.decode(FIRST);
    primary.succeed(0, BITMAP);

    await expect(decoded).resolves.toBe(BITMAP);
    expect(fallback.decodes).toHaveLength(0);
  });

  it("decodes a picture the primary failed with the fallback, and every later one with the fallback alone", async () => {
    const primary = new FakeDecoder();
    const fallback = new FakeDecoder();
    const decoder = new FallbackPictureDecoder(primary, fallback);

    const first = decoder.decode(FIRST);
    primary.fail(0);
    await settled();
    fallback.succeed(0, BITMAP);
    await expect(first).resolves.toBe(BITMAP);
    const second = decoder.decode(SECOND);
    fallback.succeed(1, OTHER_BITMAP);

    await expect(second).resolves.toBe(OTHER_BITMAP);
    expect(fallback.decodes.map(({ bytes }) => bytes)).toEqual([FIRST, SECOND]);
    expect(primary.decodes).toHaveLength(1);
    expect(primary.disposed).toBe(true);
  });

  it("moves a decode still pending in the primary to the fallback when the primary fails it later", async () => {
    const primary = new FakeDecoder();
    const fallback = new FakeDecoder();
    const decoder = new FallbackPictureDecoder(primary, fallback);

    const first = decoder.decode(FIRST);
    const second = decoder.decode(SECOND);
    primary.fail(0);
    await settled();
    fallback.succeed(0, BITMAP);
    await expect(first).resolves.toBe(BITMAP);
    primary.fail(1);
    await settled();
    fallback.succeed(1, OTHER_BITMAP);

    await expect(second).resolves.toBe(OTHER_BITMAP);
  });

  it("decodes with the fallback when the primary throws instead of rejecting", async () => {
    const fallback = new FakeDecoder();
    const decoder = new FallbackPictureDecoder(throwingDecoder, fallback);

    const decoded = decoder.decode(FIRST);
    await settled();
    fallback.succeed(0, BITMAP);

    await expect(decoded).resolves.toBe(BITMAP);
  });

  it("rejects a picture neither decoder can decode and keeps decoding with the primary", async () => {
    const primary = new FakeDecoder();
    const fallback = new FakeDecoder();
    const decoder = new FallbackPictureDecoder(primary, fallback);

    const corrupt = decoder.decode(FIRST);
    primary.fail(0);
    await settled();
    fallback.fail(0);
    await expect(corrupt).rejects.toBeInstanceOf(PictureDecodeError);
    const next = decoder.decode(SECOND);
    primary.succeed(1, BITMAP);

    await expect(next).resolves.toBe(BITMAP);
    expect(primary.disposed).toBe(false);
  });

  it("disposes both decoders", () => {
    const primary = new FakeDecoder();
    const fallback = new FakeDecoder();

    new FallbackPictureDecoder(primary, fallback).dispose();

    expect([primary.disposed, fallback.disposed]).toEqual([true, true]);
  });
});
