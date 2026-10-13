import { afterEach, describe, expect, it } from "vitest";
import type { ImmichAlbum } from "../../immich/immich-client";
import { mountWithTranslator } from "../testing/mount-with-translator";
import FrameAlbumPicker from "./FrameAlbumPicker.svelte";

let destroy = () => {};
afterEach(() => destroy());

function album(id: string, name: string): ImmichAlbum {
  return { id, name, photoCount: 12, coverId: null, startDate: null, endDate: null };
}

describe("FrameAlbumPicker", () => {
  it("shows a waiting line while the albums are still loading", () => {
    const mounted = mountWithTranslator(FrameAlbumPicker, {
      albums: null,
      failure: null,
      selectedAlbumId: null,
      thumbnailUrl: () => "",
      onSelectAlbum: () => {},
      onRetry: () => {},
    });
    destroy = mounted.destroy;

    expect(mounted.target.querySelector(".waiting")).not.toBeNull();
    expect(mounted.target.querySelector("ul")).toBeNull();
  });

  it("shows every album and marks the selected one", () => {
    const mounted = mountWithTranslator(FrameAlbumPicker, {
      albums: [album("lake", "Sommer am See"), album("hike", "Wanderung Allgäu")],
      failure: null,
      selectedAlbumId: "hike",
      thumbnailUrl: () => "",
      onSelectAlbum: () => {},
      onRetry: () => {},
    });
    destroy = mounted.destroy;

    const buttons = mounted.target.querySelectorAll<HTMLButtonElement>("button.album");
    expect(buttons).toHaveLength(2);
    expect(buttons[1]?.getAttribute("aria-pressed")).toBe("true");
    expect(buttons[0]?.getAttribute("aria-pressed")).toBe("false");
  });

  it("asks to select the clicked album", () => {
    const selected: string[] = [];
    const mounted = mountWithTranslator(FrameAlbumPicker, {
      albums: [album("lake", "Sommer am See")],
      failure: null,
      selectedAlbumId: null,
      thumbnailUrl: () => "",
      onSelectAlbum: (albumId) => selected.push(albumId),
      onRetry: () => {},
    });
    destroy = mounted.destroy;

    mounted.target.querySelector<HTMLButtonElement>("button.album")?.click();

    expect(selected).toEqual(["lake"]);
  });

  it("offers a retry when the albums could not be read", () => {
    let retries = 0;
    const mounted = mountWithTranslator(FrameAlbumPicker, {
      albums: null,
      failure: "unreachable",
      selectedAlbumId: null,
      thumbnailUrl: () => "",
      onSelectAlbum: () => {},
      onRetry: () => (retries += 1),
    });
    destroy = mounted.destroy;

    mounted.target.querySelector<HTMLButtonElement>("button")?.click();

    expect(retries).toBe(1);
  });
});
