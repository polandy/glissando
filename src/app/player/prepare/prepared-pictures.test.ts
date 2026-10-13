import { describe, expect, it } from "vitest";
import { ImmichUnavailableError } from "../../../immich/immich-client";
import { PictureMissingFromImmichError } from "../../../server-library/server-slideshow-store";
import { PreparedPictures } from "./prepared-pictures";
import { FakeRenditions, ManualClock } from "./testing/fake-renditions";

function prepared(ids: readonly string[], capacity = 10) {
  const renditions = new FakeRenditions();
  const clock = new ManualClock();
  let changed: () => void = () => undefined;
  const pictures = new PreparedPictures({
    ids,
    prepare: renditions.prepare,
    clock: clock.now,
    capacity,
    onChange: () => changed(),
  });
  /** Settles at the next change the pictures announce. */
  const nextChange = () => new Promise<void>((resolve) => (changed = resolve));
  pictures.start();
  return { pictures, renditions, clock, nextChange };
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => new Error("expected the promise to reject"),
    (error: unknown) => error,
  );
}

describe("PreparedPictures", () => {
  it("prepares the pictures one after another, in the order they play", async () => {
    const { renditions } = prepared(["a", "b", "c"]);

    (await renditions.request(0)).answer();
    (await renditions.request(1)).answer();
    await renditions.request(2);

    expect(renditions.requests.map(({ id }) => id)).toEqual(["a", "b", "c"]);
  });

  it("opens a picture once it is prepared, as its encoded rendition", async () => {
    const { pictures, renditions } = prepared(["a", "b"]);
    const opening = pictures.open("b");

    (await renditions.request(0)).answer();
    (await renditions.request(1)).answer();

    expect(await (await opening).text()).toBe("rendition b");
    expect(pictures.readyInOrder()).toBe(2);
  });

  it("prepares a picture asked for out of order next", async () => {
    const { pictures, renditions } = prepared(["a", "b", "c", "d"]);
    const opening = pictures.open("d");

    (await renditions.request(0)).answer();
    (await renditions.request(1)).answer();

    expect(await (await opening).text()).toBe("rendition d");
    expect((await renditions.request(2)).id).toBe("b");
  });

  it("holds at most its capacity of pictures until a slide has passed", async () => {
    const { pictures, renditions, nextChange } = prepared(["a", "b", "c"], 2);
    (await renditions.request(0)).answer();
    const second = await renditions.request(1);
    const secondReady = nextChange();
    second.answer();
    await secondReady;

    expect(pictures.readyInOrder()).toBe(2);
    expect(renditions.requests).toHaveLength(2);

    pictures.passed("b");

    expect((await renditions.request(2)).id).toBe("c");
  });

  it("releases a picture once its slide has passed and prepares it again when asked", async () => {
    const { pictures, renditions } = prepared(["a", "b"]);
    (await renditions.request(0)).answer();
    (await renditions.request(1)).answer();
    await pictures.open("b");

    pictures.passed("b");
    const reopening = pictures.open("a");

    expect(pictures.isReady("b")).toBe(true);
    expect(pictures.isReady("a")).toBe(false);
    const again = await renditions.request(2);
    expect(again.id).toBe("a");
    again.answer();
    expect(await (await reopening).text()).toBe("rendition a");
  });

  it("times each picture and averages the most recent ones", async () => {
    const { pictures, renditions, clock, nextChange } = prepared(["a", "b", "c", "d", "e"]);
    expect(pictures.secondsPerPicture()).toBeNull();

    for (const [index, milliseconds] of [2000, 4000, 6000, 8000, 10000].entries()) {
      const request = await renditions.request(index);
      clock.advance(milliseconds);
      const changed = nextChange();
      request.answer();
      await changed;
    }

    expect(pictures.secondsPerPicture()).toBe(7);
  });

  it("skips a picture Immich no longer has and goes on with the next", async () => {
    const { pictures, renditions } = prepared(["a", "b"]);
    const opening = pictures.open("a");

    (await renditions.request(0)).fail(new PictureMissingFromImmichError("a"));
    const next = await renditions.request(1);

    expect(next.id).toBe("b");
    expect(await rejection(opening)).toBeInstanceOf(PictureMissingFromImmichError);
    expect([...pictures.missing()]).toEqual(["a"]);
    next.answer();
    await pictures.open("b");
    expect(pictures.readyInOrder()).toBe(1);
  });

  it("stops preparing ahead once Immich is not answering", async () => {
    const { pictures, renditions, nextChange } = prepared(["a", "b"]);
    const unavailable = new ImmichUnavailableError("unreachable");
    const failed = nextChange();

    (await renditions.request(0)).fail(unavailable);
    await failed;

    expect(pictures.failure()).toBe(unavailable);
    expect(renditions.requests.map(({ id }) => id)).toEqual(["a"]);
    expect(await rejection(pictures.open("a"))).toBe(unavailable);
  });

  it("cancels the picture under way and every open once closed", async () => {
    const { pictures, renditions } = prepared(["a", "b"]);
    const opening = pictures.open("b");
    const underWay = await renditions.request(0);

    pictures.close();

    expect(underWay.signal.aborted).toBe(true);
    expect(await rejection(opening)).toBeInstanceOf(DOMException);
    expect(renditions.requests).toHaveLength(1);
  });
});
