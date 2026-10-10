import { describe, expect, it } from "vitest";
import { MemoryBlobSink, streamPageSink, type StreamTarget } from "./page-sinks";

/** A file target writing into memory; `discarded` once emptied. */
class MemoryStreamTarget implements StreamTarget {
  readonly chunks: Uint8Array[] = [];
  opened = 0;
  closed = false;
  aborted = false;
  discarded = false;

  open(): Promise<WritableStream> {
    this.opened += 1;
    return Promise.resolve(
      new WritableStream<Uint8Array>({
        write: (chunk) => {
          this.chunks.push(chunk);
        },
        close: () => {
          this.closed = true;
        },
        abort: () => {
          this.aborted = true;
        },
      }),
    );
  }

  discard(): Promise<void> {
    this.discarded = true;
    return Promise.resolve();
  }

  get text(): string {
    return new TextDecoder().decode(new Uint8Array(this.chunks.flatMap((chunk) => [...chunk])));
  }
}

describe("streamPageSink", () => {
  it("streams each part to the file as UTF-8, opened once, and closes it", async () => {
    const target = new MemoryStreamTarget();
    const sink = streamPageSink(target);

    await sink.write("<title>Côte</title>");
    await sink.write("AAAA");
    await sink.close();

    expect(target.text).toBe("<title>Côte</title>AAAA");
    expect(target.opened).toBe(1);
    expect(target.closed).toBe(true);
  });

  it("aborts the stream and empties the file on abort", async () => {
    const target = new MemoryStreamTarget();
    const sink = streamPageSink(target);
    await sink.write("half a page");

    await sink.abort();

    expect(target.aborted).toBe(true);
    expect(target.discarded).toBe(true);
  });

  it("empties the file on an abort before anything was written", async () => {
    const target = new MemoryStreamTarget();

    await streamPageSink(target).abort();

    expect(target.discarded).toBe(true);
    expect(target.opened).toBe(0);
  });
});

describe("MemoryBlobSink", () => {
  it("collects the page into one HTML blob once closed", async () => {
    const sink = new MemoryBlobSink();
    await sink.write("<!doctype html>");
    await sink.write("<p>ü</p>");
    await sink.close();

    const blob = sink.blob();

    expect(blob.type).toBe("text/html");
    expect(await blob.text()).toBe("<!doctype html><p>ü</p>");
  });

  it("has no blob before it is closed, nor after an abort", async () => {
    const sink = new MemoryBlobSink();
    await sink.write("<!doctype html>");

    expect(() => sink.blob()).toThrow(/not closed/);
    await sink.abort();
    expect(() => sink.blob()).toThrow(/aborted/);
  });
});
