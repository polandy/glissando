import { describe, expect, it } from "vitest";
import type { PictureDecoder, PixelPicture } from "./pixel-loader";
import { FallbackPictureDecoder } from "./fallback-picture-decoder";
import { PictureDecodeError } from "./worker-picture-decoder";
import { settleMicrotasks } from "../../testing/settle-microtasks";

/** A decoder whose decodes stay pending until the test settles them, in any order. */
class FakeDecoder implements PictureDecoder {
  readonly decodes: {
    readonly bytes: Blob;
    resolve(picture: PixelPicture): void;
    reject(error: Error): void;
  }[] = [];
  disposed = false;

  decode(bytes: Blob): Promise<PixelPicture> {
    const { promise, resolve, reject } = Promise.withResolvers<PixelPicture>();
    this.decodes.push({ bytes, resolve, reject });
    return promise;
  }

  dispose(): void {
    this.disposed = true;
  }

  succeed(index: number, picture: PixelPicture): void {
    this.decodes[index]?.resolve(picture);
  }

  fail(index: number, error: Error = new PictureDecodeError("unreadable")): void {
    this.decodes[index]?.reject(error);
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
const PICTURE: PixelPicture = { width: 1, height: 1, data: new Uint8ClampedArray(4) };
const OTHER_PICTURE: PixelPicture = { width: 2, height: 1, data: new Uint8ClampedArray(8) };

async function settled(): Promise<void> {
  await settleMicrotasks();
}

describe("FallbackPictureDecoder", () => {
  it("decodes with the primary decoder while it succeeds", async () => {
    const primary = new FakeDecoder();
    const fallback = new FakeDecoder();
    const decoder = new FallbackPictureDecoder(primary, fallback);

    const decoded = decoder.decode(FIRST);
    primary.succeed(0, PICTURE);

    await expect(decoded).resolves.toBe(PICTURE);
    expect(fallback.decodes).toHaveLength(0);
  });

  it("decodes a picture the primary failed with the fallback, and every later one with the fallback alone", async () => {
    const primary = new FakeDecoder();
    const fallback = new FakeDecoder();
    const decoder = new FallbackPictureDecoder(primary, fallback);

    const first = decoder.decode(FIRST);
    primary.fail(0);
    await settled();
    fallback.succeed(0, PICTURE);
    await expect(first).resolves.toBe(PICTURE);
    const second = decoder.decode(SECOND);
    fallback.succeed(1, OTHER_PICTURE);

    await expect(second).resolves.toBe(OTHER_PICTURE);
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
    fallback.succeed(0, PICTURE);
    await expect(first).resolves.toBe(PICTURE);
    primary.fail(1);
    await settled();
    fallback.succeed(1, OTHER_PICTURE);

    await expect(second).resolves.toBe(OTHER_PICTURE);
  });

  it("decodes with the fallback when the primary throws instead of rejecting", async () => {
    const fallback = new FakeDecoder();
    const decoder = new FallbackPictureDecoder(throwingDecoder, fallback);

    const decoded = decoder.decode(FIRST);
    await settled();
    fallback.succeed(0, PICTURE);

    await expect(decoded).resolves.toBe(PICTURE);
  });

  it("rejects a picture neither decoder can decode and keeps decoding with the primary", async () => {
    const primary = new FakeDecoder();
    const fallback = new FakeDecoder();
    const decoder = new FallbackPictureDecoder(primary, fallback);

    const corrupt = decoder.decode(FIRST);
    primary.fail(0);
    await settled();
    fallback.fail(0);
    await expect(corrupt).rejects.toBeInstanceOf(AggregateError);
    const next = decoder.decode(SECOND);
    primary.succeed(1, PICTURE);

    await expect(next).resolves.toBe(PICTURE);
    expect(primary.disposed).toBe(false);
  });

  it("rejects a picture neither decoder can decode with both decoders' errors", async () => {
    const primary = new FakeDecoder();
    const fallback = new FakeDecoder();
    const decoder = new FallbackPictureDecoder(primary, fallback);
    const primaryError = new PictureDecodeError("the worker refused it");
    const fallbackError = new PictureDecodeError("the main thread refused it");

    const corrupt = decoder.decode(FIRST);
    primary.fail(0, primaryError);
    await settled();
    fallback.fail(0, fallbackError);

    const error: unknown = await corrupt.catch((rejection: unknown) => rejection);
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toEqual([primaryError, fallbackError]);
  });

  it("does not decode with the fallback a picture the primary fails after disposal", async () => {
    const primary = new FakeDecoder();
    const fallback = new FakeDecoder();
    const decoder = new FallbackPictureDecoder(primary, fallback);
    const disposedError = new PictureDecodeError("The picture decoder was disposed");

    const pending = decoder.decode(FIRST);
    decoder.dispose();
    primary.fail(0, disposedError);

    await expect(pending).rejects.toBe(disposedError);
    expect(primary.decodes).toHaveLength(1);
    expect(fallback.decodes).toHaveLength(0);
  });

  it("rejects a decode the fallback finished after disposal", async () => {
    const primary = new FakeDecoder();
    const fallback = new FakeDecoder();
    const decoder = new FallbackPictureDecoder(primary, fallback);

    const pending = decoder.decode(FIRST);
    primary.fail(0);
    await settled();
    decoder.dispose();
    fallback.succeed(0, PICTURE);

    await expect(pending).rejects.toThrow(/disposed/);
    expect(fallback.decodes).toHaveLength(1);
  });

  it("rejects a decode asked for after disposal without decoding", async () => {
    const primary = new FakeDecoder();
    const fallback = new FakeDecoder();
    const decoder = new FallbackPictureDecoder(primary, fallback);
    decoder.dispose();

    await expect(decoder.decode(FIRST)).rejects.toThrow(/disposed/);
    expect([primary.decodes.length, fallback.decodes.length]).toEqual([0, 0]);
  });

  it("disposes both decoders", () => {
    const primary = new FakeDecoder();
    const fallback = new FakeDecoder();

    new FallbackPictureDecoder(primary, fallback).dispose();

    expect([primary.disposed, fallback.disposed]).toEqual([true, true]);
  });
});
