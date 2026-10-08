import { afterEach, describe, expect, it } from "vitest";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { SlideshowEditor } from "../editing/slideshow-editor";
import { FakeScheduler } from "../testing/fake-scheduler";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { Toaster } from "../toast/toaster";
import PictureEditorRoute from "./PictureEditorRoute.svelte";

const SHOW: StoredSlideshow = {
  id: "show",
  title: "Juli 2025",
  createdAt: "2025-07-02T00:00:00Z",
  pictures: ["a", "b"].map((id) => ({
    id,
    capturedAt: "2025-07-01T10:00:00Z",
    width: 100,
    height: 100,
    fileName: `${id}.jpg`,
  })),
  secondsPerPicture: 5,
};

let destroy = () => {};
afterEach(() => destroy());

async function mountRoute(pictureId: string) {
  const store = new MemoryLibraryStore();
  for (const picture of SHOW.pictures) {
    await store.putPicture(picture.id, { display: new Blob([]), thumbnail: new Blob([]) });
  }
  const errors: unknown[] = [];
  const editor = new SlideshowEditor(SHOW, {
    store,
    toaster: new Toaster(new FakeScheduler()),
    newId: () => "claim-1",
    now: () => new Date("2026-10-08T12:00:00Z"),
    onError: (error) => errors.push(error),
    onGone: () => {},
    removedText: () => "Bild entfernt",
    undoLabel: () => "Rückgängig",
    lastPictureText: () => "Das letzte Bild bleibt.",
    motionAutomaticText: () => "Bewegung wieder automatisch",
    automaticTitle: () => "Juli 2025",
  });
  let backs = 0;
  const mounted = mountWithTranslator(PictureEditorRoute, {
    store,
    stored: SHOW,
    editor,
    pictureId,
    saving: false,
    onBack: () => (backs += 1),
    onOpen: () => {},
    onError: (error: unknown) => errors.push(error),
  });
  destroy = mounted.destroy;
  return { target: mounted.target, backs: () => backs };
}

describe("the picture editor route", () => {
  it("shows a picture of the slideshow and stays", async () => {
    const { target, backs } = await mountRoute("b");

    expect(target.querySelector(".pic")).not.toBeNull();
    expect(backs()).toBe(0);
  });

  it("goes back to the slideshow when the picture is no longer in it", async () => {
    const { target, backs } = await mountRoute("gone");

    expect(target.querySelector(".pic")).toBeNull();
    expect(backs()).toBe(1);
  });
});
