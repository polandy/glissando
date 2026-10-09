import { describe, expect, it } from "vitest";
import { SlideshowNotFoundError, type StoredSlideshow } from "../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { SlideshowEditor } from "../editing/slideshow-editor";
import { FakeScheduler } from "../testing/fake-scheduler";
import { Toaster, type ToastMessage } from "../toast/toaster";
import { deleteShownSlideshow, leaveWithToast } from "./slideshow-exits";

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

/** Notes which toast was shown when the deletion started. */
class DeletionWatchingStore extends MemoryLibraryStore {
  readonly #toaster: Toaster;
  toastAtDeletion: ToastMessage | null | undefined = undefined;

  constructor(toaster: Toaster) {
    super();
    this.#toaster = toaster;
  }

  override deleteSlideshow(id: string): Promise<void> {
    this.toastAtDeletion = this.#toaster.current;
    return super.deleteSlideshow(id);
  }
}

function editorOver(store: MemoryLibraryStore, toaster: Toaster): SlideshowEditor {
  return new SlideshowEditor(SHOW, {
    store,
    toaster,
    newId: () => "claim-1",
    now: () => new Date("2026-10-08T12:00:00Z"),
    onError: (error) => {
      throw error;
    },
    onGone: () => {},
    removedText: () => "Bild entfernt",
    undoLabel: () => "Rückgängig",
    lastPictureText: () => "Das letzte Bild bleibt.",
    motionAutomaticText: () => "Bewegung wieder automatisch",
    durationAutomaticText: () => "Dauer wieder automatisch",
    transitionAutomaticText: () => "Übergang wieder automatisch",
    automaticTitle: () => "Juli 2025",
  });
}

describe("deleteShownSlideshow", () => {
  it("closes the editor's undo toast before deleting, so no undo can bring the slideshow back", async () => {
    const toaster = new Toaster(new FakeScheduler());
    const store = new DeletionWatchingStore(toaster);
    await store.saveSlideshow(SHOW);
    const editor = editorOver(store, toaster);
    editor.remove("b");
    expect(toaster.current?.text).toBe("Bild entfernt");

    await deleteShownSlideshow(store, "show", editor);

    expect(store.toastAtDeletion).toBeNull();
    expect(await store.listSlideshows()).toEqual([]);
  });

  it("counts a slideshow deleted meanwhile, e.g. in another tab, as deleted", async () => {
    const store = new MemoryLibraryStore();

    await expect(deleteShownSlideshow(store, "show", null)).resolves.toBeUndefined();
  });

  it("passes on any other failure", async () => {
    const store = new MemoryLibraryStore();
    const failure = new Error("disk gone");
    store.deleteSlideshow = () => Promise.reject(failure);

    await expect(deleteShownSlideshow(store, "show", null)).rejects.toBe(failure);
    expect(failure).not.toBeInstanceOf(SlideshowNotFoundError);
  });
});

describe("leaveWithToast", () => {
  it("goes back to the library first, then says why in a toast", () => {
    const toaster = new Toaster(new FakeScheduler());
    const events: string[] = [];
    toaster.subscribe((toast) => events.push(`toast ${toast?.text ?? "none"}`));

    leaveWithToast({ navigator: { back: () => events.push("back") }, toaster }, "Diashow gelöscht");

    expect(events).toEqual(["back", "toast Diashow gelöscht"]);
    expect(toaster.current?.tone).toBe("info");
  });
});
