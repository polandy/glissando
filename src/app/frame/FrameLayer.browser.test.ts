import { afterEach, describe, expect, it } from "vitest";
import type { ImmichAvailability } from "../../immich/immich-availability";
import type { ImmichAlbum, ImmichClient, ImmichPhoto } from "../../immich/immich-client";
import type { ScreenAwakePorts } from "../video-export/screen-awake";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { whenRendered } from "../testing/when-rendered";
import FrameLayer from "./FrameLayer.svelte";

const ALBUM: ImmichAlbum = {
  id: "lake",
  name: "Sommer am See",
  photoCount: 1,
  coverId: "a",
  startDate: null,
  endDate: null,
};

function photo(id: string): ImmichPhoto {
  return { id, fileName: `${id}.jpg`, takenAt: "2025-07-01T10:00:00Z", size: null };
}

/** Resolves every call at once; a frame's own test never races on network timing. */
function fakeImmichClient(
  albums: readonly ImmichAlbum[],
): Pick<ImmichClient, "albums" | "photos" | "thumbnail"> {
  return {
    albums: () => Promise.resolve(albums),
    photos: () => Promise.resolve({ photos: [photo("a")], nextPage: null }),
    thumbnail: () => Promise.resolve(new Blob([])),
  };
}

const noopScreenAwake: ScreenAwakePorts = {
  request: () => new Promise(() => {}),
  isVisible: () => true,
  onVisibilityChange: () => () => {},
  log: () => {},
};
const noopScheduler = { after: () => () => {} };

function baseProps(client: Pick<ImmichClient, "albums" | "photos" | "thumbnail">) {
  return {
    albumId: "lake",
    immich: {
      client: client as ImmichClient,
      availability: {} as ImmichAvailability,
    },
    preferences: {
      state: {
        albumId: null,
        intervalSeconds: 30 as const,
        order: "shuffled" as const,
        showClock: false,
        showDate: true,
      },
    },
    device: {
      scheduler: noopScheduler,
      clipboard: null,
      screenAwake: noopScreenAwake,
      linkFor: () => "",
    },
    onExit: () => {},
    log: () => {},
  };
}

let destroy = () => {};
afterEach(() => destroy());

describe("FrameLayer", () => {
  it("shows the stage and the album's name once the album and its pictures are read", async () => {
    const mounted = mountWithTranslator(FrameLayer, baseProps(fakeImmichClient([ALBUM])));
    destroy = mounted.destroy;

    await whenRendered(mounted.target, ".stage");

    expect(mounted.target.querySelector(".stamp")?.textContent).toContain("Sommer am See");
    expect(mounted.target.querySelector(".bar")).not.toBeNull();
  });

  it("tells the owner when the linked album no longer exists", async () => {
    const mounted = mountWithTranslator(FrameLayer, baseProps(fakeImmichClient([])));
    destroy = mounted.destroy;

    const notice = await whenRendered(mounted.target, ".notice.error");

    expect(notice.textContent).toContain("Immich antwortet nicht");
  });

  it("tells the owner when Immich could not be reached at all", async () => {
    const client: Pick<ImmichClient, "albums" | "photos" | "thumbnail"> = {
      albums: () => Promise.reject(new Error("offline")),
      photos: () => Promise.reject(new Error("offline")),
      thumbnail: () => Promise.reject(new Error("offline")),
    };
    const logged: unknown[] = [];
    const mounted = mountWithTranslator(FrameLayer, {
      ...baseProps(client),
      log: (error: unknown) => logged.push(error),
    });
    destroy = mounted.destroy;

    await whenRendered(mounted.target, ".notice.error");

    expect(logged).toHaveLength(1);
  });

  it("exits on the exit button and on Escape", async () => {
    let exits = 0;
    const mounted = mountWithTranslator(FrameLayer, {
      ...baseProps(fakeImmichClient([ALBUM])),
      onExit: () => (exits += 1),
    });
    destroy = mounted.destroy;
    await whenRendered(mounted.target, ".stage");

    mounted.target.querySelector<HTMLButtonElement>(".exit")?.click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(exits).toBe(2);
  });
});
