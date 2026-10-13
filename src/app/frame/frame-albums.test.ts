import { describe, expect, it } from "vitest";
import { ImmichUnavailableError } from "../../immich/immich-client";
import { FrameAlbums } from "./frame-albums";

const ALBUM = {
  id: "a1",
  name: "Garden",
  photoCount: 3,
  coverId: "p1",
  startDate: "2025-01-01T00:00:00Z",
  endDate: "2025-01-02T00:00:00Z",
};

function fakeClient(albums: () => Promise<readonly (typeof ALBUM)[]>) {
  return { albums };
}

describe("FrameAlbums", () => {
  it("starts loading, with no albums and no failure yet", () => {
    const albums = new FrameAlbums({
      client: fakeClient(() => new Promise(() => {})),
      reportUnavailable: () => undefined,
    });

    expect(albums.state).toEqual({ albums: null, failure: null });
  });

  it("publishes the albums once Immich answers", async () => {
    const albums = new FrameAlbums({
      client: fakeClient(() => Promise.resolve([ALBUM])),
      reportUnavailable: () => undefined,
    });

    await albums.load();

    expect(albums.state).toEqual({ albums: [ALBUM], failure: null });
  });

  it("publishes an Immich problem as a failure, and reports it", async () => {
    const reported: string[] = [];
    const albums = new FrameAlbums({
      client: fakeClient(() => Promise.reject(new ImmichUnavailableError("offline"))),
      reportUnavailable: (kind) => reported.push(kind),
    });

    await albums.load();

    expect(albums.state).toEqual({ albums: null, failure: "offline" });
    expect(reported).toEqual(["offline"]);
  });

  it("asks again on retry, clearing the failure first", async () => {
    let attempt = 0;
    const albums = new FrameAlbums({
      client: fakeClient(() => {
        attempt += 1;
        return attempt === 1
          ? Promise.reject(new ImmichUnavailableError("offline"))
          : Promise.resolve([ALBUM]);
      }),
      reportUnavailable: () => undefined,
    });
    await albums.load();

    await albums.retry();

    expect(albums.state).toEqual({ albums: [ALBUM], failure: null });
  });

  it("does not ask twice while a load is already on its way", () => {
    let calls = 0;
    const albums = new FrameAlbums({
      client: fakeClient(() => {
        calls += 1;
        return new Promise(() => {});
      }),
      reportUnavailable: () => undefined,
    });

    void albums.load();
    void albums.load();

    expect(calls).toBe(1);
  });

  it("calls every subscriber with the current state at once, then on every change", async () => {
    const albums = new FrameAlbums({
      client: fakeClient(() => Promise.resolve([ALBUM])),
      reportUnavailable: () => undefined,
    });
    const seen: unknown[] = [];
    albums.subscribe((state) => seen.push(state));

    await albums.load();

    expect(seen).toEqual([
      { albums: null, failure: null },
      { albums: [ALBUM], failure: null },
    ]);
  });
});
