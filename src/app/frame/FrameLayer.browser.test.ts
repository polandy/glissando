import { flushSync } from "svelte";
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

function photo(id: string, place: string | null): ImmichPhoto {
  return { id, fileName: `${id}.jpg`, takenAt: "2025-07-12T10:00:00Z", size: null, place };
}

/** Resolves every call at once; a frame's own test never races on network timing. */
function fakeImmichClient(
  albums: readonly ImmichAlbum[],
  place: string | null = null,
): Pick<ImmichClient, "albums" | "photos" | "thumbnail"> {
  return {
    albums: () => Promise.resolve(albums),
    photos: () => Promise.resolve({ photos: [photo("a", place)], nextPage: null }),
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
  it("captions the picture on screen with its place as the title and its date below", async () => {
    const mounted = mountWithTranslator(FrameLayer, baseProps(fakeImmichClient([ALBUM], "Annecy")));
    destroy = mounted.destroy;

    await whenRendered(mounted.target, ".stamp");

    expect(mounted.target.querySelector(".bar")).not.toBeNull();
    expect(mounted.target.querySelector(".stamp b")?.textContent).toBe("Annecy");
    expect(mounted.target.querySelector(".stamp small")?.textContent).toMatch(/12\. Juli 2025/);
    expect(mounted.target.querySelector(".stamp")?.textContent).not.toContain("Sommer am See");
  });

  it("makes the date the title, with no second line, for a picture without a place", async () => {
    const mounted = mountWithTranslator(FrameLayer, baseProps(fakeImmichClient([ALBUM])));
    destroy = mounted.destroy;

    await whenRendered(mounted.target, ".stamp");

    expect(mounted.target.querySelector(".stamp b")?.textContent).toMatch(/12\. Juli 2025/);
    expect(mounted.target.querySelector(".stamp small")).toBeNull();
  });

  it("shows no caption when the date preference is off", async () => {
    const props = baseProps(fakeImmichClient([ALBUM], "Annecy"));
    const mounted = mountWithTranslator(FrameLayer, {
      ...props,
      preferences: { state: { ...props.preferences.state, showDate: false } },
    });
    destroy = mounted.destroy;

    // The round's player container is the positive signal that the picture is on its way; the
    // caption would render in the same flush.
    await whenRendered(mounted.target, ".stage > div");
    flushSync();

    expect(mounted.target.querySelector(".bar")).not.toBeNull();
    expect(mounted.target.querySelector(".stamp")).toBeNull();
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
